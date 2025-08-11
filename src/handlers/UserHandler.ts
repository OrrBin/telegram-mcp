import type { TelegramClient } from '../telegram/client.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GetUserInfoSchema, type GetUserInfoInput } from '../schemas/index.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

export class UserHandler {
  constructor(private client: TelegramClient) {}

  async getUserInfo(args: unknown): Promise<CallToolResult> {
    return ErrorHandler.withErrorHandling(async () => {
      const validated = GetUserInfoSchema.parse(args);
      const userInfo = await this.client.getUserInfo(validated.userId);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `**User Information:**\n\n` +
              `• **Name:** ${userInfo.firstName}${userInfo.lastName ? ' ' + userInfo.lastName : ''}\n` +
              `• **ID:** ${userInfo.id}\n` +
              (userInfo.username ? `• **Username:** @${userInfo.username}\n` : '') +
              (userInfo.phone ? `• **Phone:** ${userInfo.phone}\n` : '') +
              `• **Is Bot:** ${userInfo.isBot ? 'Yes' : 'No'}\n` +
              (userInfo.isVerified ? `• **Verified:** Yes\n` : '') +
              (userInfo.isScam ? `• **Scam:** Yes\n` : '') +
              (userInfo.isFake ? `• **Fake:** Yes\n` : '') +
              (userInfo.status ? `• **Status:** ${userInfo.status}\n` : ''),
          },
        ],
      };
    });
  }
}
