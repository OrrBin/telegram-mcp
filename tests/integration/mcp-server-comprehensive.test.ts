import { TelegramClient } from '../../src/telegram/client.js';
import { TelegramMockFactory } from '../mocks/TelegramMockFactory.js';
import { ChatBuilder } from '../builders/ChatBuilder.js';
import { MessageBuilder } from '../builders/MessageBuilder.js';
import { MOCK_CHATS, MOCK_MESSAGES, MOCK_USERS } from '../fixtures/telegram-responses.js';

// Mock the entire TelegramClient module
jest.mock('../../src/telegram/client.js');

describe('MCP Server Comprehensive Integration', () => {
  let mockTelegramClient: jest.Mocked<TelegramClient>;

  beforeAll(() => {
    // Set up test environment variables
    process.env.TELEGRAM_API_ID = '12345';
    process.env.TELEGRAM_API_HASH = 'test-hash';
    process.env.TELEGRAM_PHONE = '+1234567890';
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock client with comprehensive setup
    const MockedTelegramClient = TelegramClient as jest.MockedClass<typeof TelegramClient>;
    mockTelegramClient = TelegramMockFactory.createMockClient();
    MockedTelegramClient.mockImplementation(() => mockTelegramClient);

    // Set up default mock responses
    mockTelegramClient.getChats.mockResolvedValue(MOCK_CHATS);
    mockTelegramClient.getMessages.mockResolvedValue(MOCK_MESSAGES);
    mockTelegramClient.getUserInfo.mockResolvedValue(MOCK_USERS[0]);
    mockTelegramClient.searchMessages.mockResolvedValue({
      messages: MOCK_MESSAGES.slice(0, 2),
      totalCount: 2
    });
  });

  describe('Chat Operations Integration', () => {
    it('should handle complete chat workflow', async () => {
      // Test listing chats
      const chats = await mockTelegramClient.getChats(50);
      expect(chats).toHaveLength(3);
      expect(chats[0].title).toBe('Personal Chat');

      // Test getting specific chat info
      const chatInfo = await mockTelegramClient.getChatInfo('123');
      expect(chatInfo.id).toBe('123');

      // Test searching chats
      const searchResults = chats.filter(chat => 
        chat.title.toLowerCase().includes('team')
      );
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Development Team');
    });

    it('should handle edge cases in chat operations', async () => {
      // Test empty chat list
      mockTelegramClient.getChats.mockResolvedValue([]);
      const emptyChats = await mockTelegramClient.getChats(50);
      expect(emptyChats).toHaveLength(0);

      // Test chat with special characters
      const specialChat = new ChatBuilder()
        .withTitle('Chat with émojis 🚀')
        .withDescription('Special chars: @#$%^&*()')
        .build();
      
      mockTelegramClient.getChatInfo.mockResolvedValue(specialChat);
      const chatInfo = await mockTelegramClient.getChatInfo('special');
      expect(chatInfo.title).toBe('Chat with émojis 🚀');
    });
  });

  describe('Message Operations Integration', () => {
    it('should handle complete message workflow', async () => {
      // Test getting messages
      const messages = await mockTelegramClient.getMessages('123', 20);
      expect(messages).toHaveLength(3);

      // Test sending message
      const newMessage = new MessageBuilder()
        .withId(999)
        .withText('Integration test message')
        .withChatId('123')
        .asOutgoing()
        .build();
      
      mockTelegramClient.sendMessage.mockResolvedValue(newMessage);
      const sentMessage = await mockTelegramClient.sendMessage('123', 'Integration test message');
      expect(sentMessage.text).toBe('Integration test message');
      expect(sentMessage.isOutgoing).toBe(true);

      // Test marking as read
      await mockTelegramClient.markAsRead('123', [1, 2, 3]);
      expect(mockTelegramClient.markAsRead).toHaveBeenCalledWith('123', [1, 2, 3]);
    });

    it('should handle message search across multiple chats', async () => {
      const searchResults = await mockTelegramClient.searchMessages('hello');
      expect(searchResults.messages).toHaveLength(2);
      expect(searchResults.totalCount).toBe(2);
    });

    it('should handle special message types', async () => {
      const mediaMessage = new MessageBuilder()
        .withId(100)
        .withChatId('123')
        .withMedia('photo', 'A beautiful sunset')
        .build();

      const replyMessage = new MessageBuilder()
        .withId(101)
        .withChatId('123')
        .withText('Thanks for sharing!')
        .withReplyTo(100)
        .build();

      mockTelegramClient.getMessages.mockResolvedValue([mediaMessage, replyMessage]);
      const messages = await mockTelegramClient.getMessages('123', 10);
      
      expect(messages[0].mediaType).toBe('photo');
      expect(messages[0].mediaCaption).toBe('A beautiful sunset');
      expect(messages[1].replyToMessageId).toBe(100);
    });
  });

  describe('User Operations Integration', () => {
    it('should handle user information retrieval', async () => {
      const userInfo = await mockTelegramClient.getUserInfo('456');
      expect(userInfo.firstName).toBe('John');
      expect(userInfo.lastName).toBe('Doe');
      expect(userInfo.username).toBe('johndoe');
      expect(userInfo.isBot).toBe(false);
    });

    it('should handle bot users differently', async () => {
      mockTelegramClient.getUserInfo.mockResolvedValue(MOCK_USERS[1]);
      const botInfo = await mockTelegramClient.getUserInfo('789');
      expect(botInfo.isBot).toBe(true);
      expect(botInfo.isVerified).toBe(true);
    });

    it('should handle "me" chat ID resolution', async () => {
      mockTelegramClient.getMe.mockResolvedValue({
        id: 12345,
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser'
      });

      const me = await mockTelegramClient.getMe();
      expect(me.id).toBe(12345);
      expect(me.firstName).toBe('Test');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle connection errors gracefully', async () => {
      mockTelegramClient.getChats.mockRejectedValue(new Error('CONNECTION_NOT_INITED'));
      
      await expect(mockTelegramClient.getChats(50))
        .rejects.toThrow('CONNECTION_NOT_INITED');
    });

    it('should handle invalid chat ID errors', async () => {
      mockTelegramClient.getChatInfo.mockRejectedValue(new Error('CHAT_ID_INVALID'));
      
      await expect(mockTelegramClient.getChatInfo('invalid'))
        .rejects.toThrow('CHAT_ID_INVALID');
    });

    it('should handle rate limiting scenarios', async () => {
      mockTelegramClient.sendMessage.mockRejectedValue(new Error('FLOOD_WAIT_X'));
      
      await expect(mockTelegramClient.sendMessage('123', 'test'))
        .rejects.toThrow('FLOOD_WAIT_X');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large chat lists efficiently', async () => {
      const largeChats = Array(100).fill(null).map((_, i) => 
        new ChatBuilder()
          .withId(`${i}`)
          .withTitle(`Chat ${i}`)
          .withType(i % 2 === 0 ? 'private' : 'group')
          .build()
      );

      mockTelegramClient.getChats.mockResolvedValue(largeChats);
      const chats = await mockTelegramClient.getChats(100);
      expect(chats).toHaveLength(100);
    });

    it('should handle message pagination correctly', async () => {
      const messages1 = Array(20).fill(null).map((_, i) => 
        new MessageBuilder().withId(i + 1).build()
      );
      const messages2 = Array(20).fill(null).map((_, i) => 
        new MessageBuilder().withId(i + 21).build()
      );

      mockTelegramClient.getMessages
        .mockResolvedValueOnce(messages1)
        .mockResolvedValueOnce(messages2);

      const firstPage = await mockTelegramClient.getMessages('123', 20);
      const secondPage = await mockTelegramClient.getMessages('123', 20, 20);

      expect(firstPage).toHaveLength(20);
      expect(secondPage).toHaveLength(20);
      expect(firstPage[0].id).toBe(1);
      expect(secondPage[0].id).toBe(21);
    });
  });
});
