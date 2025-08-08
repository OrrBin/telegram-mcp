#!/usr/bin/env node

import { spawn } from 'child_process';
import { config } from 'dotenv';

config();

async function testSearchMessages() {
  console.log('Testing search_messages tool...');
  
  const serverProcess = spawn('node', ['../dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
  });
  
  let serverOutput = '';
  let serverError = '';
  
  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
    console.log('Server output:', data.toString());
  });
  
  serverProcess.stderr.on('data', (data) => {
    serverError += data.toString();
    console.error('Server stderr:', data.toString());
  });
  
  // Initialize MCP
  const initMessage = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  }) + '\n';
  
  serverProcess.stdin.write(initMessage);
  
  setTimeout(() => {
    // Test search_messages tool
    const searchMessage = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_messages',
        arguments: {
          query: 'hello',
          limit: 5
        }
      }
    }) + '\n';
    
    console.log('Sending search_messages request...');
    serverProcess.stdin.write(searchMessage);
    
    setTimeout(() => {
      console.log('Final output:', serverOutput);
      if (serverError) {
        console.log('Errors:', serverError);
      }
      serverProcess.kill();
    }, 10000); // Wait 10 seconds for response
  }, 2000);
}

testSearchMessages();
