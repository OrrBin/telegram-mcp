import type { TelegramClient } from '../telegram/client.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface GetUserInfoArgs {
  userId: string;
}

export class UserHandler {
  constructor(private client: TelegramClient) {}

  async getUserInfo(args: GetUserInfoArgs): Promise<CallToolResult> {
    const userInfo = await this.client.getUserInfo(args.userId);
    
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
  }
}
