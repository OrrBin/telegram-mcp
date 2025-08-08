#!/usr/bin/env node

// Test MCP server functionality
import { spawn } from 'child_process';
import { config } from 'dotenv';

config();

async function testMCPServer() {
  console.log('Testing MCP Server...');
  
  // Check environment variables
  const requiredEnvVars = ['TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'TELEGRAM_PHONE'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ Environment variables are set');
  
  // Test MCP server startup
  const serverProcess = spawn('node', ['../dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
  });
  
  let serverOutput = '';
  let serverError = '';
  
  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });
  
  serverProcess.stderr.on('data', (data) => {
    serverError += data.toString();
    console.error('Server stderr:', data.toString());
  });
  
  // Send MCP initialization
  const initMessage = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  }) + '\n';
  
  serverProcess.stdin.write(initMessage);
  
  // Wait for response
  setTimeout(() => {
    console.log('Server output:', serverOutput);
    console.log('Server error:', serverError);
    
    // Test list tools
    const listToolsMessage = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    }) + '\n';
    
    serverProcess.stdin.write(listToolsMessage);
    
    setTimeout(() => {
      console.log('Final server output:', serverOutput);
      serverProcess.kill();
      
      if (serverOutput.includes('telegram')) {
        console.log('✅ MCP Server appears to be working correctly');
      } else {
        console.log('❌ MCP Server may have issues');
      }
    }, 2000);
  }, 2000);
}

testMCPServer();
