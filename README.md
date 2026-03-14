# MCP SQLite Server - Advanced Learning Project

A monorepo project implementing a **Model Context Protocol (MCP) server** backed by SQLite, with an **MCP client** that integrates with LM Studio for AI-powered database interactions.

## Project Structure

```
mcp-sqlite-server-advanced/
├── packages/
│   ├── server/           # MCP Server package
│   └── client/           # MCP Client with LM Studio integration
├── shared/               # Shared types and utilities
└── test/                 # Integration tests
```

## Quick Start

### Requirements

- Node.js 24.14.0+ (managed via `.node-version` / `fnm`)
- npm
- [LM Studio](https://lmstudio.ai/) (optional, for AI features)

### Installation

```bash
# Install all workspace dependencies
npm install

# Seed the database
npm run seed
```

### Development

```bash
# Run server in watch mode
npm run dev:server

# Run client in watch mode (in another terminal)
npm run dev:client
```

### Building

```bash
# Type-check all packages
npm run typecheck

# Build all packages
npm run build
```

## Packages

### @mcp/server

The MCP server exposes SQLite database functionality:

**Resources:**
- `schema://table/{tableName}` - Table schema definitions

**Tools:**
- `listTables` - List all tables (paginated)
- `createTable` - Create new tables
- `executeModification` - UPDATE operations (disabled by default)
- `adminLogin` - Enable dangerous tools
- `addUser` - Add users with client-side elicitation

**Prompts:**
- `query-table` - Interactive SQL query builder

### @mcp/client

An interactive CLI client with LM Studio integration:

**Features:**
- Natural language to SQL conversion
- AI-powered query assistance
- Result explanation
- Schema exploration

**Usage:**

```bash
# Start the interactive CLI
npm run start:client
```

**Commands:**
- `/help` - Show help
- `/tools` - List available tools
- `/ask <question>` - Ask AI to generate SQL
- `/call <tool> <args>` - Call a tool directly
- `/quit` - Exit

## LM Studio Integration

The client integrates with [LM Studio](https://lmstudio.ai/) for local LLM-powered features:

1. **Download and install LM Studio**
2. **Load a model** (any code-capable model works well)
3. **Enable the local server** (Server tab → Start Server, port 1234)
4. **Run the client**: `npm run start:client`

The client will automatically detect LM Studio and enable AI features.

### Example Usage

```
🔍 > Show me all users with gmail email addresses

🤔 Processing...

💡 Response:

SELECT * FROM users WHERE email LIKE '%gmail%'
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│ MCP Client  │────▶│ LM Studio   │
│ (CLI/REPL)  │     │ + Prompts   │     │ (Local LLM) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ MCP Server  │
                    │ (SQLite)    │
                    └─────────────┘
```

## Scripts Reference

### Root Workspace

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run build` | Build all packages |
| `npm run typecheck` | Type-check all packages |
| `npm run test` | Run tests in all packages |
| `npm run test:coverage` | Run tests with coverage validation |
| `npm run seed` | Seed the database |
| `npm run clean` | Remove all build artifacts |

### Server Package

| Command | Description |
|---------|-------------|
| `npm run dev:server` | Run server in watch mode |
| `npm run start:server` | Run production server (stdio) |
| `npm run seed` | Seed/reset database |

### Client Package

| Command | Description |
|---------|-------------|
| `npm run dev:client` | Run client in watch mode |
| `npm run start:client` | Run interactive CLI |

## MCP Client Integration

### Claude Desktop

```bash
# Add to Claude's MCP configuration
claude mcp add sqlite-explorer -- npx tsx packages/server/src/stdio.ts
```

### Custom Integration

```typescript
import { MCPClient } from '@mcp/client';

const client = new MCPClient();
await client.connect('node', ['packages/server/dist/stdio.js']);

// List tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool('listTables', {});
```

## Environment Variables

| Variable | Package | Description | Default |
|----------|---------|-------------|---------|
| `DB_PATH` | server | Path to SQLite database | `packages/server/src/database.db` |
| `ADMIN_PASSWORD` | server | Admin authentication password | `admin` |
| `LM_STUDIO_URL` | client | LM Studio API base URL | `http://localhost:1234/v1` |

## Development Conventions

- **ESM**: All packages use ES Modules
- **TypeScript**: Strict mode with project references
- **Testing**: Vitest for unit and integration tests
- **Code Style**: 2-space indentation, LF line endings

## License

ISC
