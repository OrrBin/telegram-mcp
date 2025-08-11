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
  type GetMessagesInput,
  type SendMessageInput,
  type SearchMessagesInput,
  type MarkAsReadInput,
  type GetMediaContentInput,
  type SendMediaInput,
  type GetMediaInfoInput
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
                '---\n'
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
}
