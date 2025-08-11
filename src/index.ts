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
import { ChatHandler } from './handlers/ChatHandler.js';
import { MessageHandler } from './handlers/MessageHandler.js';
import { UserHandler } from './handlers/UserHandler.js';
import { Config } from './config/index.js';
import { Logger } from './utils/Logger.js';

class TelegramMCPServer {
  private server: Server;
  private telegramClient: TelegramClient | null = null;
  private chatHandler: ChatHandler | null = null;
  private messageHandler: MessageHandler | null = null;
  private userHandler: UserHandler | null = null;
  private config: Config;

  constructor() {
    this.config = Config.getInstance();
    
    this.server = new Server(
      {
        name: this.config.server.name,
        version: this.config.server.version,
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

  private async getTelegramClient(): Promise<TelegramClient> {
    if (!this.telegramClient) {
      this.telegramClient = new TelegramClient(this.config.telegram);
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
          {
            name: 'get_media_content',
            description: 'Download media content from a message',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'number',
                  description: 'The message ID containing the media',
                },
                chatId: {
                  type: 'string',
                  description: 'The chat ID containing the message',
                },
                downloadPath: {
                  type: 'string',
                  description: 'Optional custom download path',
                },
              },
              required: ['messageId', 'chatId'],
            },
          },
          {
            name: 'send_media',
            description: 'Send media file to a chat',
            inputSchema: {
              type: 'object',
              properties: {
                chatId: {
                  type: 'string',
                  description: 'The chat ID to send media to',
                },
                filePath: {
                  type: 'string',
                  description: 'Path to the media file to send',
                },
                caption: {
                  type: 'string',
                  description: 'Optional caption for the media',
                },
                replyToMessageId: {
                  type: 'number',
                  description: 'Optional message ID to reply to',
                },
              },
              required: ['chatId', 'filePath'],
            },
          },
          {
            name: 'get_media_info',
            description: 'Get information about media in a message',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'number',
                  description: 'The message ID containing the media',
                },
                chatId: {
                  type: 'string',
                  description: 'The chat ID containing the message',
                },
              },
              required: ['messageId', 'chatId'],
            },
          },
          {
            name: 'edit_message',
            description: 'Edit an existing message',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'number',
                  description: 'The message ID to edit',
                },
                chatId: {
                  type: 'string',
                  description: 'The chat ID containing the message',
                },
                newText: {
                  type: 'string',
                  description: 'The new text for the message',
                },
              },
              required: ['messageId', 'chatId', 'newText'],
            },
          },
          {
            name: 'delete_message',
            description: 'Delete a message',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'number',
                  description: 'The message ID to delete',
                },
                chatId: {
                  type: 'string',
                  description: 'The chat ID containing the message',
                },
              },
              required: ['messageId', 'chatId'],
            },
          },
          {
            name: 'forward_message',
            description: 'Forward a message to another chat',
            inputSchema: {
              type: 'object',
              properties: {
                fromChatId: {
                  type: 'string',
                  description: 'The source chat ID',
                },
                messageId: {
                  type: 'number',
                  description: 'The message ID to forward',
                },
                toChatId: {
                  type: 'string',
                  description: 'The destination chat ID',
                },
              },
              required: ['fromChatId', 'messageId', 'toChatId'],
            },
          },
          {
            name: 'get_message_context',
            description: 'Get detailed context for a message including reply chain and thread',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'number',
                  description: 'The message ID to get context for',
                },
                chatId: {
                  type: 'string',
                  description: 'The chat ID containing the message',
                },
                includeReplies: {
                  type: 'boolean',
                  description: 'Include reply chain (default: true)',
                  default: true,
                },
                includeThread: {
                  type: 'boolean',
                  description: 'Include thread messages (default: false)',
                  default: false,
                },
              },
              required: ['messageId', 'chatId'],
            },
          },
          {
            name: 'send_document',
            description: 'Send a document file to a chat',
            inputSchema: {
              type: 'object',
              properties: {
                chatId: {
                  type: 'string',
                  description: 'The chat ID to send document to',
                },
                filePath: {
                  type: 'string',
                  description: 'Path to the document file to send',
                },
                caption: {
                  type: 'string',
                  description: 'Optional caption for the document',
                },
                replyToMessageId: {
                  type: 'number',
                  description: 'Optional message ID to reply to',
                },
              },
              required: ['chatId', 'filePath'],
            },
          },
          {
            name: 'download_file',
            description: 'Download a file from a message',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'number',
                  description: 'The message ID containing the file',
                },
                chatId: {
                  type: 'string',
                  description: 'The chat ID containing the message',
                },
                outputPath: {
                  type: 'string',
                  description: 'Optional custom output directory path',
                },
              },
              required: ['messageId', 'chatId'],
            },
          },
          {
            name: 'get_file_info',
            description: 'Get detailed information about a file in a message',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'number',
                  description: 'The message ID containing the file',
                },
                chatId: {
                  type: 'string',
                  description: 'The chat ID containing the message',
                },
              },
              required: ['messageId', 'chatId'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      await this.getTelegramClient();

      switch (name) {
        case 'list_chats':
          return await this.chatHandler!.listChats(args);

        case 'get_chat_info':
          return await this.chatHandler!.getChatInfo(args);

        case 'search_chats':
          return await this.chatHandler!.searchChats(args);

        case 'get_messages':
          return await this.messageHandler!.getMessages(args);

        case 'send_message':
          return await this.messageHandler!.sendMessage(args);

        case 'search_messages':
          return await this.messageHandler!.searchMessages(args);

        case 'mark_as_read':
          return await this.messageHandler!.markAsRead(args);

        case 'get_user_info':
          return await this.userHandler!.getUserInfo(args);

        case 'get_media_content':
          return await this.messageHandler!.getMediaContent(args);

        case 'send_media':
          return await this.messageHandler!.sendMedia(args);

        case 'get_media_info':
          return await this.messageHandler!.getMediaInfo(args);

        case 'edit_message':
          return await this.messageHandler!.editMessage(args);

        case 'delete_message':
          return await this.messageHandler!.deleteMessage(args);

        case 'forward_message':
          return await this.messageHandler!.forwardMessage(args);

        case 'get_message_context':
          return await this.messageHandler!.getMessageContext(args);

        case 'send_document':
          return await this.messageHandler!.sendDocument(args);

        case 'download_file':
          return await this.messageHandler!.downloadFile(args);

        case 'get_file_info':
          return await this.messageHandler!.getFileInfo(args);

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      Logger.error('MCP Server error', error);
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
    Logger.info('Shutting down Telegram MCP Server...');
    try {
      if (this.telegramClient) {
        await this.telegramClient.disconnect();
      }
    } catch (error) {
      Logger.error('Error during cleanup', error as Error);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    Logger.info('Telegram MCP Server running on stdio');
  }
}

// Start the server
const server = new TelegramMCPServer();
server.run().catch((error) => {
  Logger.error('Failed to start server', error);
  process.exit(1);
});
