import { createClient, configure } from 'tdl';
import { getTdjson } from 'prebuilt-tdlib';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, access, constants } from 'fs/promises';
import { dirname, join, extname } from 'path';
import readline from 'readline';
import type { TelegramConfig, ChatInfo, MessageInfo, UserInfo, SearchResult, MediaInfo, MediaDownloadResult, ForwardInfo, MessageContext, FileInfo, DocumentInfo } from './types.js';
import { Config } from '../config/index.js';
import { Logger } from '../utils/Logger.js';

export class TelegramClient {
  private client: ReturnType<typeof createClient>;
  private config: TelegramConfig;
  private isConnected = false;

  constructor(config: TelegramConfig) {
    this.config = config;
    const appConfig = Config.getInstance();
    
    // Configure tdl to use prebuilt TDLib
    configure({
      tdjson: getTdjson(),
      verbosityLevel: appConfig.isDevelopment() ? 3 : 1,
    });
    
    // Ensure session directory exists
    mkdir(config.sessionDir, { recursive: true }).catch(() => {});

    this.client = createClient({
      apiId: config.apiId,
      apiHash: config.apiHash,
      databaseDirectory: config.sessionDir,
      filesDirectory: `${config.sessionDir}/files`,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    const appConfig = Config.getInstance();
    
    this.client.on('error', (error: any) => {
      Logger.error('Telegram client error', error);
    });

    this.client.on('update', (update: any) => {
      // Handle real-time updates if needed
      if (appConfig.isDevelopment()) {
        Logger.debug('Telegram update received', { updateType: update._ });
      }
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      Logger.info('Connecting to Telegram...');
      await this.client.login(() => ({
        type: 'user' as const,
        getPhoneNumber: () => Promise.resolve(this.config.phone),
        getAuthCode: () => this.promptForCode(),
        getPassword: () => this.promptForPassword(),
        getName: () => Promise.resolve({ firstName: 'MCP', lastName: 'User' }),
      }));

      this.isConnected = true;
      Logger.info('Successfully connected to Telegram');
    } catch (error) {
      Logger.error('Failed to connect to Telegram', error as Error);
      throw new Error(`Telegram connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async promptForCode(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr, // Use stderr to avoid interfering with MCP stdio
    });

    return new Promise((resolve) => {
      rl.question('Enter the verification code sent to your phone: ', (code) => {
        rl.close();
        resolve(code.trim());
      });
    });
  }

  private async promptForPassword(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr, // Use stderr to avoid interfering with MCP stdio
    });

    return new Promise((resolve) => {
      rl.question('Enter your 2FA password: ', (password) => {
        rl.close();
        resolve(password.trim());
      });
    });
  }

  async getChats(limit = 100): Promise<ChatInfo[]> {
    await this.ensureConnected();

    try {
      const chats = await this.client.invoke({
        _: 'getChats',
        offset_order: '9223372036854775807',
        offset_chat_id: 0,
        limit,
      });

      const chatInfos: ChatInfo[] = [];

      for (const chatId of chats.chat_ids) {
        try {
          const chat = await this.client.invoke({
            _: 'getChat',
            chat_id: chatId,
          });

          chatInfos.push(this.formatChatInfo(chat));
        } catch (error) {
          console.warn(`Failed to get info for chat ${chatId}:`, error);
        }
      }

      return chatInfos;
    } catch (error) {
      console.error('Failed to get chats:', error);
      throw error;
    }
  }

  async getMe(): Promise<{ id: number; firstName: string; lastName?: string; username?: string }> {
    await this.ensureConnected();

    try {
      const me = await this.client.invoke({
        _: 'getMe',
      });

      return {
        id: me.id,
        firstName: me.first_name,
        lastName: me.last_name,
        username: me.username,
      };
    } catch (error) {
      console.error('Failed to get user info:', error);
      throw error;
    }
  }

  async getChatInfo(chatId: string): Promise<ChatInfo> {
    await this.ensureConnected();

    try {
      const chat = await this.client.invoke({
        _: 'getChat',
        chat_id: parseInt(chatId),
      });

      return this.formatChatInfo(chat);
    } catch (error) {
      console.error(`Failed to get chat info for ${chatId}:`, error);
      throw error;
    }
  }

  async getMessages(chatId: string, limit = 50, fromMessageId?: number): Promise<MessageInfo[]> {
    await this.ensureConnected();

    try {
      const messages = await this.client.invoke({
        _: 'getChatHistory',
        chat_id: parseInt(chatId),
        from_message_id: fromMessageId || 0,
        offset: 0,
        limit,
        only_local: false,
      });

      return messages.messages.map((msg: any) => this.formatMessageInfo(msg, chatId));
    } catch (error) {
      console.error(`Failed to get messages for chat ${chatId}:`, error);
      throw error;
    }
  }

  async sendMessage(chatId: string, text: string, replyToMessageId?: number): Promise<MessageInfo> {
    await this.ensureConnected();

    try {
      const message = await this.client.invoke({
        _: 'sendMessage',
        chat_id: parseInt(chatId),
        reply_to_message_id: replyToMessageId || 0,
        input_message_content: {
          _: 'inputMessageText',
          text: {
            _: 'formattedText',
            text,
            entities: [],
          },
        },
      });

      return this.formatMessageInfo(message, chatId);
    } catch (error) {
      console.error(`Failed to send message to chat ${chatId}:`, error);
      throw error;
    }
  }

  async searchMessages(query: string, chatId?: string, limit = 50): Promise<SearchResult> {
    await this.ensureConnected();

    try {
      if (chatId) {
        // Search within a specific chat
        const result = await this.client.invoke({
          _: 'searchChatMessages',
          chat_id: parseInt(chatId),
          query,
          sender_id: null,
          from_message_id: 0,
          offset: 0,
          limit,
          filter: { _: 'searchMessagesFilterEmpty' },
        });

        return {
          messages: result.messages.map((msg: any) => this.formatMessageInfo(msg, chatId)),
          totalCount: result.total_count || result.messages.length,
        };
      } else {
        // For global search, let's try a simpler approach - search in recent chats
        const chats = await this.getChats(20); // Get recent chats
        const allMessages: MessageInfo[] = [];
        let totalFound = 0;

        for (const chat of chats.slice(0, 10)) { // Search in first 10 chats to avoid timeout
          try {
            const chatResult = await this.client.invoke({
              _: 'searchChatMessages',
              chat_id: parseInt(chat.id),
              query,
              sender_id: null,
              from_message_id: 0,
              offset: 0,
              limit: Math.min(limit, 10), // Limit per chat
              filter: { _: 'searchMessagesFilterEmpty' },
            });

            const chatMessages = chatResult.messages.map((msg: any) => this.formatMessageInfo(msg, chat.id));
            allMessages.push(...chatMessages);
            totalFound += chatResult.total_count || chatMessages.length;

            if (allMessages.length >= limit) break;
          } catch (chatError) {
            // Skip chats that can't be searched
            console.error(`Failed to search in chat ${chat.id}:`, chatError);
            continue;
          }
        }

        return {
          messages: allMessages.slice(0, limit),
          totalCount: totalFound,
        };
      }
    } catch (error) {
      console.error('Failed to search messages:', error);
      throw error;
    }
  }

  async getUserInfo(userId: string): Promise<UserInfo> {
    await this.ensureConnected();

    try {
      const user = await this.client.invoke({
        _: 'getUser',
        user_id: parseInt(userId),
      });

      return this.formatUserInfo(user);
    } catch (error) {
      console.error(`Failed to get user info for ${userId}:`, error);
      throw error;
    }
  }

  async markAsRead(chatId: string, messageIds: number[]): Promise<void> {
    await this.ensureConnected();

    try {
      await this.client.invoke({
        _: 'viewMessages',
        chat_id: parseInt(chatId),
        message_ids: messageIds,
        force_read: true,
      });
    } catch (error) {
      console.error(`Failed to mark messages as read in chat ${chatId}:`, error);
      throw error;
    }
  }

  async getMediaContent(chatId: string, messageId: number, downloadPath?: string): Promise<MediaDownloadResult> {
    await this.ensureConnected();

    try {
      // Get the message first to extract media info
      const message = await this.client.invoke({
        _: 'getMessage',
        chat_id: parseInt(chatId),
        message_id: messageId,
      });

      if (!this.hasMedia(message)) {
        throw new Error('Message does not contain media');
      }

      const file = this.extractFileFromMessage(message);
      if (!file) {
        throw new Error('Could not extract file information from message');
      }

      // Download the file
      const downloadedFile = await this.client.invoke({
        _: 'downloadFile',
        file_id: file.id,
        priority: 1,
        offset: 0,
        limit: 0,
        synchronous: true,
      });

      const fileName = this.getFileName(message, file);
      const finalPath = downloadPath ? join(downloadPath, fileName) : downloadedFile.local.path;

      // If custom download path is specified, copy the file
      if (downloadPath && downloadedFile.local.path !== finalPath) {
        await mkdir(dirname(finalPath), { recursive: true });
        const readStream = createReadStream(downloadedFile.local.path);
        const writeStream = createWriteStream(finalPath);
        await new Promise<void>((resolve, reject) => {
          readStream.pipe(writeStream);
          writeStream.on('finish', () => resolve());
          writeStream.on('error', reject);
        });
      }

      return {
        filePath: finalPath,
        fileName,
        fileSize: file.size,
        mimeType: this.getMimeType(message),
      };
    } catch (error) {
      console.error(`Failed to get media content for message ${messageId}:`, error);
      throw error;
    }
  }

  async sendMedia(chatId: string, filePath: string, caption?: string, replyToMessageId?: number): Promise<MessageInfo> {
    await this.ensureConnected();

    try {
      // Check if file exists
      await access(filePath, constants.F_OK);

      // Upload the file first
      const uploadedFile = await this.client.invoke({
        _: 'uploadFile',
        file: {
          _: 'inputFileLocal',
          path: filePath,
        },
        file_type: {
          _: 'fileTypeDocument',
        },
        priority: 1,
      });

      // Determine the media type based on file extension
      const ext = extname(filePath).toLowerCase();
      let inputMessageContent;

      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        inputMessageContent = {
          _: 'inputMessagePhoto',
          photo: {
            _: 'inputFileId',
            id: uploadedFile.id,
          },
          caption: caption ? {
            _: 'formattedText',
            text: caption,
            entities: [],
          } : undefined,
        };
      } else if (['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext)) {
        inputMessageContent = {
          _: 'inputMessageVideo',
          video: {
            _: 'inputFileId',
            id: uploadedFile.id,
          },
          caption: caption ? {
            _: 'formattedText',
            text: caption,
            entities: [],
          } : undefined,
        };
      } else {
        inputMessageContent = {
          _: 'inputMessageDocument',
          document: {
            _: 'inputFileId',
            id: uploadedFile.id,
          },
          caption: caption ? {
            _: 'formattedText',
            text: caption,
            entities: [],
          } : undefined,
        };
      }

      const message = await this.client.invoke({
        _: 'sendMessage',
        chat_id: parseInt(chatId),
        reply_to_message_id: replyToMessageId || 0,
        input_message_content: inputMessageContent,
      });

      return this.formatMessageInfo(message, chatId);
    } catch (error) {
      console.error(`Failed to send media to chat ${chatId}:`, error);
      throw error;
    }
  }

  async getMediaInfo(chatId: string, messageId: number): Promise<MediaInfo | null> {
    await this.ensureConnected();

    try {
      const message = await this.client.invoke({
        _: 'getMessage',
        chat_id: parseInt(chatId),
        message_id: messageId,
      });

      if (!this.hasMedia(message)) {
        return null;
      }

      const file = this.extractFileFromMessage(message);
      if (!file) {
        return null;
      }

      return {
        fileId: file.id.toString(),
        fileName: this.getFileName(message, file),
        fileSize: file.size,
        mimeType: this.getMimeType(message),
        width: this.getMediaDimension(message, 'width'),
        height: this.getMediaDimension(message, 'height'),
        duration: this.getMediaDuration(message),
        localPath: file.local?.path,
      };
    } catch (error) {
      console.error(`Failed to get media info for message ${messageId}:`, error);
      throw error;
    }
  }

  private hasMedia(message: any): boolean {
    return !!(message.content?.photo || message.content?.video || message.content?.document || 
              message.content?.audio || message.content?.voice_note || message.content?.sticker ||
              message.content?.animation);
  }

  private extractFileFromMessage(message: any): any {
    const content = message.content;
    if (content.photo) return content.photo.sizes[content.photo.sizes.length - 1].photo;
    if (content.video) return content.video.video;
    if (content.document) return content.document.document;
    if (content.audio) return content.audio.audio;
    if (content.voice_note) return content.voice_note.voice;
    if (content.sticker) return content.sticker.sticker;
    if (content.animation) return content.animation.animation;
    return null;
  }

  private getFileName(message: any, file: any): string {
    const content = message.content;
    if (content.document?.file_name) return content.document.file_name;
    if (content.audio?.file_name) return content.audio.file_name;
    
    // Generate filename based on type
    const messageId = message.id;
    if (content.photo) return `photo_${messageId}.jpg`;
    if (content.video) return `video_${messageId}.mp4`;
    if (content.voice_note) return `voice_${messageId}.ogg`;
    if (content.sticker) return `sticker_${messageId}.webp`;
    if (content.animation) return `animation_${messageId}.gif`;
    
    return `file_${messageId}`;
  }

  private getMimeType(message: any): string | undefined {
    const content = message.content;
    if (content.document?.mime_type) return content.document.mime_type;
    if (content.audio?.mime_type) return content.audio.mime_type;
    if (content.video?.mime_type) return content.video.mime_type;
    if (content.photo) return 'image/jpeg';
    if (content.voice_note) return 'audio/ogg';
    if (content.sticker) return 'image/webp';
    if (content.animation) return 'image/gif';
    return undefined;
  }

  private getMediaDimension(message: any, dimension: 'width' | 'height'): number | undefined {
    const content = message.content;
    if (content.photo) return content.photo[dimension];
    if (content.video) return content.video[dimension];
    if (content.sticker) return content.sticker[dimension];
    if (content.animation) return content.animation[dimension];
    return undefined;
  }

  private getMediaDuration(message: any): number | undefined {
    const content = message.content;
    if (content.video) return content.video.duration;
    if (content.audio) return content.audio.duration;
    if (content.voice_note) return content.voice_note.duration;
    if (content.animation) return content.animation.duration;
    return undefined;
  }

  async editMessage(chatId: string, messageId: number, newText: string): Promise<MessageInfo> {
    await this.ensureConnected();

    try {
      const editedMessage = await this.client.invoke({
        _: 'editMessageText',
        chat_id: parseInt(chatId),
        message_id: messageId,
        input_message_content: {
          _: 'inputMessageText',
          text: {
            _: 'formattedText',
            text: newText,
            entities: [],
          },
        },
      });

      return this.formatMessageInfo(editedMessage, chatId);
    } catch (error) {
      console.error(`Failed to edit message ${messageId}:`, error);
      throw error;
    }
  }

  async deleteMessage(chatId: string, messageId: number): Promise<void> {
    await this.ensureConnected();

    try {
      await this.client.invoke({
        _: 'deleteMessages',
        chat_id: parseInt(chatId),
        message_ids: [messageId],
        revoke: true,
      });
    } catch (error) {
      console.error(`Failed to delete message ${messageId}:`, error);
      throw error;
    }
  }

  async forwardMessage(fromChatId: string, messageId: number, toChatId: string): Promise<MessageInfo> {
    await this.ensureConnected();

    try {
      const forwardedMessage = await this.client.invoke({
        _: 'forwardMessages',
        chat_id: parseInt(toChatId),
        from_chat_id: parseInt(fromChatId),
        message_ids: [messageId],
        send_copy: false,
        remove_caption: false,
      });

      // The API returns an array, get the first message
      const messageData = forwardedMessage.messages?.[0] || forwardedMessage;
      return this.formatMessageInfo(messageData, toChatId);
    } catch (error) {
      console.error(`Failed to forward message ${messageId}:`, error);
      throw error;
    }
  }

  async getMessageContext(chatId: string, messageId: number, includeReplies = true, includeThread = false): Promise<MessageContext> {
    await this.ensureConnected();

    try {
      // Get the main message
      const message = await this.client.invoke({
        _: 'getMessage',
        chat_id: parseInt(chatId),
        message_id: messageId,
      });

      const formattedMessage = this.formatMessageInfo(message, chatId);
      const context: MessageContext = {
        message: formattedMessage,
        replyChain: [],
      };

      // Build reply chain if requested
      if (includeReplies && message.reply_to_message_id) {
        context.replyChain = await this.buildReplyChain(chatId, message.reply_to_message_id);
      }

      // Get thread messages if requested (for topics/threads)
      if (includeThread && message.message_thread_id) {
        context.thread = await this.getThreadMessages(chatId, message.message_thread_id);
      }

      return context;
    } catch (error) {
      console.error(`Failed to get message context for ${messageId}:`, error);
      throw error;
    }
  }

  private async buildReplyChain(chatId: string, replyToMessageId: number, depth = 0): Promise<MessageInfo[]> {
    if (depth > 10) return []; // Prevent infinite loops

    try {
      const replyMessage = await this.client.invoke({
        _: 'getMessage',
        chat_id: parseInt(chatId),
        message_id: replyToMessageId,
      });

      const formattedReply = this.formatMessageInfo(replyMessage, chatId);
      const chain = [formattedReply];

      // Continue building chain if this message is also a reply
      if (replyMessage.reply_to_message_id) {
        const parentChain = await this.buildReplyChain(chatId, replyMessage.reply_to_message_id, depth + 1);
        chain.push(...parentChain);
      }

      return chain;
    } catch (error) {
      console.error(`Failed to get reply message ${replyToMessageId}:`, error);
      return [];
    }
  }

  private async getThreadMessages(chatId: string, messageThreadId: number): Promise<MessageInfo[]> {
    try {
      const threadMessages = await this.client.invoke({
        _: 'getMessageThread',
        chat_id: parseInt(chatId),
        message_id: messageThreadId,
      });

      return threadMessages.messages?.map((msg: any) => this.formatMessageInfo(msg, chatId)) || [];
    } catch (error) {
      console.error(`Failed to get thread messages for ${messageThreadId}:`, error);
      return [];
    }
  }

  async sendDocument(chatId: string, filePath: string, caption?: string, replyToMessageId?: number): Promise<MessageInfo> {
    await this.ensureConnected();

    try {
      // Check if file exists
      await access(filePath, constants.F_OK);

      // Upload the file first
      const uploadedFile = await this.client.invoke({
        _: 'uploadFile',
        file: {
          _: 'inputFileLocal',
          path: filePath,
        },
        file_type: {
          _: 'fileTypeDocument',
        },
        priority: 1,
      });

      const message = await this.client.invoke({
        _: 'sendMessage',
        chat_id: parseInt(chatId),
        reply_to_message_id: replyToMessageId || 0,
        input_message_content: {
          _: 'inputMessageDocument',
          document: {
            _: 'inputFileId',
            id: uploadedFile.id,
          },
          caption: caption ? {
            _: 'formattedText',
            text: caption,
            entities: [],
          } : undefined,
        },
      });

      return this.formatMessageInfo(message, chatId);
    } catch (error) {
      console.error(`Failed to send document to chat ${chatId}:`, error);
      throw error;
    }
  }

  async downloadFile(chatId: string, messageId: number, outputPath?: string): Promise<MediaDownloadResult> {
    await this.ensureConnected();

    try {
      // Get the message first to extract file info
      const message = await this.client.invoke({
        _: 'getMessage',
        chat_id: parseInt(chatId),
        message_id: messageId,
      });

      if (!this.hasMedia(message)) {
        throw new Error('Message does not contain a file');
      }

      const file = this.extractFileFromMessage(message);
      if (!file) {
        throw new Error('Could not extract file information from message');
      }

      // Download the file
      const downloadedFile = await this.client.invoke({
        _: 'downloadFile',
        file_id: file.id,
        priority: 1,
        offset: 0,
        limit: 0,
        synchronous: true,
      });

      const fileName = this.getFileName(message, file);
      const finalPath = outputPath ? join(outputPath, fileName) : downloadedFile.local.path;

      // If custom output path is specified, copy the file
      if (outputPath && downloadedFile.local.path !== finalPath) {
        await mkdir(dirname(finalPath), { recursive: true });
        const readStream = createReadStream(downloadedFile.local.path);
        const writeStream = createWriteStream(finalPath);
        await new Promise<void>((resolve, reject) => {
          readStream.pipe(writeStream);
          writeStream.on('finish', () => resolve());
          writeStream.on('error', reject);
        });
      }

      return {
        filePath: finalPath,
        fileName,
        fileSize: file.size,
        mimeType: this.getMimeType(message),
      };
    } catch (error) {
      console.error(`Failed to download file from message ${messageId}:`, error);
      throw error;
    }
  }

  async getFileInfo(chatId: string, messageId: number): Promise<FileInfo | null> {
    await this.ensureConnected();

    try {
      const message = await this.client.invoke({
        _: 'getMessage',
        chat_id: parseInt(chatId),
        message_id: messageId,
      });

      if (!this.hasMedia(message)) {
        return null;
      }

      const file = this.extractFileFromMessage(message);
      if (!file) {
        return null;
      }

      return {
        id: file.id.toString(),
        size: file.size,
        expectedSize: file.expected_size || file.size,
        localPath: file.local?.path,
        remotePath: file.remote?.id,
        canBeDownloaded: file.local?.can_be_downloaded || false,
        isDownloadingActive: file.local?.is_downloading_active || false,
        isDownloadingCompleted: file.local?.is_downloading_completed || false,
        downloadedPrefixSize: file.local?.downloaded_prefix_size || 0,
        downloadedSize: file.local?.downloaded_size || 0,
      };
    } catch (error) {
      console.error(`Failed to get file info for message ${messageId}:`, error);
      throw error;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  private formatChatInfo(chat: any): ChatInfo {
    const info: ChatInfo = {
      id: chat.id.toString(),
      title: chat.title || 'Unknown',
      type: this.getChatType(chat.type),
    };

    if (chat.type?._ === 'chatTypePrivate' || chat.type?._ === 'chatTypeSecret') {
      // For private chats, get user info to set title
      info.title = `${chat.title || 'Private Chat'}`;
    }

    if (chat.type?.username) {
      info.username = chat.type.username;
    }

    if (chat.member_count) {
      info.memberCount = chat.member_count;
    }

    if (chat.description) {
      info.description = chat.description;
    }

    return info;
  }

  private formatMessageInfo(message: any, chatId: string): MessageInfo {
    const info: MessageInfo = {
      id: message.id,
      chatId,
      date: message.date,
      isOutgoing: message.is_outgoing || false,
      isEdited: !!message.edit_date,
      editDate: message.edit_date,
      canBeEdited: message.can_be_edited || false,
      canBeDeleted: message.can_be_deleted_only_for_self || message.can_be_deleted_for_all_users || false,
    };

    if (message.sender_id) {
      info.senderId = message.sender_id.user_id?.toString() || message.sender_id.chat_id?.toString();
    }

    if (message.content?.text?.text) {
      info.text = message.content.text.text;
    }

    if (message.reply_to_message_id) {
      info.replyToMessageId = message.reply_to_message_id;
    }

    // Handle different media types with enhanced info
    if (message.content?.photo) {
      info.mediaType = 'photo';
      info.mediaCaption = message.content.caption?.text;
      info.mediaInfo = this.extractMediaInfo(message);
    } else if (message.content?.video) {
      info.mediaType = 'video';
      info.mediaCaption = message.content.caption?.text;
      info.mediaInfo = this.extractMediaInfo(message);
    } else if (message.content?.document) {
      info.mediaType = 'document';
      info.mediaCaption = message.content.caption?.text;
      info.mediaInfo = this.extractMediaInfo(message);
    } else if (message.content?.audio) {
      info.mediaType = 'audio';
      info.mediaCaption = message.content.caption?.text;
      info.mediaInfo = this.extractMediaInfo(message);
    } else if (message.content?.voice_note) {
      info.mediaType = 'voice';
      info.mediaInfo = this.extractMediaInfo(message);
    } else if (message.content?.sticker) {
      info.mediaType = 'sticker';
      info.mediaInfo = this.extractMediaInfo(message);
    } else if (message.content?.animation) {
      info.mediaType = 'animation';
      info.mediaCaption = message.content.caption?.text;
      info.mediaInfo = this.extractMediaInfo(message);
    }

    // Enhanced forward information
    if (message.forward_info) {
      info.forwardedFrom = this.extractForwardInfo(message.forward_info);
    }

    return info;
  }

  private extractForwardInfo(forwardInfo: any): ForwardInfo {
    const info: ForwardInfo = {
      date: forwardInfo.date,
    };

    if (forwardInfo.origin) {
      switch (forwardInfo.origin._) {
        case 'messageForwardOriginUser':
          info.senderName = 'User'; // We'd need to fetch user info for the actual name
          break;
        case 'messageForwardOriginChat':
          info.fromChatId = forwardInfo.origin.chat_id?.toString();
          info.fromChatTitle = forwardInfo.origin.author_signature;
          break;
        case 'messageForwardOriginChannel':
          info.fromChatId = forwardInfo.origin.chat_id?.toString();
          info.fromMessageId = forwardInfo.origin.message_id;
          info.isChannelPost = true;
          break;
        case 'messageForwardOriginHiddenUser':
          info.senderName = forwardInfo.origin.sender_name;
          break;
      }
    }

    return info;
  }

  private extractMediaInfo(message: any): MediaInfo | undefined {
    const file = this.extractFileFromMessage(message);
    if (!file) return undefined;

    return {
      fileId: file.id.toString(),
      fileName: this.getFileName(message, file),
      fileSize: file.size,
      mimeType: this.getMimeType(message),
      width: this.getMediaDimension(message, 'width'),
      height: this.getMediaDimension(message, 'height'),
      duration: this.getMediaDuration(message),
      localPath: file.local?.path,
    };
  }

  private formatUserInfo(user: any): UserInfo {
    return {
      id: user.id.toString(),
      firstName: user.first_name || '',
      lastName: user.last_name,
      username: user.username,
      phone: user.phone_number,
      isBot: user.type?._ === 'userTypeBot',
      isVerified: user.is_verified,
      isScam: user.is_scam,
      isFake: user.is_fake,
      status: user.status?._,
    };
  }

  private getChatType(type: any): ChatInfo['type'] {
    switch (type?._) {
      case 'chatTypePrivate':
        return 'private';
      case 'chatTypeBasicGroup':
        return 'group';
      case 'chatTypeSupergroup':
        return type.is_channel ? 'channel' : 'supergroup';
      case 'chatTypeSecret':
        return 'secret';
      default:
        return 'private';
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
    }
  }
}
