#!/usr/bin/env node

import { spawn } from 'child_process';
import { config } from 'dotenv';

config();

class PerformanceTester {
  constructor() {
    this.serverProcess = null;
    this.messageId = 1;
    this.results = [];
  }

  async measureTool(toolName, args, iterations = 3) {
    console.log(`\n⏱️  Performance testing ${toolName} (${iterations} iterations)...`);
    
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        const response = await this.callTool(toolName, args);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (response.error) {
          console.log(`❌ Iteration ${i + 1}: Error - ${response.error.message}`);
          continue;
        }
        
        times.push(duration);
        console.log(`✅ Iteration ${i + 1}: ${duration}ms`);
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`❌ Iteration ${i + 1}: Exception - ${error.message}`);
      }
    }
    
    if (times.length > 0) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      this.results.push({
        tool: toolName,
        args: JSON.stringify(args),
        iterations: times.length,
        avgTime: avg,
        minTime: min,
        maxTime: max,
        times
      });
      
      console.log(`📊 ${toolName}: avg=${avg}ms, min=${min}ms, max=${max}ms`);
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
    console.log('🚀 Starting MCP server for performance tests...');
    
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
    console.log('✅ Server ready for performance testing');
  }

  printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE TEST RESULTS');
    console.log('='.repeat(80));
    
    // Sort by average time
    this.results.sort((a, b) => a.avgTime - b.avgTime);
    
    console.log('\n🏆 Performance Ranking (fastest to slowest):');
    console.log('-'.repeat(80));
    
    this.results.forEach((result, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      
      console.log(`${medal} ${rank}. ${result.tool}`);
      console.log(`     Args: ${result.args}`);
      console.log(`     Average: ${result.avgTime}ms (${result.iterations} runs)`);
      console.log(`     Range: ${result.minTime}ms - ${result.maxTime}ms`);
      
      // Performance rating
      let rating = '';
      if (result.avgTime < 1000) rating = '🚀 Excellent';
      else if (result.avgTime < 3000) rating = '✅ Good';
      else if (result.avgTime < 5000) rating = '⚠️  Acceptable';
      else rating = '🐌 Slow';
      
      console.log(`     Rating: ${rating}`);
      console.log('');
    });
    
    // Summary statistics
    const avgTimes = this.results.map(r => r.avgTime);
    const overallAvg = Math.round(avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length);
    const fastest = Math.min(...avgTimes);
    const slowest = Math.max(...avgTimes);
    
    console.log('📈 Summary Statistics:');
    console.log(`   Overall Average: ${overallAvg}ms`);
    console.log(`   Fastest Tool: ${fastest}ms`);
    console.log(`   Slowest Tool: ${slowest}ms`);
    console.log(`   Performance Spread: ${slowest - fastest}ms`);
    
    console.log('\n' + '='.repeat(80));
  }

  cleanup() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

async function runPerformanceTests() {
  const tester = new PerformanceTester();
  
  try {
    await tester.startServer();
    
    // Performance test scenarios
    const scenarios = [
      ['list_chats', { limit: 10 }, 5],
      ['list_chats', { limit: 50 }, 3],
      ['search_chats', { query: 'test' }, 5],
      ['search_messages', { query: 'hello', limit: 10 }, 3],
      ['search_messages', { query: 'test', limit: 5 }, 5],
    ];
    
    console.log(`🎯 Running ${scenarios.length} performance test scenarios...\n`);
    
    for (const [tool, args, iterations] of scenarios) {
      await tester.measureTool(tool, args, iterations);
      
      // Longer delay between different tools
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    tester.printResults();
    
  } catch (error) {
    console.error('❌ Performance test suite failed:', error);
  } finally {
    tester.cleanup();
  }
}

// Run performance tests
runPerformanceTests();
