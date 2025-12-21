import { z } from 'zod';
import type { TelegramConfig } from '../telegram/types.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Silently load .env file without stdout pollution
try {
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
} catch {
  // .env file not found or not readable - env vars should come from MCP config
}

const TelegramConfigSchema = z.object({
  apiId: z.string().transform(val => parseInt(val, 10)),
  apiHash: z.string().min(1),
  phone: z.string().min(1),
  sessionDir: z.string().default('./session')
});

const ServerConfigSchema = z.object({
  name: z.string().default('telegram-mcp-server'),
  version: z.string().default('1.0.0'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('production')
});

export class Config {
  private static instance: Config;
  
  readonly telegram: TelegramConfig;
  readonly server: {
    name: string;
    version: string;
    nodeEnv: 'development' | 'production' | 'test';
  };

  private constructor() {
    this.telegram = this.loadTelegramConfig();
    this.server = this.loadServerConfig();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadTelegramConfig(): TelegramConfig {
    const config = TelegramConfigSchema.parse({
      apiId: process.env.TELEGRAM_API_ID,
      apiHash: process.env.TELEGRAM_API_HASH,
      phone: process.env.TELEGRAM_PHONE,
      sessionDir: process.env.SESSION_DIR
    });

    return {
      apiId: config.apiId,
      apiHash: config.apiHash,
      phone: config.phone,
      sessionDir: config.sessionDir
    };
  }

  private loadServerConfig() {
    return ServerConfigSchema.parse({
      name: process.env.SERVER_NAME,
      version: process.env.SERVER_VERSION,
      nodeEnv: process.env.NODE_ENV
    });
  }

  isDevelopment(): boolean {
    return this.server.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.server.nodeEnv === 'production';
  }

  isTest(): boolean {
    return this.server.nodeEnv === 'test';
  }
}
