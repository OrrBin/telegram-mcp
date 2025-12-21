#!/usr/bin/env node

import { TelegramClient } from './dist/telegram/client.js';
import { Config } from './dist/config/index.js';

async function testConnection() {
  try {
    console.log('Loading config...');
    const config = Config.getInstance();
    console.log('Config loaded:', {
      apiId: config.telegram.apiId,
      phone: config.telegram.phone,
      sessionDir: config.telegram.sessionDir
    });

    console.log('Creating Telegram client...');
    const client = new TelegramClient(config.telegram);
    
    console.log('Attempting to connect...');
    await client.connect();
    
    console.log('Connected successfully! Testing basic functionality...');
    
    const me = await client.getMe();
    console.log('User info:', me);
    
    const chats = await client.getChats(5);
    console.log('First 5 chats:', chats.map(c => ({ id: c.id, title: c.title, type: c.type })));
    
    await client.disconnect();
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Connection test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testConnection();
