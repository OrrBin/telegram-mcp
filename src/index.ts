#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { TelegramClient } from './telegram/client.js';
import type { TelegramConfig } from './telegram/types.js';

class TelegramMCPServer {
  private server: Server;
  private telegramClient: TelegramClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'telegram-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private loadConfig(): TelegramConfig {
    const apiId = process.env.TELEGRAM_API_ID;
    const apiHash = process.env.TELEGRAM_API_HASH;
    const phone = process.env.TELEGRAM_PHONE;

    if (!apiId || !apiHash || !phone) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Missing required environment variables: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE'
      );
    }

    return {
      apiId: parseInt(apiId),
      apiHash,
      phone,
      sessionDir: process.env.SESSION_DIR || './session',
    };
  }

  private async getTelegramClient(): Promise<TelegramClient> {
    if (!this.telegramClient) {
      const config = this.loadConfig();
      this.telegramClient = new TelegramClient(config);
      await this.telegramClient.connect();
    }
    return this.telegramClient;
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_chats',
            description: 'List all chats, groups, and channels you have access to',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Number of chats to return (default: 50, max: 200)',
                  minimum: 1,
                  maximum: 200,
                  default: 50,
                },
              },
            },
          },
          {
            name: 'get_chat_info',
            description: 'Get detailed information about a specific chat',
            inputSchema: {
              type: 'object',
              properties: {
                chatId: {
                  type: 'string',
                  description: 'The chat ID to get information for',
                },
              },
              required: ['chatId'],
            },
          },
          {
            name: 'search_chats',
            description: 'Search for chats by title or username',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find chats by title',
                },
                limit: {
                  type: 'number',
                  description: 'Number of results to return (default: 20, max: 100)',
                  minimum: 1,
                  maximum: 100,
                  default: 20,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_messages',
            description: 'Get recent messages from a specific chat. Use "me" as chatId for your own Saved Messages.',
            inputSchema: {
              type: 'object',
              properties: {
                chatId: {
                  type: 'string',
                  description: 'The chat ID to get messages from, or "me" for your Saved Messages',
                },
                limit: {
                  type: 'number',
                  description: 'Number of messages to return (default: 20, max: 100)',
                  minimum: 1,
                  maximum: 100,
                  default: 20,
                },
                fromMessageId: {
                  type: 'number',
                  description: 'Get messages starting from this message ID',
                },
              },
              required: ['chatId'],
            },
          },
          {
            name: 'send_message',
            description: 'Send a text message to a chat',
            inputSchema: {
              type: 'object',
              properties: {
                chatId: {
                  type: 'string',
                  description: 'The chat ID to send the message to',
                },
                text: {
                  type: 'string',
                  description: 'The message text to send',
                },
                replyToMessageId: {
                  type: 'number',
                  description: 'Message ID to reply to',
                },
              },
              required: ['chatId', 'text'],
            },
          },
          {
            name: 'search_messages',
            description: 'Search for messages across all chats or within a specific chat',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find messages',
                },
                chatId: {
                  type: 'string',
                  description: 'Limit search to specific chat (optional)',
                },
                limit: {
                  type: 'number',
                  description: 'Number of results to return (default: 20, max: 100)',
                  minimum: 1,
                  maximum: 100,
                  default: 20,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'mark_as_read',
            description: 'Mark specific messages as read in a chat',
            inputSchema: {
              type: 'object',
              properties: {
                chatId: {
                  type: 'string',
                  description: 'The chat ID to mark messages as read',
                },
                messageIds: {
                  type: 'array',
                  items: {
                    type: 'number',
                  },
                  description: 'Array of message IDs to mark as read',
                },
              },
              required: ['chatId', 'messageIds'],
            },
          },
          {
            name: 'get_user_info',
            description: 'Get information about a specific user',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'The user ID to get information for',
                },
              },
              required: ['userId'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const client = await this.getTelegramClient();

        switch (name) {
          case 'list_chats':
            return await this.listChats(client, args);

          case 'get_chat_info':
            return await this.getChatInfo(client, args);

          case 'search_chats':
            return await this.searchChats(client, args);

          case 'get_messages':
            return await this.getMessages(client, args);

          case 'send_message':
            return await this.sendMessage(client, args);

          case 'search_messages':
            return await this.searchMessages(client, args);

          case 'mark_as_read':
            return await this.markAsRead(client, args);

          case 'get_user_info':
            return await this.getUserInfo(client, args);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  // Tool implementations
  private async listChats(client: TelegramClient, args: any) {
    const limit = args.limit || 50;
    const chats = await client.getChats(limit);
    
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
  }

  private async getChatInfo(client: TelegramClient, args: any) {
    const chatInfo = await client.getChatInfo(args.chatId);
    
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
  }

  private async searchChats(client: TelegramClient, args: any) {
    const allChats = await client.getChats(200);
    const filteredChats = allChats
      .filter(chat => 
        chat.title.toLowerCase().includes(args.query.toLowerCase()) ||
        (chat.username && chat.username.toLowerCase().includes(args.query.toLowerCase()))
      )
      .slice(0, args.limit || 20);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${filteredChats.length} chats matching "${args.query}":\n\n` +
            filteredChats.map(chat => 
              `• **${chat.title}** (${chat.type})\n` +
              `  ID: ${chat.id}\n` +
              (chat.username ? `  Username: @${chat.username}\n` : '')
            ).join('\n'),
        },
      ],
    };
  }

  private async getMessages(client: TelegramClient, args: any) {
    // Handle special case for user's own messages (Saved Messages)
    let chatId = args.chatId;
    if (chatId === 'me' || chatId === 'self') {
      // Get user's own ID for Saved Messages
      const me = await client.getMe();
      chatId = me.id.toString();
    }
    
    const messages = await client.getMessages(chatId, args.limit || 20, args.fromMessageId);
    
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

  private async sendMessage(client: TelegramClient, args: any) {
    const sentMessage = await client.sendMessage(args.chatId, args.text, args.replyToMessageId);
    
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

  private async searchMessages(client: TelegramClient, args: any) {
    const searchResult = await client.searchMessages(args.query, args.chatId, args.limit || 20);
    
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

  private async markAsRead(client: TelegramClient, args: any) {
    await client.markAsRead(args.chatId, args.messageIds);
    
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

  private async getUserInfo(client: TelegramClient, args: any) {
    const userInfo = await client.getUserInfo(args.userId);
    
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

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup() {
    console.error('Shutting down Telegram MCP Server...');
    try {
      if (this.telegramClient) {
        await this.telegramClient.disconnect();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Telegram MCP Server running on stdio');
  }
}

// Start the server
const server = new TelegramMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
