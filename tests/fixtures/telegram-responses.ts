import type { ChatInfo, MessageInfo, UserInfo } from '../../src/telegram/types.js';

export const MOCK_CHATS: ChatInfo[] = [
  {
    id: '123',
    title: 'Personal Chat',
    type: 'private',
    username: 'johndoe',
    description: 'Private conversation'
  },
  {
    id: '456',
    title: 'Development Team',
    type: 'group',
    memberCount: 15,
    description: 'Team collaboration chat'
  },
  {
    id: '789',
    title: 'Announcements',
    type: 'channel',
    username: 'announcements',
    memberCount: 1000,
    description: 'Company announcements',
    isVerified: true
  }
];

export const MOCK_MESSAGES: MessageInfo[] = [
  {
    id: 1,
    chatId: '123',
    text: 'Hello world!',
    date: 1234567890,
    isOutgoing: false,
    senderId: '456',
    senderName: 'John Doe'
  },
  {
    id: 2,
    chatId: '123',
    text: 'How are you?',
    date: 1234567900,
    isOutgoing: true,
    senderId: '789',
    senderName: 'Me'
  },
  {
    id: 3,
    chatId: '456',
    text: 'Meeting at 3 PM',
    date: 1234567910,
    isOutgoing: false,
    senderId: '111',
    senderName: 'Team Lead',
    replyToMessageId: 1
  }
];

export const MOCK_USERS: UserInfo[] = [
  {
    id: '456',
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    phone: '+1234567890',
    isBot: false,
    isVerified: false,
    status: 'online'
  },
  {
    id: '789',
    firstName: 'Bot',
    lastName: 'Assistant',
    username: 'botassistant',
    isBot: true,
    isVerified: true,
    status: 'online'
  }
];

export const MOCK_SEARCH_RESULTS = {
  messages: MOCK_MESSAGES.slice(0, 2),
  totalCount: 2
};
