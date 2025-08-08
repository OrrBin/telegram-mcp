# Quick Setup Guide

## 1. Get Telegram API Credentials

1. Visit [https://my.telegram.org/apps](https://my.telegram.org/apps)
2. Log in with your phone number
3. Create a new application:
   - **App title**: `My MCP Server` (or any name you prefer)
   - **Short name**: `mcp-server` (or any short name)
   - **Platform**: `Desktop`
4. Copy your `api_id` and `api_hash`

## 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Fill in your `.env` file:
```env
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_PHONE=+1234567890
NODE_ENV=production
SESSION_DIR=./session
```

## 3. Install and Build

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## 4. Test Your Setup

```bash
# Run the setup test
npm run test-setup
```

This will:
- Check your environment variables
- Connect to Telegram (you'll be prompted for verification code)
- Test basic functionality
- Save your session for future use

## 5. Configure Claude Desktop

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "telegram": {
      "command": "node",
      "args": ["/full/path/to/telegram-mcp-server/dist/index.js"],
      "env": {
        "TELEGRAM_API_ID": "12345678",
        "TELEGRAM_API_HASH": "abcdef1234567890abcdef1234567890",
        "TELEGRAM_PHONE": "+1234567890"
      }
    }
  }
}
```

**Important**: Replace `/full/path/to/telegram-mcp-server/` with the actual absolute path to your project directory.

## 6. Restart Claude Desktop

After saving the configuration, restart Claude Desktop. You should see the Telegram tools available in your conversations.

## Usage Examples

Once configured, you can use natural language commands in Claude:

- "Show me my recent Telegram chats"
- "Get the last 10 messages from my chat with John"
- "Send a message to my family group saying 'Hello everyone!'"
- "Search for messages containing 'meeting'"
- "Get information about chat ID 12345"

## Troubleshooting

### Authentication Issues
- Make sure your API credentials are correct
- Verify your phone number includes the country code (e.g., +1234567890)
- Check that you can receive Telegram messages for the verification code

### Path Issues
- Use absolute paths in the Claude Desktop configuration
- Make sure Node.js is in your system PATH
- Verify the `dist/index.js` file exists after building

### Connection Problems
- Ensure you have a stable internet connection
- Try deleting the `session/` directory and re-authenticating
- Check that your API credentials haven't been revoked at https://my.telegram.org/apps
