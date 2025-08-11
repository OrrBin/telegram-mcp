import type { TelegramClient } from '../telegram/client.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  GetMessagesSchema,
  SendMessageSchema,
  SearchMessagesSchema,
  MarkAsReadSchema,
  type GetMessagesInput,
  type SendMessageInput,
  type SearchMessagesInput,
  type MarkAsReadInput
} from '../schemas/index.js';

export class MessageHandler {
  constructor(private client: TelegramClient) {}

  async getMessages(args: unknown): Promise<CallToolResult> {
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
              (msg.replyToMessageId ? `Reply to: ${msg.replyToMessageId}\n` : '') +
              '---\n'
            ).join('\n'),
        },
      ],
    };
  }

  async sendMessage(args: unknown): Promise<CallToolResult> {
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
  }

  async searchMessages(args: unknown): Promise<CallToolResult> {
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
  }

  async markAsRead(args: unknown): Promise<CallToolResult> {
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
  }
}
