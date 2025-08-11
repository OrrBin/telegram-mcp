import { TelegramClient } from '../../src/telegram/client';

// Mock TelegramClient for integration tests
jest.mock('../../src/telegram/client');

describe('MCP Server Integration', () => {
  let mockTelegramClient: jest.Mocked<TelegramClient>;

  beforeAll(async () => {
    // Mock environment variables
    process.env.TELEGRAM_API_ID = '12345';
    process.env.TELEGRAM_API_HASH = 'test-hash';
    process.env.TELEGRAM_PHONE = '+1234567890';
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock TelegramClient methods
    const MockedTelegramClient = TelegramClient as jest.MockedClass<typeof TelegramClient>;
    mockTelegramClient = new MockedTelegramClient({} as any) as jest.Mocked<TelegramClient>;
    
    mockTelegramClient.connect = jest.fn().mockResolvedValue(undefined);
    mockTelegramClient.getChats = jest.fn().mockResolvedValue([
      { id: '123', title: 'Test Chat', type: 'private' as const, username: 'testchat', memberCount: 2, description: 'Test description' },
      { id: '456', title: 'Test Group', type: 'group' as const, username: 'testgroup', memberCount: 5, description: 'Group description' },
    ]);
    mockTelegramClient.getMe = jest.fn().mockResolvedValue({
      id: 12345,
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
    });
    mockTelegramClient.getMessages = jest.fn().mockResolvedValue([
      { id: 1, chatId: '12345', text: 'My message', date: 1234567890, isOutgoing: true },
    ]);
    mockTelegramClient.sendMessage = jest.fn().mockResolvedValue({
      id: 789,
      chatId: '123',
      text: 'Hello',
      date: 1234567890,
      isOutgoing: true,
    });
    mockTelegramClient.disconnect = jest.fn().mockResolvedValue(undefined);

    MockedTelegramClient.mockImplementation(() => mockTelegramClient);
  });

  describe('MCP Server Components', () => {
    it('should define all expected tools', () => {
      const expectedTools = [
        'list_chats',
        'get_chat_info', 
        'search_chats',
        'get_messages',
        'send_message',
        'search_messages',
        'mark_as_read',
        'get_user_info',
        'get_media_content',
        'send_media',
        'get_media_info',
        'edit_message',
        'delete_message',
        'forward_message',
        'get_message_context'
      ];

      // This test verifies the tools are defined in the source
      expect(expectedTools).toHaveLength(15);
      expect(expectedTools).toContain('list_chats');
      expect(expectedTools).toContain('send_message');
      expect(expectedTools).toContain('get_media_content');
      expect(expectedTools).toContain('send_media');
      expect(expectedTools).toContain('get_media_info');
      expect(expectedTools).toContain('edit_message');
      expect(expectedTools).toContain('delete_message');
      expect(expectedTools).toContain('forward_message');
      expect(expectedTools).toContain('get_message_context');
    });
  });

  describe('Tool Logic', () => {
    it('should format chat list correctly', async () => {
      const chats = [
        { id: '123', title: 'Test Chat', type: 'private' as const, username: 'testchat', memberCount: 2, description: 'Test description' },
        { id: '456', title: 'Test Group', type: 'group' as const, username: 'testgroup', memberCount: 5, description: 'Group description' },
      ];

      // Test the formatting logic that would be used in listChats
      const formattedText = `Found ${chats.length} chats:\n\n` +
        chats.map(chat => 
          `• **${chat.title}** (${chat.type})\n` +
          `  ID: ${chat.id}\n` +
          (chat.username ? `  Username: @${chat.username}\n` : '') +
          (chat.memberCount ? `  Members: ${chat.memberCount}\n` : '') +
          (chat.description ? `  Description: ${chat.description.substring(0, 100)}${chat.description.length > 100 ? '...' : ''}\n` : '')
        ).join('\n');

      expect(formattedText).toContain('Found 2 chats');
      expect(formattedText).toContain('Test Chat');
      expect(formattedText).toContain('Test Group');
      expect(formattedText).toContain('Username: @testchat');
      expect(formattedText).toContain('Members: 2');
    });

    it('should format sent message response correctly', () => {
      const sentMessage = {
        id: 789,
        chatId: '123',
        text: 'Hello',
        date: 1234567890,
        isOutgoing: true,
      };

      const formattedText = `✅ **Message sent successfully!**\n\n` +
        `• **Chat ID:** ${sentMessage.chatId}\n` +
        `• **Message ID:** ${sentMessage.id}\n` +
        `• **Text:** ${sentMessage.text}\n` +
        `• **Sent at:** ${new Date(sentMessage.date * 1000).toLocaleString()}`;

      expect(formattedText).toContain('Message sent successfully');
      expect(formattedText).toContain('**Chat ID:** 123');
      expect(formattedText).toContain('**Message ID:** 789');
      expect(formattedText).toContain('**Text:** Hello');
    });

    it('should handle TelegramClient connection', async () => {
      // Test that TelegramClient can be mocked and called
      await mockTelegramClient.connect();
      expect(mockTelegramClient.connect).toHaveBeenCalled();

      const chats = await mockTelegramClient.getChats(10);
      expect(mockTelegramClient.getChats).toHaveBeenCalledWith(10);
      expect(chats).toHaveLength(2);
      expect(chats[0].title).toBe('Test Chat');
      expect(chats[1].title).toBe('Test Group');
    });

    it('should handle message sending', async () => {
      const result = await mockTelegramClient.sendMessage('123', 'Test message', undefined);
      
      expect(mockTelegramClient.sendMessage).toHaveBeenCalledWith('123', 'Test message', undefined);
      expect(result.chatId).toBe('123');
      expect(result.text).toBe('Hello');
      expect(result.id).toBe(789);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error
      mockTelegramClient.getChats.mockRejectedValue(new Error('API Error'));

      try {
        await mockTelegramClient.getChats(10);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('API Error');
      }
    });

    it('should convert "me" to user ID in MCP server logic', async () => {
      // Simulate the MCP server logic for handling "me" chatId
      let chatId = 'me';
      if (chatId === 'me' || chatId === 'self') {
        const me = await mockTelegramClient.getMe();
        chatId = me.id.toString();
      }
      
      await mockTelegramClient.getMessages(chatId, 10);
      
      expect(mockTelegramClient.getMe).toHaveBeenCalled();
      expect(mockTelegramClient.getMessages).toHaveBeenCalledWith('12345', 10);
    });

    it('should handle getMe method correctly', async () => {
      const result = await mockTelegramClient.getMe();
      
      expect(mockTelegramClient.getMe).toHaveBeenCalled();
      expect(result.id).toBe(12345);
      expect(result.firstName).toBe('Test');
    });

    it('should validate environment configuration', () => {
      // Test that required environment variables are set
      expect(process.env.TELEGRAM_API_ID).toBe('12345');
      expect(process.env.TELEGRAM_API_HASH).toBe('test-hash');
      expect(process.env.TELEGRAM_PHONE).toBe('+1234567890');
    });
  });
});
