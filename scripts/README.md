# Telegram MCP Server Test Suite

This directory contains comprehensive tests for all tools and functionality of the Telegram MCP server.

## Test Files Overview

### 1. `test-all-tools.js` - Comprehensive Integration Tests
**Purpose**: End-to-end testing of all available tools with real data flow
**Features**:
- Tests all 8 MCP tools in sequence
- Uses real chat/user IDs extracted from previous tests
- Validates complete workflows (e.g., send message → mark as read)
- Provides detailed success/failure reporting

**Run with**: `npm run test-all`

### 2. `unit-tests.js` - Individual Tool Testing
**Purpose**: Isolated testing of each tool with various parameter combinations
**Features**:
- Tests each tool independently
- Includes error handling scenarios
- Parameter validation testing
- Edge case handling

**Run with**: `npm run test-unit`

### 3. `performance-tests.js` - Performance Benchmarking
**Purpose**: Measures response times and performance characteristics
**Features**:
- Multiple iterations per tool
- Average, min, max response times
- Performance ranking
- Performance ratings (Excellent/Good/Acceptable/Slow)

**Run with**: `npm run test-performance`

### 4. `stress-tests.js` - Concurrent Load Testing
**Purpose**: Tests server behavior under concurrent request load
**Features**:
- Configurable concurrency levels
- Success rate measurement
- Throughput calculation (requests/second)
- Stress resistance evaluation

**Run with**: `npm run test-stress`

## Available Tools Tested

### Chat Management Tools
1. **`list_chats`** - List all accessible chats, groups, and channels
   - Parameters: `limit` (optional, default: 50, max: 200)
   - Tests: Various limits, edge cases

2. **`get_chat_info`** - Get detailed information about a specific chat
   - Parameters: `chatId` (required)
   - Tests: Valid/invalid chat IDs, error handling

3. **`search_chats`** - Search for chats by title or username
   - Parameters: `query` (required), `limit` (optional, default: 20, max: 100)
   - Tests: Various search terms, empty queries, limits

### Message Operations
4. **`get_messages`** - Retrieve recent messages from a chat
   - Parameters: `chatId` (required), `limit` (optional, default: 20, max: 100), `fromMessageId` (optional)
   - Tests: Valid/invalid chats, different limits, pagination

5. **`send_message`** - Send a text message to a chat
   - Parameters: `chatId` (required), `text` (required), `replyToMessageId` (optional)
   - Tests: Message sending, reply functionality, error cases

6. **`search_messages`** - Search for messages across chats
   - Parameters: `query` (required), `chatId` (optional), `limit` (optional, default: 20, max: 100)
   - Tests: Global search, chat-specific search, various queries

7. **`mark_as_read`** - Mark specific messages as read
   - Parameters: `chatId` (required), `messageIds` (required array)
   - Tests: Single/multiple messages, invalid IDs

### User Information
8. **`get_user_info`** - Get information about a specific user
   - Parameters: `userId` (required)
   - Tests: Valid/invalid user IDs, bot vs user accounts

## Test Execution Guide

### Prerequisites
1. **Environment Setup**: Ensure `.env` file is configured with valid Telegram credentials
2. **Build Project**: Run `npm run build` before testing
3. **Active Telegram Account**: Tests require a working Telegram connection

### Running Tests

#### Quick Test Suite (Recommended)
```bash
npm run test-suite
```
Runs: setup validation → unit tests → performance tests

#### Individual Test Categories
```bash
# Basic setup validation
npm run test-setup

# Comprehensive integration tests
npm run test-all

# Individual tool testing
npm run test-unit

# Performance benchmarking
npm run test-performance

# Stress/load testing
npm run test-stress
```

### Test Output Examples

#### Successful Test Output
```
✅ List Chats: Found 15 chats, test chat ID: -1001234567890
✅ Send Message: Message sent, ID: 12345
✅ Search Messages: Message search completed
📊 Overall: 8/8 tests passed (100%)
```

#### Performance Test Output
```
🏆 Performance Ranking:
🥇 1. list_chats (avg: 850ms) 🚀 Excellent
🥈 2. search_chats (avg: 1200ms) ✅ Good
🥉 3. search_messages (avg: 2100ms) ✅ Good
```

#### Stress Test Output
```
🔥 Stress testing list_chats:
   Concurrency: 3 parallel requests
   Total requests: 15
✅ Completed 15/15 requests
📊 Success Rate: 100.0%
📊 Throughput: 2.45 requests/second
```

## Test Configuration

### Customizing Tests
You can modify test parameters in each file:

```javascript
// In performance-tests.js
const scenarios = [
  ['list_chats', { limit: 10 }, 5],  // tool, args, iterations
  ['search_messages', { query: 'test' }, 3],
];

// In stress-tests.js
const scenarios = [
  ['list_chats', { limit: 10 }, 3, 15],  // tool, args, concurrency, total
];
```

### Environment Variables for Testing
```env
# Required for all tests
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_PHONE=+1234567890

# Optional for verbose testing
NODE_ENV=development  # Shows detailed server logs
```

## Troubleshooting Tests

### Common Issues

1. **"Missing environment variables"**
   - Ensure `.env` file exists with valid Telegram credentials
   - Check that all required variables are set

2. **"Tool call timeout"**
   - Telegram connection may be slow
   - Increase timeout values in test files
   - Check internet connection

3. **"No test chat ID available"**
   - Some tests depend on previous test results
   - Run `test-all` for complete workflow testing
   - Ensure you have accessible chats in your Telegram account

4. **Authentication prompts during tests**
   - First run may require Telegram verification code
   - Session is saved for subsequent runs
   - Run `npm run test-setup` first for initial authentication

### Test Data Requirements

For comprehensive testing, your Telegram account should have:
- At least a few chats/groups (for list_chats, search_chats)
- Some message history (for get_messages, search_messages)
- Ability to send messages (for send_message, mark_as_read)

## Contributing to Tests

When adding new tools or modifying existing ones:

1. **Add tool tests** to `test-all-tools.js`
2. **Add unit tests** to `unit-tests.js`
3. **Add performance scenarios** to `performance-tests.js`
4. **Update this README** with new tool documentation

### Test Writing Guidelines

- Always test both success and error cases
- Include parameter validation tests
- Test with realistic data when possible
- Provide clear success/failure messages
- Handle timeouts gracefully
- Clean up test data when possible
