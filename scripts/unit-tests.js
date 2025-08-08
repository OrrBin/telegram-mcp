#!/usr/bin/env node

import { spawn } from 'child_process';
import { config } from 'dotenv';

config();

class UnitTester {
  constructor() {
    this.serverProcess = null;
    this.messageId = 1;
  }

  async runTest(toolName, args = {}, description = '') {
    console.log(`\n🧪 Testing ${toolName}${description ? ': ' + description : ''}...`);
    
    try {
      const response = await this.callTool(toolName, args);
      
      if (response.error) {
        console.log(`❌ Error: ${response.error.message}`);
        return false;
      }
      
      if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log(`✅ Success: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
        return true;
      }
      
      console.log(`❌ Unexpected response format`);
      return false;
      
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
      return false;
    }
  }

  async callTool(name, args) {
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: { name, arguments: args }
    };

    return new Promise((resolve, reject) => {
      const messageStr = JSON.stringify(message) + '\n';
      let responseData = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Tool call timeout'));
      }, 30000);

      const onData = (data) => {
        responseData += data.toString();
        
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

  async startServer() {
    console.log('🚀 Starting MCP server for unit tests...');
    
    this.serverProcess = spawn('node', ['../dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    this.serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (process.env.NODE_ENV === 'development') {
        console.log('Server:', output.trim());
      }
    });

    // Initialize MCP
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const initResponse = await this.callTool('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'unit-test', version: '1.0.0' }
    });
    
    console.log('✅ Server initialized');
  }

  cleanup() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

// Individual test functions
async function testAllTools() {
  const tester = new UnitTester();
  
  try {
    await tester.startServer();
    
    const tests = [
      // Basic functionality tests
      ['list_chats', { limit: 5 }, 'with limit 5'],
      ['list_chats', { limit: 20 }, 'with limit 20'],
      
      // Search tests
      ['search_chats', { query: 'test' }, 'search for "test"'],
      ['search_chats', { query: 'group', limit: 3 }, 'search for "group" with limit'],
      
      // Message search tests
      ['search_messages', { query: 'hello' }, 'search for "hello"'],
      ['search_messages', { query: 'test', limit: 10 }, 'search for "test" with limit'],
      
      // Error handling tests
      ['get_chat_info', { chatId: '999999999' }, 'with invalid chat ID'],
      ['get_user_info', { userId: '999999999' }, 'with invalid user ID'],
      ['get_messages', { chatId: '999999999' }, 'with invalid chat ID'],
      
      // Parameter validation tests
      ['list_chats', { limit: 0 }, 'with zero limit (should handle gracefully)'],
      ['search_chats', { query: '' }, 'with empty query'],
      ['search_messages', { query: 'a' }, 'with single character query'],
    ];
    
    let passed = 0;
    let total = tests.length;
    
    for (const [tool, args, desc] of tests) {
      const success = await tester.runTest(tool, args, desc);
      if (success) passed++;
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 Unit Tests Complete: ${passed}/${total} passed`);
    
  } catch (error) {
    console.error('❌ Unit test suite failed:', error);
  } finally {
    tester.cleanup();
  }
}

// Run the tests
testAllTools();
