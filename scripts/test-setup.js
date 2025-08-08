#!/usr/bin/env node

// Simple test to verify the setup works
import { TelegramClient } from '../dist/telegram/client.js';
import { config } from 'dotenv';

config();

async function testSetup() {
  console.log('Testing Telegram MCP Server setup...');
  
  // Check environment variables
  const requiredEnvVars = ['TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'TELEGRAM_PHONE'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.log('Please copy .env.example to .env and fill in your credentials');
    process.exit(1);
  }
  
  console.log('✅ Environment variables are set');
  
  try {
    const telegramConfig = {
      apiId: parseInt(process.env.TELEGRAM_API_ID),
      apiHash: process.env.TELEGRAM_API_HASH,
      phone: process.env.TELEGRAM_PHONE,
      sessionDir: process.env.SESSION_DIR || './session',
    };
    
    const client = new TelegramClient(telegramConfig);
    console.log('✅ Telegram client created successfully');
    
    // Try to connect (this will prompt for auth if needed)
    console.log('🔄 Attempting to connect to Telegram...');
    await client.connect();
    
    console.log('✅ Successfully connected to Telegram!');
    console.log('🔄 Testing basic functionality...');
    
    // Test getting chats
    const chats = await client.getChats(5);
    console.log(`✅ Retrieved ${chats.length} chats`);
    
    if (chats.length > 0) {
      console.log('Sample chat:', {
        id: chats[0].id,
        title: chats[0].title,
        type: chats[0].type
      });
    }
    
    await client.disconnect();
    console.log('✅ All tests passed! Your Telegram MCP server is ready to use.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSetup();
