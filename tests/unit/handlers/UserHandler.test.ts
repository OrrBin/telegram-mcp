import { UserHandler } from '../../../src/handlers/UserHandler.js';
import { TelegramMockFactory } from '../../mocks/TelegramMockFactory.js';
import { MOCK_USERS } from '../../fixtures/telegram-responses.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

describe('UserHandler', () => {
  let userHandler: UserHandler;
  let mockClient: jest.Mocked<any>;

  beforeEach(() => {
    mockClient = TelegramMockFactory.createMockClient();
    userHandler = new UserHandler(mockClient);
  });

  describe('getUserInfo', () => {
    it('should return user information', async () => {
      const mockUser = MOCK_USERS[0];
      mockClient.getUserInfo.mockResolvedValue(mockUser);

      const result = await userHandler.getUserInfo({ userId: '456' });

      expect(mockClient.getUserInfo).toHaveBeenCalledWith('456');
      expect(result.content[0].text).toContain('User Information');
      expect(result.content[0].text).toContain('John Doe');
      expect(result.content[0].text).toContain('ID: 456');
      expect(result.content[0].text).toContain('@johndoe');
      expect(result.content[0].text).toContain('+1234567890');
      expect(result.content[0].text).toContain('Is Bot: No');
    });

    it('should handle bot users', async () => {
      const botUser = MOCK_USERS[1];
      mockClient.getUserInfo.mockResolvedValue(botUser);

      const result = await userHandler.getUserInfo({ userId: '789' });

      expect(result.content[0].text).toContain('Bot Assistant');
      expect(result.content[0].text).toContain('Is Bot: Yes');
      expect(result.content[0].text).toContain('Verified: Yes');
    });

    it('should handle users without optional fields', async () => {
      const minimalUser = {
        id: '999',
        firstName: 'Minimal',
        isBot: false
      };
      mockClient.getUserInfo.mockResolvedValue(minimalUser);

      const result = await userHandler.getUserInfo({ userId: '999' });

      expect(result.content[0].text).toContain('Minimal');
      expect(result.content[0].text).toContain('ID: 999');
      expect(result.content[0].text).not.toContain('Username:');
      expect(result.content[0].text).not.toContain('Phone:');
    });

    it('should require userId parameter', async () => {
      await expect(userHandler.getUserInfo({}))
        .rejects.toThrow(McpError);
    });

    it('should reject empty userId', async () => {
      await expect(userHandler.getUserInfo({ userId: '' }))
        .rejects.toThrow(McpError);
    });
  });
});
