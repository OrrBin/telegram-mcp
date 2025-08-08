import { TelegramClient } from '../../src/telegram/client';
import type { TelegramConfig } from '../../src/telegram/types';

// Mock the tdl module
jest.mock('tdl', () => ({
  createClient: jest.fn(),
  configure: jest.fn(),
}));

jest.mock('prebuilt-tdlib', () => ({
  getTdjson: jest.fn(() => '/mock/path/to/tdjson'),
}));

describe('TelegramClient', () => {
  let mockClient: any;
  let config: TelegramConfig;

  beforeEach(() => {
    mockClient = {
      login: jest.fn(),
      invoke: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
    };

    const { createClient } = require('tdl');
    (createClient as jest.Mock).mockReturnValue(mockClient);

    config = {
      apiId: 12345,
      apiHash: 'test-hash',
      phone: '+1234567890',
      sessionDir: './test-session',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with correct configuration', () => {
      const client = new TelegramClient(config);
      
      expect(require('tdl').configure).toHaveBeenCalledWith({
        tdjson: '/mock/path/to/tdjson',
        verbosityLevel: 1,
      });

      expect(require('tdl').createClient).toHaveBeenCalledWith({
        apiId: 12345,
        apiHash: 'test-hash',
        databaseDirectory: './test-session',
        filesDirectory: './test-session/files',
      });
    });

    it('should set up event handlers', () => {
      new TelegramClient(config);
      
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('update', expect.any(Function));
    });
  });

  describe('connect', () => {
    it('should login with correct parameters', async () => {
      mockClient.login.mockResolvedValue(undefined);
      
      const client = new TelegramClient(config);
      await client.connect();

      expect(mockClient.login).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not login if already connected', async () => {
      mockClient.login.mockResolvedValue(undefined);
      
      const client = new TelegramClient(config);
      await client.connect();
      await client.connect(); // Second call

      expect(mockClient.login).toHaveBeenCalledTimes(1);
    });

    it('should throw error on login failure', async () => {
      const error = new Error('Login failed');
      mockClient.login.mockRejectedValue(error);
      
      const client = new TelegramClient(config);
      
      await expect(client.connect()).rejects.toThrow('Telegram connection failed: Login failed');
    });
  });

  describe('getChats', () => {
    it('should return formatted chat list', async () => {
      mockClient.login.mockResolvedValue(undefined);
      mockClient.invoke
        .mockResolvedValueOnce({ chat_ids: [123, 456] })
        .mockResolvedValueOnce({
          id: 123,
          title: 'Test Chat',
          type: { _: 'chatTypePrivate' },
        })
        .mockResolvedValueOnce({
          id: 456,
          title: 'Test Group',
          type: { _: 'chatTypeBasicGroup' },
        });

      const client = new TelegramClient(config);
      const chats = await client.getChats(2);

      expect(chats).toHaveLength(2);
      expect(chats[0]).toMatchObject({
        id: '123',
        title: 'Test Chat',
        type: 'private',
      });
      expect(chats[1]).toMatchObject({
        id: '456',
        title: 'Test Group',
        type: 'group',
      });
    });

    it('should handle API errors gracefully', async () => {
      mockClient.login.mockResolvedValue(undefined);
      mockClient.invoke.mockRejectedValue(new Error('API Error'));

      const client = new TelegramClient(config);
      
      await expect(client.getChats()).rejects.toThrow('API Error');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockMessage = {
        id: 789,
        chat_id: 123,
        content: { text: { text: 'Hello' } },
        date: 1234567890,
        is_outgoing: true,
      };

      mockClient.login.mockResolvedValue(undefined);
      mockClient.invoke.mockResolvedValue(mockMessage);

      const client = new TelegramClient(config);
      const result = await client.sendMessage('123', 'Hello');

      expect(mockClient.invoke).toHaveBeenCalledWith({
        _: 'sendMessage',
        chat_id: 123,
        reply_to_message_id: 0,
        input_message_content: {
          _: 'inputMessageText',
          text: {
            _: 'formattedText',
            text: 'Hello',
            entities: [],
          },
        },
      });

      expect(result).toMatchObject({
        id: 789,
        chatId: '123',
        text: 'Hello',
        date: 1234567890,
        isOutgoing: true,
      });
    });
  });

  describe('getMe', () => {
    it('should get user info successfully', async () => {
      mockClient.login.mockResolvedValue(undefined);
      mockClient.invoke.mockResolvedValue({
        id: 12345,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      });

      const client = new TelegramClient(config);
      const result = await client.getMe();

      expect(mockClient.invoke).toHaveBeenCalledWith({ _: 'getMe' });
      expect(result.id).toBe(12345);
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.username).toBe('testuser');
    });
  });

  describe('disconnect', () => {
    it('should close client when connected', async () => {
      mockClient.login.mockResolvedValue(undefined);
      mockClient.close.mockResolvedValue(undefined);

      const client = new TelegramClient(config);
      await client.connect();
      await client.disconnect();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should not close client when not connected', async () => {
      const client = new TelegramClient(config);
      await client.disconnect();

      expect(mockClient.close).not.toHaveBeenCalled();
    });
  });
});
