import type { TelegramClient } from '../telegram/client.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  GetMessagesSchema,
  SendMessageSchema,
  SearchMessagesSchema,
  MarkAsReadSchema,
  GetMediaContentSchema,
  SendMediaSchema,
  GetMediaInfoSchema,
  EditMessageSchema,
  DeleteMessageSchema,
  ForwardMessageSchema,
  GetMessageContextSchema,
  SendDocumentSchema,
  DownloadFileSchema,
  GetFileInfoSchema,
  type GetMessagesInput,
  type SendMessageInput,
  type SearchMessagesInput,
  type MarkAsReadInput,
  type GetMediaContentInput,
  type SendMediaInput,
  type GetMediaInfoInput,
  type EditMessageInput,
  type DeleteMessageInput,
  type ForwardMessageInput,
  type GetMessageContextInput,
  type SendDocumentInput,
  type DownloadFileInput,
  type GetFileInfoInput
} from '../schemas/index.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

export class MessageHandler {
  constructor(private client: TelegramClient) {}

  async getMessages(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = GetMessagesSchema.parse(args);
      let chatId = validated.chatId;
      
      if (chatId === 'me' || chatId === 'self') {
        const me = await this.client.getMe();
        chatId = me.id.toString();
      }
      
      const messages = await this.client.getMessages(chatId, validated.limit || 20, validated.fromMessageId);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `**Messages from chat ${validated.chatId}:**\n\n` +
              messages.map(msg => 
                `**Message ${msg.id}** (${new Date(msg.date * 1000).toLocaleString()})\n` +
                `${msg.isOutgoing ? '→' : '←'} ${msg.senderName || msg.senderId || 'Unknown'}\n` +
                `${msg.text || '[Media message]'}\n` +
                (msg.mediaType ? `Media: ${msg.mediaType}\n` : '') +
                (msg.mediaInfo ? `File: ${msg.mediaInfo.fileName} (${msg.mediaInfo.fileSize} bytes)\n` : '') +
                (msg.mediaCaption ? `Caption: ${msg.mediaCaption}\n` : '') +
                (msg.replyToMessageId ? `Reply to: ${msg.replyToMessageId}\n` : '') +
                (msg.isEdited ? `✏️ Edited: ${new Date((msg.editDate || 0) * 1000).toLocaleString()}\n` : '') +
                (msg.forwardedFrom ? `📤 Forwarded from: ${msg.forwardedFrom.senderName || msg.forwardedFrom.fromChatTitle || 'Unknown'}\n` : '') +
                (msg.canBeEdited ? '✏️ Can edit | ' : '') +
                (msg.canBeDeleted ? '🗑️ Can delete' : '') +
                '\n---\n'
              ).join('\n'),
          },
        ],
      };
    });
  }

  async sendMessage(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = SendMessageSchema.parse(args);
      const sentMessage = await this.client.sendMessage(validated.chatId, validated.text, validated.replyToMessageId);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ **Message sent successfully!**\n\n` +
              `• **Chat ID:** ${sentMessage.chatId}\n` +
              `• **Message ID:** ${sentMessage.id}\n` +
              `• **Text:** ${sentMessage.text}\n` +
              `• **Sent at:** ${new Date(sentMessage.date * 1000).toLocaleString()}`,
          },
        ],
      };
    });
  }

  async searchMessages(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = SearchMessagesSchema.parse(args);
      const searchResult = await this.client.searchMessages(validated.query, validated.chatId, validated.limit || 20);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `**Search results for "${validated.query}":**\n` +
              `Found ${searchResult.totalCount} total matches, showing ${searchResult.messages.length}:\n\n` +
              searchResult.messages.map(msg => 
                `**Message ${msg.id}** in chat ${msg.chatId} (${new Date(msg.date * 1000).toLocaleString()})\n` +
                `${msg.isOutgoing ? '→' : '←'} ${msg.senderName || msg.senderId || 'Unknown'}\n` +
                `${msg.text || '[Media message]'}\n` +
                '---\n'
              ).join('\n'),
          },
        ],
      };
    });
  }

  async markAsRead(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = MarkAsReadSchema.parse(args);
      await this.client.markAsRead(validated.chatId, validated.messageIds);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ **Messages marked as read**\n\n` +
              `• **Chat ID:** ${validated.chatId}\n` +
              `• **Message IDs:** ${validated.messageIds.join(', ')}\n` +
              `• **Count:** ${validated.messageIds.length} messages`,
          },
        ],
      };
    });
  }

  async getMediaContent(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = GetMediaContentSchema.parse(args);
      const result = await this.client.getMediaContent(validated.chatId, validated.messageId, validated.downloadPath);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ **Media downloaded successfully!**\n\n` +
              `• **File Path:** ${result.filePath}\n` +
              `• **File Name:** ${result.fileName}\n` +
              `• **File Size:** ${result.fileSize} bytes\n` +
              `• **MIME Type:** ${result.mimeType || 'Unknown'}\n` +
              `• **Message ID:** ${validated.messageId}\n` +
              `• **Chat ID:** ${validated.chatId}`,
          },
        ],
      };
    });
  }

  async sendMedia(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = SendMediaSchema.parse(args);
      const sentMessage = await this.client.sendMedia(validated.chatId, validated.filePath, validated.caption, validated.replyToMessageId);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ **Media sent successfully!**\n\n` +
              `• **Chat ID:** ${sentMessage.chatId}\n` +
              `• **Message ID:** ${sentMessage.id}\n` +
              `• **Media Type:** ${sentMessage.mediaType}\n` +
              `• **File Path:** ${validated.filePath}\n` +
              (validated.caption ? `• **Caption:** ${validated.caption}\n` : '') +
              `• **Sent at:** ${new Date(sentMessage.date * 1000).toLocaleString()}`,
          },
        ],
      };
    });
  }

  async getMediaInfo(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = GetMediaInfoSchema.parse(args);
      const mediaInfo = await this.client.getMediaInfo(validated.chatId, validated.messageId);
      
      if (!mediaInfo) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ **No media found in message ${validated.messageId}**`,
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `📄 **Media Information**\n\n` +
              `• **File ID:** ${mediaInfo.fileId}\n` +
              `• **File Name:** ${mediaInfo.fileName}\n` +
              `• **File Size:** ${mediaInfo.fileSize} bytes\n` +
              `• **MIME Type:** ${mediaInfo.mimeType || 'Unknown'}\n` +
              (mediaInfo.width ? `• **Width:** ${mediaInfo.width}px\n` : '') +
              (mediaInfo.height ? `• **Height:** ${mediaInfo.height}px\n` : '') +
              (mediaInfo.duration ? `• **Duration:** ${mediaInfo.duration}s\n` : '') +
              (mediaInfo.localPath ? `• **Local Path:** ${mediaInfo.localPath}\n` : '') +
              `• **Message ID:** ${validated.messageId}\n` +
              `• **Chat ID:** ${validated.chatId}`,
          },
        ],
      };
    });
  }

  async editMessage(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = EditMessageSchema.parse(args);
      const editedMessage = await this.client.editMessage(validated.chatId, validated.messageId, validated.newText);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ **Message edited successfully!**\n\n` +
              `• **Chat ID:** ${editedMessage.chatId}\n` +
              `• **Message ID:** ${editedMessage.id}\n` +
              `• **New Text:** ${editedMessage.text}\n` +
              `• **Edited at:** ${new Date((editedMessage.editDate || editedMessage.date) * 1000).toLocaleString()}`,
          },
        ],
      };
    });
  }

  async deleteMessage(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = DeleteMessageSchema.parse(args);
      await this.client.deleteMessage(validated.chatId, validated.messageId);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ **Message deleted successfully!**\n\n` +
              `• **Chat ID:** ${validated.chatId}\n` +
              `• **Message ID:** ${validated.messageId}`,
          },
        ],
      };
    });
  }

  async forwardMessage(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = ForwardMessageSchema.parse(args);
      const forwardedMessage = await this.client.forwardMessage(validated.fromChatId, validated.messageId, validated.toChatId);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ **Message forwarded successfully!**\n\n` +
              `• **From Chat ID:** ${validated.fromChatId}\n` +
              `• **To Chat ID:** ${validated.toChatId}\n` +
              `• **Original Message ID:** ${validated.messageId}\n` +
              `• **New Message ID:** ${forwardedMessage.id}\n` +
              `• **Forwarded at:** ${new Date(forwardedMessage.date * 1000).toLocaleString()}`,
          },
        ],
      };
    });
  }

  async getMessageContext(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = GetMessageContextSchema.parse(args);
      const context = await this.client.getMessageContext(
        validated.chatId, 
        validated.messageId, 
        validated.includeReplies, 
        validated.includeThread
      );
      
      let contextText = `📄 **Message Context**\n\n`;
      
      // Main message
      contextText += `**Main Message (${context.message.id})**\n`;
      contextText += `${context.message.isOutgoing ? '→' : '←'} ${context.message.senderName || context.message.senderId || 'Unknown'}\n`;
      contextText += `${context.message.text || '[Media message]'}\n`;
      contextText += `Date: ${new Date(context.message.date * 1000).toLocaleString()}\n`;
      if (context.message.isEdited) {
        contextText += `✏️ Edited: ${new Date((context.message.editDate || 0) * 1000).toLocaleString()}\n`;
      }
      contextText += '\n';
      
      // Reply chain
      if (context.replyChain.length > 0) {
        contextText += `**Reply Chain (${context.replyChain.length} messages):**\n`;
        context.replyChain.forEach((reply, index) => {
          contextText += `${index + 1}. Message ${reply.id}: ${reply.text || '[Media]'}\n`;
          contextText += `   From: ${reply.senderName || reply.senderId || 'Unknown'}\n`;
          contextText += `   Date: ${new Date(reply.date * 1000).toLocaleString()}\n\n`;
        });
      }
      
      // Thread messages
      if (context.thread && context.thread.length > 0) {
        contextText += `**Thread Messages (${context.thread.length} messages):**\n`;
        context.thread.forEach((threadMsg, index) => {
          contextText += `${index + 1}. Message ${threadMsg.id}: ${threadMsg.text || '[Media]'}\n`;
          contextText += `   From: ${threadMsg.senderName || threadMsg.senderId || 'Unknown'}\n`;
          contextText += `   Date: ${new Date(threadMsg.date * 1000).toLocaleString()}\n\n`;
        });
      }
      
      return {
        content: [
          {
            type: 'text' as const,
            text: contextText,
          },
        ],
      };
    });
  }

  async sendDocument(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = SendDocumentSchema.parse(args);
      const sentMessage = await this.client.sendDocument(validated.chatId, validated.filePath, validated.caption, validated.replyToMessageId);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ **Document sent successfully!**\n\n` +
              `• **Chat ID:** ${sentMessage.chatId}\n` +
              `• **Message ID:** ${sentMessage.id}\n` +
              `• **File Path:** ${validated.filePath}\n` +
              (validated.caption ? `• **Caption:** ${validated.caption}\n` : '') +
              `• **Sent at:** ${new Date(sentMessage.date * 1000).toLocaleString()}`,
          },
        ],
      };
    });
  }

  async downloadFile(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = DownloadFileSchema.parse(args);
      const result = await this.client.downloadFile(validated.chatId, validated.messageId, validated.outputPath);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ **File downloaded successfully!**\n\n` +
              `• **File Path:** ${result.filePath}\n` +
              `• **File Name:** ${result.fileName}\n` +
              `• **File Size:** ${result.fileSize} bytes\n` +
              `• **MIME Type:** ${result.mimeType || 'Unknown'}\n` +
              `• **Message ID:** ${validated.messageId}\n` +
              `• **Chat ID:** ${validated.chatId}`,
          },
        ],
      };
    });
  }

  async getFileInfo(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = GetFileInfoSchema.parse(args);
      const fileInfo = await this.client.getFileInfo(validated.chatId, validated.messageId);
      
      if (!fileInfo) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ **No file found in message ${validated.messageId}**`,
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `📁 **File Information**\n\n` +
              `• **File ID:** ${fileInfo.id}\n` +
              `• **Size:** ${fileInfo.size} bytes\n` +
              `• **Expected Size:** ${fileInfo.expectedSize} bytes\n` +
              `• **Can Be Downloaded:** ${fileInfo.canBeDownloaded ? 'Yes' : 'No'}\n` +
              `• **Download Status:** ${fileInfo.isDownloadingCompleted ? 'Completed' : fileInfo.isDownloadingActive ? 'In Progress' : 'Not Started'}\n` +
              `• **Downloaded:** ${fileInfo.downloadedSize} bytes (${Math.round((fileInfo.downloadedSize / fileInfo.size) * 100)}%)\n` +
              (fileInfo.localPath ? `• **Local Path:** ${fileInfo.localPath}\n` : '') +
              (fileInfo.remotePath ? `• **Remote Path:** ${fileInfo.remotePath}\n` : '') +
              `• **Message ID:** ${validated.messageId}\n` +
              `• **Chat ID:** ${validated.chatId}`,
          },
        ],
      };
    });
  }
}
