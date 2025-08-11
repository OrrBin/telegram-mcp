import { ErrorHandler } from '../../../src/utils/ErrorHandler.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';

describe('ErrorHandler', () => {
  describe('handleError', () => {
    it('should pass through McpError unchanged', () => {
      const originalError = new McpError(ErrorCode.InvalidRequest, 'Test error');
      
      const result = ErrorHandler.handleError(originalError);
      
      expect(result).toBe(originalError);
    });

    it('should convert ZodError to InvalidParams McpError', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['chatId'],
          message: 'Expected string, received number'
        }
      ]);

      const result = ErrorHandler.handleError(zodError);

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(ErrorCode.InvalidParams);
      expect(result.message).toContain('Validation error');
      expect(result.message).toContain('chatId');
    });

    it('should handle specific Telegram errors', () => {
      const phoneError = new Error('PHONE_NUMBER_INVALID: Invalid phone format');
      
      const result = ErrorHandler.handleError(phoneError);
      
      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(ErrorCode.InvalidRequest);
      expect(result.message).toBe('Invalid phone number format');
    });

    it('should handle chat ID errors', () => {
      const chatError = new Error('CHAT_ID_INVALID: Chat not found');
      
      const result = ErrorHandler.handleError(chatError);
      
      expect(result.code).toBe(ErrorCode.InvalidRequest);
      expect(result.message).toBe('Invalid chat ID');
    });

    it('should handle connection errors', () => {
      const connectionError = new Error('CONNECTION_NOT_INITED: Client not connected');
      
      const result = ErrorHandler.handleError(connectionError);
      
      expect(result.code).toBe(ErrorCode.InternalError);
      expect(result.message).toBe('Telegram connection not initialized');
    });

    it('should handle generic errors', () => {
      const genericError = new Error('Something went wrong');
      
      const result = ErrorHandler.handleError(genericError);
      
      expect(result.code).toBe(ErrorCode.InternalError);
      expect(result.message).toBe('Operation failed: Something went wrong');
    });

    it('should handle unknown error types', () => {
      const unknownError = 'string error';
      
      const result = ErrorHandler.handleError(unknownError);
      
      expect(result.code).toBe(ErrorCode.InternalError);
      expect(result.message).toBe('Unknown error occurred');
    });
  });

  describe('withErrorHandling', () => {
    it('should return result on successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await ErrorHandler.withErrorHandling(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should handle and transform errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(ErrorHandler.withErrorHandling(operation))
        .rejects.toThrow(McpError);
    });

    it('should preserve McpErrors', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'Test MCP error');
      const operation = jest.fn().mockRejectedValue(mcpError);
      
      await expect(ErrorHandler.withErrorHandling(operation))
        .rejects.toBe(mcpError);
    });
  });
});
