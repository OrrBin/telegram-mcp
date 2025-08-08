// Global test setup
import { jest } from '@jest/globals';

// Set test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.TELEGRAM_API_ID = '12345';
process.env.TELEGRAM_API_HASH = 'test-hash';
process.env.TELEGRAM_PHONE = '+1234567890';
process.env.SESSION_DIR = './test-session';
