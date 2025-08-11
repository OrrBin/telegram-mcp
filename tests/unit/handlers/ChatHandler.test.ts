import { ChatHandler } from '../../../src/handlers/ChatHandler.js';
import { TelegramMockFactory } from '../../mocks/TelegramMockFactory.js';
import { ChatBuilder } from '../../builders/ChatBuilder.js';
import { MOCK_CHATS } from '../../fixtures/telegram-responses.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('ChatHandler', () => {
  let chatHandler: ChatHandler;
  let mockClient: jest.Mocked<any>;

  beforeEach(() => {
    mockClient = TelegramMockFactory.createMockClient();
    chatHandler = new ChatHandler(mockClient);
  });

  describe('listChats', () => {
    it('should return formatted chat list with default limit', async () => {
      mockClient.getChats.mockResolvedValue(MOCK_CHATS);

      const result = await chatHandler.listChats({});

      expect(mockClient.getChats).toHaveBeenCalledWith(50);
      expect(result.content[0].text).toContain('Found 3 chats');
      expect(result.content[0].text).toContain('Personal Chat');
      expect(result.content[0].text).toContain('Development Team');
    });

    it('should respect custom limit parameter', async () => {
      mockClient.getChats.mockResolvedValue(MOCK_CHATS.slice(0, 2));

      const result = await chatHandler.listChats({ limit: 2 });

      expect(mockClient.getChats).toHaveBeenCalledWith(2);
      expect(result.content[0].text).toContain('Found 2 chats');
    });

    it('should handle validation errors', async () => {
      await expect(chatHandler.listChats({ limit: -1 }))
        .rejects.toThrow(McpError);
    });

    it('should handle empty chat list', async () => {
      mockClient.getChats.mockResolvedValue([]);

      const result = await chatHandler.listChats({});

      expect(result.content[0].text).toContain('Found 0 chats');
    });
  });

  describe('getChatInfo', () => {
    it('should return detailed chat information', async () => {
      const mockChat = new ChatBuilder()
        .withId('123')
        .withTitle('Test Chat')
        .withType('private')
        .withUsername('testchat')
        .asVerified()
        .build();

      mockClient.getChatInfo.mockResolvedValue(mockChat);

      const result = await chatHandler.getChatInfo({ chatId: '123' });

      expect(mockClient.getChatInfo).toHaveBeenCalledWith('123');
      expect(result.content[0].text).toContain('Test Chat');
      expect(result.content[0].text).toContain('private');
      expect(result.content[0].text).toContain('@testchat');
      expect(result.content[0].text).toContain('Verified: Yes');
    });

    it('should require chatId parameter', async () => {
      await expect(chatHandler.getChatInfo({}))
        .rejects.toThrow(McpError);
    });

    it('should handle invalid chatId', async () => {
      await expect(chatHandler.getChatInfo({ chatId: '' }))
        .rejects.toThrow(McpError);
    });
  });

  describe('searchChats', () => {
    it('should filter chats by title', async () => {
      mockClient.getChats.mockResolvedValue(MOCK_CHATS);

      const result = await chatHandler.searchChats({ query: 'Development' });

      expect(result.content[0].text).toContain('Found 1 chats matching "Development"');
      expect(result.content[0].text).toContain('Development Team');
    });

    it('should filter chats by username', async () => {
      mockClient.getChats.mockResolvedValue(MOCK_CHATS);

      const result = await chatHandler.searchChats({ query: 'johndoe' });

      expect(result.content[0].text).toContain('Found 1 chats matching "johndoe"');
      expect(result.content[0].text).toContain('Personal Chat');
    });

    it('should respect limit parameter', async () => {
      const manyChats = Array(5).fill(null).map((_, i) => 
        new ChatBuilder()
          .withId(`${i}`)
          .withTitle(`Chat ${i}`)
          .build()
      );
      mockClient.getChats.mockResolvedValue(manyChats);

      const result = await chatHandler.searchChats({ query: 'Chat', limit: 2 });

      expect(result.content[0].text).toContain('Found 2 chats matching "Chat"');
    });

    it('should be case insensitive', async () => {
      mockClient.getChats.mockResolvedValue(MOCK_CHATS);

      const result = await chatHandler.searchChats({ query: 'DEVELOPMENT' });

      expect(result.content[0].text).toContain('Found 1 chats matching "DEVELOPMENT"');
    });

    it('should require query parameter', async () => {
      await expect(chatHandler.searchChats({}))
        .rejects.toThrow(McpError);
    });
  });
});
