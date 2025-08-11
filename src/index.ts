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
import { ChatHandler } from './handlers/ChatHandler.js';
import { MessageHandler } from './handlers/MessageHandler.js';
import { UserHandler } from './handlers/UserHandler.js';

class TelegramMCPServer {
  private server: Server;
  private telegramClient: TelegramClient | null = null;
  private chatHandler: ChatHandler | null = null;
  private messageHandler: MessageHandler | null = null;
  private userHandler: UserHandler | null = null;

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
      
      // Initialize handlers
      this.chatHandler = new ChatHandler(this.telegramClient);
      this.messageHandler = new MessageHandler(this.telegramClient);
      this.userHandler = new UserHandler(this.telegramClient);
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
        await this.getTelegramClient();

        switch (name) {
          case 'list_chats':
            return await this.chatHandler!.listChats(args as any);

          case 'get_chat_info':
            return await this.chatHandler!.getChatInfo(args as any);

          case 'search_chats':
            return await this.chatHandler!.searchChats(args as any);

          case 'get_messages':
            return await this.messageHandler!.getMessages(args as any);

          case 'send_message':
            return await this.messageHandler!.sendMessage(args as any);

          case 'search_messages':
            return await this.messageHandler!.searchMessages(args as any);

          case 'mark_as_read':
            return await this.messageHandler!.markAsRead(args as any);

          case 'get_user_info':
            return await this.userHandler!.getUserInfo(args as any);

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
