#!/usr/bin/env node

import { spawn } from 'child_process';
import { config } from 'dotenv';

config();

class StressTester {
  constructor() {
    this.serverProcess = null;
    this.messageId = 1;
    this.activeRequests = 0;
    this.completedRequests = 0;
    this.failedRequests = 0;
    this.startTime = null;
  }

  async stressTest(toolName, args, concurrency = 5, totalRequests = 20) {
    console.log(`\n🔥 Stress testing ${toolName}:`);
    console.log(`   Concurrency: ${concurrency} parallel requests`);
    console.log(`   Total requests: ${totalRequests}`);
    
    this.startTime = Date.now();
    this.completedRequests = 0;
    this.failedRequests = 0;
    
    const promises = [];
    let requestsSent = 0;
    
    // Function to send a single request
    const sendRequest = async (requestId) => {
      this.activeRequests++;
      
      try {
        const response = await this.callTool(toolName, args);
        
        if (response.error) {
          this.failedRequests++;
          console.log(`❌ Request ${requestId}: ${response.error.message}`);
        } else {
          this.completedRequests++;
          if (this.completedRequests % 5 === 0) {
            console.log(`✅ Completed ${this.completedRequests}/${totalRequests} requests`);
          }
        }
      } catch (error) {
        this.failedRequests++;
        console.log(`❌ Request ${requestId}: ${error.message}`);
      } finally {
        this.activeRequests--;
      }
    };
    
    // Send requests with concurrency control
    while (requestsSent < totalRequests) {
      while (this.activeRequests < concurrency && requestsSent < totalRequests) {
        promises.push(sendRequest(requestsSent + 1));
        requestsSent++;
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait for all requests to complete
    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const successRate = ((this.completedRequests / totalRequests) * 100).toFixed(1);
    const requestsPerSecond = ((totalRequests / duration) * 1000).toFixed(2);
    
    console.log(`\n📊 Stress Test Results for ${toolName}:`);
    console.log(`   Total time: ${duration}ms`);
    console.log(`   Successful: ${this.completedRequests}/${totalRequests} (${successRate}%)`);
    console.log(`   Failed: ${this.failedRequests}`);
    console.log(`   Throughput: ${requestsPerSecond} requests/second`);
    
    return {
      tool: toolName,
      duration,
      successful: this.completedRequests,
      failed: this.failedRequests,
      successRate: parseFloat(successRate),
      throughput: parseFloat(requestsPerSecond)
    };
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
    console.log('🚀 Starting MCP server for stress tests...');
    
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

    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Server ready for stress testing');
  }

  cleanup() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

async function runStressTests() {
  const tester = new StressTester();
  const results = [];
  
  try {
    await tester.startServer();
    
    // Stress test scenarios
    const scenarios = [
      ['list_chats', { limit: 10 }, 3, 15],  // 3 concurrent, 15 total
      ['search_chats', { query: 'test' }, 2, 10],  // 2 concurrent, 10 total
      ['search_messages', { query: 'hello', limit: 5 }, 2, 8],  // 2 concurrent, 8 total
    ];
    
    console.log(`🎯 Running ${scenarios.length} stress test scenarios...\n`);
    
    for (const [tool, args, concurrency, totalRequests] of scenarios) {
      const result = await tester.stressTest(tool, args, concurrency, totalRequests);
      results.push(result);
      
      // Cool down between tests
      console.log('\n⏸️  Cooling down for 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('🔥 STRESS TEST SUMMARY');
    console.log('='.repeat(70));
    
    results.forEach(result => {
      console.log(`\n📊 ${result.tool}:`);
      console.log(`   Success Rate: ${result.successRate}%`);
      console.log(`   Throughput: ${result.throughput} req/sec`);
      console.log(`   Duration: ${result.duration}ms`);
      
      // Stress test rating
      let rating = '';
      if (result.successRate >= 95 && result.throughput >= 1) {
        rating = '🚀 Excellent - Handles stress well';
      } else if (result.successRate >= 80 && result.throughput >= 0.5) {
        rating = '✅ Good - Acceptable under stress';
      } else if (result.successRate >= 60) {
        rating = '⚠️  Fair - Some issues under stress';
      } else {
        rating = '❌ Poor - Struggles under stress';
      }
      
      console.log(`   Rating: ${rating}`);
    });
    
    const avgSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / results.length;
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
    
    console.log(`\n🎯 Overall Performance:`);
    console.log(`   Average Success Rate: ${avgSuccessRate.toFixed(1)}%`);
    console.log(`   Average Throughput: ${avgThroughput.toFixed(2)} req/sec`);
    
    if (avgSuccessRate >= 90) {
      console.log(`\n🎉 Excellent! The server handles concurrent requests very well.`);
    } else if (avgSuccessRate >= 75) {
      console.log(`\n✅ Good! The server handles moderate stress acceptably.`);
    } else {
      console.log(`\n⚠️  The server may need optimization for high-load scenarios.`);
    }
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('❌ Stress test suite failed:', error);
  } finally {
    tester.cleanup();
  }
}

// Run stress tests
runStressTests();
