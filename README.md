# Telegram MCP Server

A Model Context Protocol (MCP) server that provides full access to your personal Telegram account. This allows you to interact with your Telegram messages, chats, and contacts through MCP clients like Claude Desktop.

## Features

- **Full Account Access**: Access all your personal messages, chats, and channels
- **Message Management**: Read, send, and search messages across all conversations
- **Chat Operations**: List, search, and get information about chats, groups, and channels
- **User Information**: Get details about users and contacts
- **Real-time Operations**: Mark messages as read and perform live actions

## Prerequisites

1. **Telegram API Credentials**: You need to obtain API credentials from Telegram
2. **Node.js**: Version 18 or higher
3. **Your Phone Number**: The phone number associated with your Telegram account

## Setup Instructions

### 1. Get Telegram API Credentials

1. Go to [https://my.telegram.org/apps](https://my.telegram.org/apps)
2. Log in with your phone number
3. Create a new application:
   - App title: Choose any name (e.g., "My MCP Server")
   - Short name: Choose a short name (e.g., "mcp-server")
   - Platform: Choose "Desktop"
4. Note down your `api_id` and `api_hash`

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your credentials:
```env
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_PHONE=+1234567890
NODE_ENV=production
SESSION_DIR=./session
```

### 4. Build the Project

```bash
npm run build
```

### 5. First Run (Authentication)

The first time you run the server, you'll need to authenticate:

```bash
npm start
```

You'll be prompted to:
1. Enter the verification code sent to your Telegram app
2. If you have 2FA enabled, enter your password

The session will be saved locally, so you won't need to authenticate again.

## MCP Client Configuration

### Q CLI

For Amazon Q CLI, create or edit your MCP configuration file:

**macOS/Linux**: `~/.config/mcp/mcp.json`
**Windows**: `%APPDATA%\mcp\mcp.json`

```json
{
  "mcpServers": {
    "telegram": {
      "command": "node",
      "args": ["/Users/orrb/personal/workspace/telegram-mcp/dist/index.js"],
      "env": {
        "TELEGRAM_API_ID": "your_api_id",
        "TELEGRAM_API_HASH": "your_api_hash",
        "TELEGRAM_PHONE": "+1234567890"
      }
    }
  }
}
```

### Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "telegram": {
      "command": "node",
      "args": ["/path/to/telegram-mcp-server/dist/index.js"],
      "env": {
        "TELEGRAM_API_ID": "your_api_id",
        "TELEGRAM_API_HASH": "your_api_hash",
        "TELEGRAM_PHONE": "+1234567890"
      }
    }
  }
}
```

### Cline (VS Code Extension)

For Cline, add the MCP server to your VS Code settings or Cline configuration:

```json
{
  "cline.mcpServers": {
    "telegram": {
      "command": "node",
      "args": ["/path/to/telegram-mcp-server/dist/index.js"],
      "env": {
        "TELEGRAM_API_ID": "your_api_id",
        "TELEGRAM_API_HASH": "your_api_hash",
        "TELEGRAM_PHONE": "+1234567890"
      }
    }
  }
}
```

### Other MCP Clients

For other MCP clients, use:
- **Command**: `node`
- **Args**: `["/path/to/telegram-mcp-server/dist/index.js"]`
- **Environment Variables**: Set the Telegram credentials as shown above

## Available Tools

### Chat Management

#### `list_chats`
List all chats, groups, and channels you have access to.

**Parameters:**
- `limit` (optional): Number of chats to return (default: 50, max: 200)

#### `get_chat_info`
Get detailed information about a specific chat.

**Parameters:**
- `chatId`: The chat ID to get information for

#### `search_chats`
Search for chats by title or username.

**Parameters:**
- `query`: Search query to find chats by title
- `limit` (optional): Number of results to return (default: 20, max: 100)

### Message Operations

#### `get_messages`
Get recent messages from a specific chat.

**Parameters:**
- `chatId`: The chat ID to get messages from
- `limit` (optional): Number of messages to return (default: 20, max: 100)
- `fromMessageId` (optional): Get messages starting from this message ID

#### `send_message`
Send a text message to a chat.

**Parameters:**
- `chatId`: The chat ID to send the message to
- `text`: The message text to send
- `replyToMessageId` (optional): Message ID to reply to

#### `search_messages`
Search for messages across all chats or within a specific chat.

**Parameters:**
- `query`: Search query to find messages
- `chatId` (optional): Limit search to specific chat
- `limit` (optional): Number of results to return (default: 20, max: 100)

#### `mark_as_read`
Mark specific messages as read in a chat.

**Parameters:**
- `chatId`: The chat ID to mark messages as read
- `messageIds`: Array of message IDs to mark as read

### User Information

#### `get_user_info`
Get information about a specific user.

**Parameters:**
- `userId`: The user ID to get information for

## Usage Examples

Once configured with an MCP client like Claude Desktop, you can use natural language commands:

- "Show me my recent chats"
- "Get the last 10 messages from my chat with John"
- "Send a message to the Development group saying 'Meeting at 3 PM'"
- "Search for messages containing 'project deadline'"
- "Get information about chat ID 12345"

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building

```bash
npm run build
```

### Testing

```bash
# Test basic setup and Telegram connection
npm run test-setup

# Test MCP server functionality
npm run test-mcp
```

### Watching for Changes

```bash
npm run watch
```

## Security Notes

- Your session data is stored locally in the `session/` directory
- Never share your API credentials or session files
- The server only runs locally and doesn't send data to external services
- All communication happens directly between your machine and Telegram's servers

## Troubleshooting

### Authentication Issues

1. Make sure your API credentials are correct
2. Verify your phone number format includes country code (e.g., +1234567890)
3. Check that you can receive Telegram messages for the verification code

### Connection Problems

1. Ensure you have a stable internet connection
2. Try deleting the `session/` directory and re-authenticating
3. Check that your API credentials haven't been revoked

### MCP Client Issues

1. Verify the path to the built server (`dist/index.js`) is correct
2. Make sure Node.js is in your PATH
3. Check the MCP client logs for error messages

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
