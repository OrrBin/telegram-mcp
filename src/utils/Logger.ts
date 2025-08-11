import { Config } from '../config/index.js';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: object;
  error?: string;
}

export class Logger {
  private static config = Config.getInstance();

  private static createLogEntry(level: LogLevel, message: string, meta?: object, error?: Error): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (meta) {
      entry.meta = meta;
    }

    if (error) {
      entry.error = error.stack || error.message;
    }

    return entry;
  }

  private static log(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    
    // Use stderr for logs to avoid interfering with MCP stdio
    if (entry.level === LogLevel.ERROR) {
      console.error(output);
    } else {
      console.error(output);
    }
  }

  static debug(message: string, meta?: object): void {
    if (Logger.config.isDevelopment()) {
      Logger.log(Logger.createLogEntry(LogLevel.DEBUG, message, meta));
    }
  }

  static info(message: string, meta?: object): void {
    Logger.log(Logger.createLogEntry(LogLevel.INFO, message, meta));
  }

  static warn(message: string, meta?: object): void {
    Logger.log(Logger.createLogEntry(LogLevel.WARN, message, meta));
  }

  static error(message: string, error?: Error, meta?: object): void {
    Logger.log(Logger.createLogEntry(LogLevel.ERROR, message, meta, error));
  }

  static operation(operation: string, meta?: object): void {
    Logger.info(`Operation: ${operation}`, meta);
  }

  static performance(operation: string, duration: number, meta?: object): void {
    Logger.info(`Performance: ${operation}`, { 
      duration: `${duration}ms`, 
      ...meta 
    });
  }
}
