#!/usr/bin/env node

import { TelegramClient } from './telegram/client.js';
import { Config } from './config/index.js';
import { Logger } from './utils/Logger.js';

async function authenticate() {
  const config = Config.getInstance();
  const client = new TelegramClient(config.telegram);
  
  try {
    Logger.info('Starting Telegram authentication...');
    await client.connect();
    Logger.info('Authentication successful!');
    await client.disconnect();
    process.exit(0);
  } catch (error) {
    Logger.error('Authentication failed', error as Error);
    process.exit(1);
  }
}

authenticate();
