import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';

export class ErrorHandler {
  static handleError(error: unknown): McpError {
    if (error instanceof McpError) {
      return error;
    }

    if (error instanceof ZodError) {
      const message = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return new McpError(ErrorCode.InvalidParams, `Validation error: ${message}`);
    }

    if (error instanceof Error) {
      // Handle specific Telegram errors
      if (error.message.includes('PHONE_NUMBER_INVALID')) {
        return new McpError(ErrorCode.InvalidRequest, 'Invalid phone number format');
      }
      
      if (error.message.includes('CHAT_ID_INVALID')) {
        return new McpError(ErrorCode.InvalidRequest, 'Invalid chat ID');
      }
      
      if (error.message.includes('USER_ID_INVALID')) {
        return new McpError(ErrorCode.InvalidRequest, 'Invalid user ID');
      }
      
      if (error.message.includes('CONNECTION_NOT_INITED')) {
        return new McpError(ErrorCode.InternalError, 'Telegram connection not initialized');
      }

      return new McpError(ErrorCode.InternalError, `Operation failed: ${error.message}`);
    }

    return new McpError(ErrorCode.InternalError, 'Unknown error occurred');
  }

  static async withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw ErrorHandler.handleError(error);
    }
  }
}
