#!/usr/bin/env node

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { mkdir } from 'fs/promises';

config();

class TelegramMCPTester {
  constructor() {
    this.serverProcess = null;
    this.testResults = [];
    this.messageId = 1;
    this.testChatId = null;
    this.testUserId = null;
    this.sentMessageId = null;
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive Telegram MCP server tests...\n');
    
    try {
      await this.startServer();
      await this.initializeMCP();
      
      // Run all tool tests
      await this.testListTools();
      await this.testListChats();
      await this.testSearchChats();
      await this.testGetChatInfo();
      await this.testGetMessages();
      await this.testSendMessage();
      await this.testSearchMessages();
      await this.testMarkAsRead();
      await this.testGetUserInfo();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      this.cleanup();
    }
  }

  async startServer() {
    console.log('📡 Starting MCP server...');
    
    this.serverProcess = spawn('node', ['../dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      cwd: process.cwd()
    });

    this.serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('running on stdio')) {
        console.log('✅ Server started successfully');
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('Server stderr:', output);
      }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async initializeMCP() {
    console.log('🔧 Initializing MCP connection...');
    
    const initMessage = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };

    const response = await this.sendMessage(initMessage);
    
    if (response.result && response.result.serverInfo) {
      console.log('✅ MCP initialized successfully');
      this.addResult('MCP Initialization', true, 'Server initialized');
    } else {
      throw new Error('Failed to initialize MCP');
    }
  }

  async testListTools() {
    console.log('\n🔍 Testing list_tools...');
    
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/list'
    };

    const response = await this.sendMessage(message);
    
    if (response.result && response.result.tools) {
      const tools = response.result.tools;
      const expectedTools = [
        'list_chats', 'get_chat_info', 'search_chats', 'get_messages',
        'send_message', 'search_messages', 'mark_as_read', 'get_user_info'
      ];
      
      const foundTools = tools.map(t => t.name);
      const allToolsFound = expectedTools.every(tool => foundTools.includes(tool));
      
      this.addResult('List Tools', allToolsFound, 
        `Found ${tools.length} tools: ${foundTools.join(', ')}`);
      
      console.log(`✅ Found ${tools.length} tools`);
    } else {
      this.addResult('List Tools', false, 'No tools returned');
    }
  }

  async testListChats() {
    console.log('\n💬 Testing list_chats...');
    
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'list_chats',
        arguments: { limit: 10 }
      }
    };

    const response = await this.sendMessage(message);
    
    if (response.result && response.result.content) {
      const content = response.result.content[0].text;
      const chatCount = (content.match(/•/g) || []).length;
      
      // Extract first chat ID for later tests
      const chatIdMatch = content.match(/ID: (-?\d+)/);
      if (chatIdMatch) {
        this.testChatId = chatIdMatch[1];
      }
      
      this.addResult('List Chats', chatCount > 0, 
        `Found ${chatCount} chats, test chat ID: ${this.testChatId}`);
      
      console.log(`✅ Found ${chatCount} chats`);
    } else {
      this.addResult('List Chats', false, 'Failed to list chats');
    }
  }

  async testSearchChats() {
    console.log('\n🔍 Testing search_chats...');
    
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'search_chats',
        arguments: { 
          query: 'test',
          limit: 5 
        }
      }
    };

    const response = await this.sendMessage(message);
    
    if (response.result && response.result.content) {
      const content = response.result.content[0].text;
      const success = content.includes('Found') && content.includes('chats matching');
      
      this.addResult('Search Chats', success, 
        success ? 'Search completed successfully' : 'Search failed');
      
      console.log(success ? '✅ Chat search working' : '❌ Chat search failed');
    } else {
      this.addResult('Search Chats', false, 'Search chats failed');
    }
  }

  async testGetChatInfo() {
    if (!this.testChatId) {
      this.addResult('Get Chat Info', false, 'No test chat ID available');
      return;
    }

    console.log('\n📋 Testing get_chat_info...');
    
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'get_chat_info',
        arguments: { chatId: this.testChatId }
      }
    };

    const response = await this.sendMessage(message);
    
    if (response.result && response.result.content) {
      const content = response.result.content[0].text;
      const success = content.includes('Chat Information') && content.includes('Title:');
      
      this.addResult('Get Chat Info', success, 
        success ? 'Chat info retrieved successfully' : 'Failed to get chat info');
      
      console.log(success ? '✅ Chat info retrieved' : '❌ Chat info failed');
    } else {
      this.addResult('Get Chat Info', false, 'Get chat info failed');
    }
  }

  async testGetMessages() {
    if (!this.testChatId) {
      this.addResult('Get Messages', false, 'No test chat ID available');
      return;
    }

    console.log('\n📨 Testing get_messages...');
    
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'get_messages',
        arguments: { 
          chatId: this.testChatId,
          limit: 5 
        }
      }
    };

    const response = await this.sendMessage(message);
    
    if (response.result && response.result.content) {
      const content = response.result.content[0].text;
      const success = content.includes('Messages from chat') && 
                     (content.includes('Message ') || content.includes('No messages'));
      
      // Extract user ID for later tests
      const userIdMatch = content.match(/← (-?\d+)/);
      if (userIdMatch) {
        this.testUserId = userIdMatch[1];
      }
      
      this.addResult('Get Messages', success, 
        success ? `Messages retrieved, test user ID: ${this.testUserId}` : 'Failed to get messages');
      
      console.log(success ? '✅ Messages retrieved' : '❌ Get messages failed');
    } else {
      this.addResult('Get Messages', false, 'Get messages failed');
    }
  }

  async testSendMessage() {
    if (!this.testChatId) {
      this.addResult('Send Message', false, 'No test chat ID available');
      return;
    }

    console.log('\n📤 Testing send_message...');
    
    const testMessage = `Test message from MCP server - ${new Date().toISOString()}`;
    
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'send_message',
        arguments: { 
          chatId: this.testChatId,
          text: testMessage
        }
      }
    };

    const response = await this.sendMessage(message);
    
    if (response.result && response.result.content) {
      const content = response.result.content[0].text;
      const success = content.includes('Message sent successfully') && content.includes('Message ID:');
      
      // Extract sent message ID for mark as read test
      const messageIdMatch = content.match(/Message ID:\*\* (\d+)/);
      if (messageIdMatch) {
        this.sentMessageId = parseInt(messageIdMatch[1]);
      }
      
      this.addResult('Send Message', success, 
        success ? `Message sent, ID: ${this.sentMessageId}` : 'Failed to send message');
      
      console.log(success ? '✅ Message sent successfully' : '❌ Send message failed');
    } else {
      this.addResult('Send Message', false, 'Send message failed');
    }
  }

  async testSearchMessages() {
    console.log('\n🔍 Testing search_messages...');
    
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'search_messages',
        arguments: { 
          query: 'test',
          limit: 5 
        }
      }
    };

    const response = await this.sendMessage(message);
    
    if (response.result && response.result.content) {
      const content = response.result.content[0].text;
      const success = content.includes('Search results for') && content.includes('Found');
      
      this.addResult('Search Messages', success, 
        success ? 'Message search completed' : 'Message search failed');
      
      console.log(success ? '✅ Message search working' : '❌ Message search failed');
    } else {
      this.addResult('Search Messages', false, 'Search messages failed');
    }
  }

  async testMarkAsRead() {
    if (!this.testChatId || !this.sentMessageId) {
      this.addResult('Mark As Read', false, 'No test chat ID or message ID available');
      return;
    }

    console.log('\n✅ Testing mark_as_read...');
    
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'mark_as_read',
        arguments: { 
          chatId: this.testChatId,
          messageIds: [this.sentMessageId]
        }
      }
    };

    const response = await this.sendMessage(message);
    
    if (response.result && response.result.content) {
      const content = response.result.content[0].text;
      const success = content.includes('Messages marked as read') && content.includes('Chat ID:');
      
      this.addResult('Mark As Read', success, 
        success ? 'Messages marked as read successfully' : 'Failed to mark messages as read');
      
      console.log(success ? '✅ Messages marked as read' : '❌ Mark as read failed');
    } else {
      this.addResult('Mark As Read', false, 'Mark as read failed');
    }
  }

  async testGetUserInfo() {
    if (!this.testUserId) {
      this.addResult('Get User Info', false, 'No test user ID available');
      return;
    }

    console.log('\n👤 Testing get_user_info...');
    
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'get_user_info',
        arguments: { userId: this.testUserId }
      }
    };

    const response = await this.sendMessage(message);
    
    if (response.result && response.result.content) {
      const content = response.result.content[0].text;
      const success = content.includes('User Information') && content.includes('Name:');
      
      this.addResult('Get User Info', success, 
        success ? 'User info retrieved successfully' : 'Failed to get user info');
      
      console.log(success ? '✅ User info retrieved' : '❌ Get user info failed');
    } else {
      this.addResult('Get User Info', false, 'Get user info failed');
    }
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      const messageStr = JSON.stringify(message) + '\n';
      let responseData = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 15000);

      const onData = (data) => {
        responseData += data.toString();
        
        // Try to parse complete JSON responses
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line.trim());
              if (response.id === message.id) {
                clearTimeout(timeout);
                this.serverProcess.stdout.off('data', onData);
                resolve(response);
                return;
              }
            } catch (e) {
              // Continue parsing
            }
          }
        }
      };

      this.serverProcess.stdout.on('data', onData);
      this.serverProcess.stdin.write(messageStr);
    });
  }

  addResult(testName, success, details) {
    this.testResults.push({
      test: testName,
      success,
      details,
      timestamp: new Date().toISOString()
    });
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)\n`);
    
    this.testResults.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.test}`);
      console.log(`   ${result.details}`);
      console.log('');
    });
    
    if (passed === total) {
      console.log('🎉 All tests passed! The Telegram MCP server is working correctly.');
    } else {
      console.log(`⚠️  ${total - passed} test(s) failed. Check the details above.`);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  cleanup() {
    if (this.serverProcess) {
      console.log('\n🧹 Cleaning up server process...');
      this.serverProcess.kill();
    }
  }
}

// Create test directory
await mkdir('test', { recursive: true }).catch(() => {});

// Run tests
const tester = new TelegramMCPTester();
tester.runAllTests().catch(console.error);
