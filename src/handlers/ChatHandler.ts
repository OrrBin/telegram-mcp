import type { TelegramClient } from '../telegram/client.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { 
  ListChatsSchema, 
  GetChatInfoSchema, 
  SearchChatsSchema,
  type ListChatsInput,
  type GetChatInfoInput,
  type SearchChatsInput
} from '../schemas/index.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

export class ChatHandler {
  constructor(private client: TelegramClient) {}

  async listChats(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = ListChatsSchema.parse(args);
      const limit = validated.limit || 50;
      const chats = await this.client.getChats(limit);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${chats.length} chats:\n\n` +
              chats.map(chat => 
                `• **${chat.title}** (${chat.type})\n` +
                `  ID: ${chat.id}\n` +
                (chat.username ? `  Username: @${chat.username}\n` : '') +
                (chat.memberCount ? `  Members: ${chat.memberCount}\n` : '') +
                (chat.description ? `  Description: ${chat.description.substring(0, 100)}${chat.description.length > 100 ? '...' : ''}\n` : '')
              ).join('\n'),
          },
        ],
      };
    });
  }

  async getChatInfo(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = GetChatInfoSchema.parse(args);
      const chatInfo = await this.client.getChatInfo(validated.chatId);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `**Chat Information:**\n\n` +
              `• **Title:** ${chatInfo.title}\n` +
              `• **ID:** ${chatInfo.id}\n` +
              `• **Type:** ${chatInfo.type}\n` +
              (chatInfo.username ? `• **Username:** @${chatInfo.username}\n` : '') +
              (chatInfo.memberCount ? `• **Members:** ${chatInfo.memberCount}\n` : '') +
              (chatInfo.description ? `• **Description:** ${chatInfo.description}\n` : '') +
              (chatInfo.isVerified ? `• **Verified:** Yes\n` : '') +
              (chatInfo.isScam ? `• **Scam:** Yes\n` : '') +
              (chatInfo.isFake ? `• **Fake:** Yes\n` : ''),
          },
        ],
      };
    });
  }

  async searchChats(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = SearchChatsSchema.parse(args);
      const allChats = await this.client.getChats(200);
      const filteredChats = allChats
        .filter(chat => 
          chat.title.toLowerCase().includes(validated.query.toLowerCase()) ||
          (chat.username && chat.username.toLowerCase().includes(validated.query.toLowerCase()))
        )
        .slice(0, validated.limit || 20);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${filteredChats.length} chats matching "${validated.query}":\n\n` +
              filteredChats.map(chat => 
                `• **${chat.title}** (${chat.type})\n` +
                `  ID: ${chat.id}\n` +
                (chat.username ? `  Username: @${chat.username}\n` : '')
              ).join('\n'),
          },
        ],
      };
    });
  }
}
