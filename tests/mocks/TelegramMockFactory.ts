import type { TelegramClient } from '../../src/telegram/client.js';
import type { ChatInfo, MessageInfo, UserInfo, SearchResult } from '../../src/telegram/types.js';

export class TelegramMockFactory {
  static createMockClient(): jest.Mocked<TelegramClient> {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      getChats: jest.fn().mockResolvedValue([]),
      getChatInfo: jest.fn().mockResolvedValue(TelegramMockFactory.createMockChat()),
      getMessages: jest.fn().mockResolvedValue([]),
      sendMessage: jest.fn().mockResolvedValue(TelegramMockFactory.createMockMessage()),
      searchMessages: jest.fn().mockResolvedValue({ messages: [], totalCount: 0 }),
      getUserInfo: jest.fn().mockResolvedValue(TelegramMockFactory.createMockUser()),
      markAsRead: jest.fn().mockResolvedValue(undefined),
      getMe: jest.fn().mockResolvedValue({ id: 12345, firstName: 'Test', lastName: 'User', username: 'testuser' }),
      disconnect: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TelegramClient>;
  }

  static createMockChat(overrides?: Partial<ChatInfo>): ChatInfo {
    return {
      id: '123',
      title: 'Test Chat',
      type: 'private',
      username: 'testchat',
      memberCount: 2,
      description: 'Test description',
      isVerified: false,
      isScam: false,
      isFake: false,
      ...overrides
    };
  }

  static createMockMessage(overrides?: Partial<MessageInfo>): MessageInfo {
    return {
      id: 1,
      chatId: '123',
      text: 'Test message',
      date: 1234567890,
      isOutgoing: false,
      senderId: '456',
      senderName: 'Test User',
      ...overrides
    };
  }

  static createMockUser(overrides?: Partial<UserInfo>): UserInfo {
    return {
      id: '456',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      phone: '+1234567890',
      isBot: false,
      isVerified: false,
      isScam: false,
      isFake: false,
      status: 'online',
      ...overrides
    };
  }

  static createMockSearchResult(overrides?: Partial<SearchResult>): SearchResult {
    return {
      messages: [TelegramMockFactory.createMockMessage()],
      totalCount: 1,
      ...overrides
    };
  }
}
