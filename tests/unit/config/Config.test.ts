import { Config } from '../../../src/config/index.js';

describe('Config', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear singleton instance for testing
    (Config as any).instance = undefined;
    
    // Clear test environment variables that might interfere
    delete process.env.SESSION_DIR;
    delete process.env.SERVER_NAME;
    delete process.env.SERVER_VERSION;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
    (Config as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      process.env.TELEGRAM_API_ID = '12345';
      process.env.TELEGRAM_API_HASH = 'test-hash';
      process.env.TELEGRAM_PHONE = '+1234567890';

      const config1 = Config.getInstance();
      const config2 = Config.getInstance();

      expect(config1).toBe(config2);
    });

    it('should load telegram configuration from environment', () => {
      process.env.TELEGRAM_API_ID = '12345';
      process.env.TELEGRAM_API_HASH = 'test-hash';
      process.env.TELEGRAM_PHONE = '+1234567890';
      process.env.SESSION_DIR = './custom-session';

      const config = Config.getInstance();

      expect(config.telegram.apiId).toBe(12345);
      expect(config.telegram.apiHash).toBe('test-hash');
      expect(config.telegram.phone).toBe('+1234567890');
      expect(config.telegram.sessionDir).toBe('./custom-session');
    });

    it('should use default session directory', () => {
      process.env.TELEGRAM_API_ID = '12345';
      process.env.TELEGRAM_API_HASH = 'test-hash';
      process.env.TELEGRAM_PHONE = '+1234567890';

      const config = Config.getInstance();

      expect(config.telegram.sessionDir).toBe('./session');
    });

    it('should load server configuration with defaults', () => {
      process.env.TELEGRAM_API_ID = '12345';
      process.env.TELEGRAM_API_HASH = 'test-hash';
      process.env.TELEGRAM_PHONE = '+1234567890';

      const config = Config.getInstance();

      expect(config.server.name).toBe('telegram-mcp-server');
      expect(config.server.version).toBe('1.0.0');
      expect(config.server.nodeEnv).toBe('production');
    });

    it('should respect custom server configuration', () => {
      process.env.TELEGRAM_API_ID = '12345';
      process.env.TELEGRAM_API_HASH = 'test-hash';
      process.env.TELEGRAM_PHONE = '+1234567890';
      process.env.SERVER_NAME = 'custom-server';
      process.env.SERVER_VERSION = '2.0.0';
      process.env.NODE_ENV = 'development';

      const config = Config.getInstance();

      expect(config.server.name).toBe('custom-server');
      expect(config.server.version).toBe('2.0.0');
      expect(config.server.nodeEnv).toBe('development');
    });

    it('should throw error for missing required telegram config', () => {
      // Clear all telegram env vars
      delete process.env.TELEGRAM_API_ID;
      delete process.env.TELEGRAM_API_HASH;
      delete process.env.TELEGRAM_PHONE;
      
      expect(() => Config.getInstance()).toThrow();
    });
  });

  describe('environment detection methods', () => {
    beforeEach(() => {
      process.env.TELEGRAM_API_ID = '12345';
      process.env.TELEGRAM_API_HASH = 'test-hash';
      process.env.TELEGRAM_PHONE = '+1234567890';
    });

    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      const config = Config.getInstance();

      expect(config.isDevelopment()).toBe(true);
      expect(config.isProduction()).toBe(false);
      expect(config.isTest()).toBe(false);
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      const config = Config.getInstance();

      expect(config.isDevelopment()).toBe(false);
      expect(config.isProduction()).toBe(true);
      expect(config.isTest()).toBe(false);
    });

    it('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      const config = Config.getInstance();

      expect(config.isDevelopment()).toBe(false);
      expect(config.isProduction()).toBe(false);
      expect(config.isTest()).toBe(true);
    });

    it('should default to production environment', () => {
      delete process.env.NODE_ENV;
      const config = Config.getInstance();

      expect(config.isProduction()).toBe(true);
    });
  });
});
