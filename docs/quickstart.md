# Quick Start Guide

Get up and running with the MCP SQLite Server in minutes.

## Prerequisites

- **Node.js** 24.14.0 or higher
- **npm** (comes with Node.js)
- **LM Studio** (optional, for AI-powered features)

## Installation

```bash
# Clone and install dependencies
npm install

# Seed the database with sample data
npm run seed
```

## Quick Test

Verify everything works by running the test suite:

```bash
npm test
```

## Running the Server

### Development Mode (with hot reload)

```bash
npm run dev:server
```

### Production Mode

```bash
# Build first
npm run build

# Run the compiled server
npm run start:server
```

## Using the Interactive Client

The client provides a CLI interface to interact with the MCP server:

```bash
# Development mode
npm run dev:client

# Or production mode
npm run start:client
```

### Client Commands

Once in the client CLI:

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/tools` | List available MCP tools |
| `/resources` | List available resources |
| `/prompts` | List available prompts |
| `/ask <question>` | Generate SQL from natural language (requires LM Studio) |
| `/explain <result>` | Explain query results with AI (requires LM Studio) |
| `/schema` | Show database schema |
| `/call <tool> <args>` | Call a tool directly |
| `/quit` | Exit the client |

### Example Session

```bash
$ npm run dev:client

> @mcp/client dev
> tsx watch packages/client/src/cli.ts

MCP Client CLI - Type /help for commands

> /tools
Available tools:
  - listTables: List all tables
  - createTable: Create a new table
  - executeModification: Execute UPDATE operations
  - adminLogin: Enable admin features
  - addUser: Add a new user

> /call listTables {}
Tables: users, posts, comments

> /ask "Show me all users with Gmail emails"
-- Generated SQL:
SELECT * FROM users WHERE email LIKE '%@gmail.com';
```

## AI Integration (Optional)

To enable AI-powered SQL generation and explanations:

1. **Download LM Studio** from https://lmstudio.ai/
2. **Load a model** (any code-capable model works)
3. **Start the local server** in LM Studio (Server tab → Start Server, port 1234)
4. **Use AI features** in the client:

```bash
> /ask "Create a table for storing blog posts"
> /explain "<paste query results here>"
```

## Next Steps

- Read the [Architecture Guide](./architecture.md) to understand the system design
- Explore the [Tech Stack](./tech-stack.md) documentation
- Check [QWEN.md](../QWEN.md) for detailed API reference
