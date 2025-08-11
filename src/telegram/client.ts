import { createClient, configure } from 'tdl';
import { getTdjson } from 'prebuilt-tdlib';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import readline from 'readline';
import type { TelegramConfig, ChatInfo, MessageInfo, UserInfo, SearchResult } from './types.js';
import { Config } from '../config/index.js';

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
      console.error('Telegram client error:', error);
    });

    this.client.on('update', (update: any) => {
      // Handle real-time updates if needed
      if (appConfig.isDevelopment()) {
        console.error('Update received:', update._);
      }
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      console.error('Connecting to Telegram...');
      await this.client.login(() => ({
        type: 'user' as const,
        getPhoneNumber: () => Promise.resolve(this.config.phone),
        getAuthCode: () => this.promptForCode(),
        getPassword: () => this.promptForPassword(),
        getName: () => Promise.resolve({ firstName: 'MCP', lastName: 'User' }),
      }));

      this.isConnected = true;
      console.error('Successfully connected to Telegram');
    } catch (error) {
      console.error('Failed to connect to Telegram:', error);
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

    // Handle different media types
    if (message.content?.photo) {
      info.mediaType = 'photo';
      info.mediaCaption = message.content.caption?.text;
    } else if (message.content?.video) {
      info.mediaType = 'video';
      info.mediaCaption = message.content.caption?.text;
    } else if (message.content?.document) {
      info.mediaType = 'document';
      info.mediaCaption = message.content.caption?.text;
    }

    if (message.forward_info) {
      info.forwardedFrom = 'Forwarded message';
    }

    return info;
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
