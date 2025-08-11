import type { TelegramClient } from '../telegram/client.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface GetMessagesArgs {
  chatId: string;
  limit?: number;
  fromMessageId?: number;
}

export interface SendMessageArgs {
  chatId: string;
  text: string;
  replyToMessageId?: number;
}

export interface SearchMessagesArgs {
  query: string;
  chatId?: string;
  limit?: number;
}

export interface MarkAsReadArgs {
  chatId: string;
  messageIds: number[];
}

export class MessageHandler {
  constructor(private client: TelegramClient) {}

  async getMessages(args: GetMessagesArgs): Promise<CallToolResult> {
    let chatId = args.chatId;
    if (chatId === 'me' || chatId === 'self') {
      const me = await this.client.getMe();
      chatId = me.id.toString();
    }
    
    const messages = await this.client.getMessages(chatId, args.limit || 20, args.fromMessageId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: `**Messages from chat ${args.chatId}:**\n\n` +
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

  async sendMessage(args: SendMessageArgs): Promise<CallToolResult> {
    const sentMessage = await this.client.sendMessage(args.chatId, args.text, args.replyToMessageId);
    
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

  async searchMessages(args: SearchMessagesArgs): Promise<CallToolResult> {
    const searchResult = await this.client.searchMessages(args.query, args.chatId, args.limit || 20);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: `**Search results for "${args.query}":**\n` +
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

  async markAsRead(args: MarkAsReadArgs): Promise<CallToolResult> {
    await this.client.markAsRead(args.chatId, args.messageIds);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ **Messages marked as read**\n\n` +
            `• **Chat ID:** ${args.chatId}\n` +
            `• **Message IDs:** ${args.messageIds.join(', ')}\n` +
            `• **Count:** ${args.messageIds.length} messages`,
        },
      ],
    };
  }
}
