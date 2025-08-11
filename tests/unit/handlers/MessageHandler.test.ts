import { MessageHandler } from '../../../src/handlers/MessageHandler.js';
import { TelegramMockFactory } from '../../mocks/TelegramMockFactory.js';
import { MessageBuilder } from '../../builders/MessageBuilder.js';
import { MOCK_MESSAGES, MOCK_SEARCH_RESULTS } from '../../fixtures/telegram-responses.js';

// Mock the MCP SDK module
jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  McpError: class { constructor(public code: string, public message: string) {} },
  ErrorCode: {
    InvalidRequest: 'InvalidRequest',
    InvalidParams: 'InvalidParams',
    InternalError: 'InternalError',
    MethodNotFound: 'MethodNotFound'
  }
}));

describe('MessageHandler', () => {
  let messageHandler: MessageHandler;
  let mockClient: jest.Mocked<any>;

  beforeEach(() => {
    mockClient = TelegramMockFactory.createMockClient();
    messageHandler = new MessageHandler(mockClient);
  });

  describe('getMessages', () => {
    it('should get messages from specified chat', async () => {
      mockClient.getMessages.mockResolvedValue(MOCK_MESSAGES);

      const result = await messageHandler.getMessages({ chatId: '123' });

      expect(mockClient.getMessages).toHaveBeenCalledWith('123', 20, undefined);
      expect(result.content[0].text).toContain('Messages from chat 123');
      expect(result.content[0].text).toContain('Hello world!');
    });

    it('should handle "me" chatId by getting user ID', async () => {
      mockClient.getMe.mockResolvedValue({ id: 12345, firstName: 'Test', lastName: 'User' });
      mockClient.getMessages.mockResolvedValue([]);

      await messageHandler.getMessages({ chatId: 'me' });

      expect(mockClient.getMe).toHaveBeenCalled();
      expect(mockClient.getMessages).toHaveBeenCalledWith('12345', 20, undefined);
    });

    it('should respect limit parameter', async () => {
      mockClient.getMessages.mockResolvedValue(MOCK_MESSAGES.slice(0, 5));

      await messageHandler.getMessages({ chatId: '123', limit: 5 });

      expect(mockClient.getMessages).toHaveBeenCalledWith('123', 5, undefined);
    });

    it('should handle fromMessageId parameter', async () => {
      mockClient.getMessages.mockResolvedValue(MOCK_MESSAGES);

      await messageHandler.getMessages({ chatId: '123', fromMessageId: 100 });

      expect(mockClient.getMessages).toHaveBeenCalledWith('123', 20, 100);
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const sentMessage = new MessageBuilder()
        .withId(789)
        .withChatId('123')
        .withText('Hello!')
        .withDate(1234567890)
        .asOutgoing()
        .build();

      mockClient.sendMessage.mockResolvedValue(sentMessage);

      const result = await messageHandler.sendMessage({
        chatId: '123',
        text: 'Hello!'
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith('123', 'Hello!', undefined);
      expect(result.content[0].text).toContain('Message sent successfully');
      expect(result.content[0].text).toContain('**Message ID:** 789');
      expect(result.content[0].text).toContain('Hello!');
    });

    it('should handle reply to message', async () => {
      const sentMessage = TelegramMockFactory.createMockMessage();
      mockClient.sendMessage.mockResolvedValue(sentMessage);

      await messageHandler.sendMessage({
        chatId: '123',
        text: 'Reply',
        replyToMessageId: 456
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith('123', 'Reply', 456);
    });
  });

  describe('searchMessages', () => {
    it('should search messages globally', async () => {
      mockClient.searchMessages.mockResolvedValue(MOCK_SEARCH_RESULTS);

      const result = await messageHandler.searchMessages({ query: 'hello' });

      expect(mockClient.searchMessages).toHaveBeenCalledWith('hello', undefined, 20);
      expect(result.content[0].text).toContain('Search results for "hello"');
      expect(result.content[0].text).toContain('Found 2 total matches');
    });

    it('should search messages in specific chat', async () => {
      mockClient.searchMessages.mockResolvedValue(MOCK_SEARCH_RESULTS);

      await messageHandler.searchMessages({ query: 'hello', chatId: '123' });

      expect(mockClient.searchMessages).toHaveBeenCalledWith('hello', '123', 20);
    });

    it('should respect limit parameter', async () => {
      mockClient.searchMessages.mockResolvedValue(MOCK_SEARCH_RESULTS);

      await messageHandler.searchMessages({ query: 'hello', limit: 5 });

      expect(mockClient.searchMessages).toHaveBeenCalledWith('hello', undefined, 5);
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      const result = await messageHandler.markAsRead({
        chatId: '123',
        messageIds: [1, 2, 3]
      });

      expect(mockClient.markAsRead).toHaveBeenCalledWith('123', [1, 2, 3]);
      expect(result.content[0].text).toContain('Messages marked as read');
      expect(result.content[0].text).toContain('**Chat ID:** 123');
      expect(result.content[0].text).toContain('**Count:** 3 messages');
    });
  });
});
