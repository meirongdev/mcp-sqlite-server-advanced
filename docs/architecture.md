# Architecture Guide

This document describes the system architecture of the MCP SQLite Server project.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  CLI Client │  │  LM Studio   │  │  External MCP Clients  │ │
│  │  (@mcp/     │  │  (AI Layer)  │  │  (VS Code, etc.)       │ │
│  │   client)   │  │              │  │                        │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘ │
└─────────┼────────────────┼──────────────────────┼──────────────┘
          │                │                      │
          │  MCP Protocol  │  OpenAI API          │  MCP Protocol
          │  (stdio/SSE)   │  (HTTP)              │  (stdio/SSE)
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Server Layer                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  @mcp/server - MCP Server Implementation                │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │   │
│  │  │   Tools     │ │ Resources   │ │    Prompts      │   │   │
│  │  │  - list     │ │ - schema:// │ │  - query-table  │   │   │
│  │  │  - create   │ │ - table/{n} │ │                 │   │   │
│  │  │  - update   │ │             │ │                 │   │   │
│  │  │  - admin    │ │             │ │                 │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          │  SQL Queries
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database Layer                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SQLite Engine + sqlite (Node.js wrapper)               │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐             │   │
│  │  │  users    │ │  posts    │ │ comments  │             │   │
│  │  │  table    │ │  table    │ │  table    │             │   │
│  │  └───────────┘ └───────────┘ └───────────┘             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
mcp-sqlite-server-advanced/
├── packages/
│   ├── server/           # @mcp/server - MCP Server
│   │   ├── src/
│   │   │   ├── index.ts      # Main exports
│   │   │   ├── server.ts     # MCP server definition
│   │   │   ├── db.ts         # Database connection helper
│   │   │   ├── stdio.ts      # Stdio transport entry point
│   │   │   ├── http.ts       # HTTP/SSE transport entry point
│   │   │   ├── setupDb.ts    # Database seeding script
│   │   │   └── tools/        # Modular tool implementations
│   │   │       ├── index.ts
│   │   │       ├── listTables.ts
│   │   │       ├── createTable.ts
│   │   │       ├── executeModification.ts
│   │   │       ├── adminLogin.ts
│   │   │       └── addUser.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── client/           # @mcp/client - MCP Client
│       ├── src/
│       │   ├── index.ts      # Main exports
│       │   ├── client.ts     # MCP client wrapper
│       │   ├── lmstudio.ts   # LM Studio API client
│       │   ├── cli.ts        # Interactive CLI entry point
│       │   └── prompts/      # AI prompt templates
│       ├── package.json
│       └── tsconfig.json
│
├── shared/               # @mcp/shared - Common types
│   ├── types.ts
│   └── package.json
│
├── test/                 # Integration tests
├── docs/                 # Documentation
├── package.json          # Workspace root
└── tsconfig.json         # Base TypeScript config
```

## Component Responsibilities

### @mcp/server

**Purpose:** Expose SQLite operations via the Model Context Protocol.

**Responsibilities:**
- Implement MCP server protocol (tools, resources, prompts)
- Manage SQLite database connections
- Validate tool inputs with Zod schemas
- Handle transport layer (stdio or HTTP/SSE)
- Emit notifications for resource/tool changes

**Key Modules:**
- `server.ts` - MCP server definition and capability registration
- `db.ts` - Database connection pooling and lifecycle management
- `tools/*` - Individual tool handler implementations

### @mcp/client

**Purpose:** Connect to MCP servers and provide user-facing interfaces.

**Responsibilities:**
- Establish MCP connections (stdio or HTTP)
- Wrap MCP client functionality
- Integrate with LM Studio for AI features
- Provide interactive CLI interface
- Format and display query results

**Key Modules:**
- `client.ts` - MCP connection management wrapper
- `lmstudio.ts` - LM Studio OpenAI-compatible API client
- `cli.ts` - Interactive command-line interface

### @mcp/shared

**Purpose:** Share types and utilities across packages.

**Contents:**
- TypeScript interfaces for MCP messages
- Common type definitions
- Shared constants and configurations

## Data Flow

### Tool Execution Flow

```
User Request
    │
    ▼
┌─────────────────┐
│  MCP Client     │
│  (cli.ts)       │
└────────┬────────┘
         │ callTool('listTables', {})
         ▼
┌─────────────────┐
│  MCP Protocol   │
│  (stdio/SSE)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MCP Server     │
│  (server.ts)    │
└────────┬────────┘
         │ listTablesHandler(args)
         ▼
┌─────────────────┐
│  Tool Handler   │
│  (tools/*.ts)   │
└────────┬────────┘
         │ db.all('SELECT name FROM sqlite_master...')
         ▼
┌─────────────────┐
│  SQLite         │
│  Database       │
└────────┬────────┘
         │
         ▼
    Results flow back up the chain
```

### AI SQL Generation Flow

```
User: "Show all users with Gmail"
    │
    ▼
┌─────────────────┐
│  /ask command   │
│  (cli.ts)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Get Schema     │
│  Context        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LM Studio API  │
│  (lmstudio.ts)  │───HTTP───►  LM Studio
│  generateSQL()  │            (Local LLM)
└────────┬────────┘                │
         │                        │
         │◄───────────────────────┘
         │  SELECT * FROM users
         │  WHERE email LIKE '%@gmail.com'
         ▼
    Display to user
```

## Transport Protocols

### Stdio Transport

Used for local CLI integration where the server runs as a child process.

**Characteristics:**
- Bidirectional JSON-RPC over stdin/stdout
- Low latency (no network overhead)
- Simple process management
- Ideal for CLI and IDE integrations

**Implementation:**
```typescript
// Server
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
const transport = new StdioServerTransport();
await server.connect(transport);

// Client
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const transport = new StdioClientTransport({
  command: 'node',
  args: ['packages/server/dist/stdio.js'],
});
```

### HTTP/SSE Transport

Used for remote connections where the server runs as an HTTP service.

**Characteristics:**
- Server-Sent Events for server→client messages
- HTTP POST for client→server messages
- Supports multiple concurrent clients
- Suitable for web and cloud deployments

**Implementation:**
```typescript
// Server
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
const transport = new SSEServerTransport('/messages', res);
await server.connect(transport);
```

## Database Architecture

### Connection Pattern

```typescript
import { getDbConnection } from './db.js';

// Get connection (read-only or read-write)
const db = await getDbConnection(readOnly?: boolean);

try {
  // Query operations
  const rows = await db.all('SELECT * FROM users');
  
  // Write operations
  await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
  
  // Transaction operations
  await db.transaction(async () => {
    await db.run('UPDATE users SET active = 1');
    await db.run('DELETE FROM sessions WHERE expired = 1');
  });
} finally {
  // CRITICAL: Always close to prevent file locks
  await db.close();
}
```

### Schema Resources

Table schemas are exposed as MCP resources:

```
schema://table/{tableName}
```

**Features:**
- Dynamic resource list based on actual database tables
- Autocomplete support for table names
- Returns CREATE TABLE statement as resource content

## Notification System

The server emits notifications to keep clients synchronized:

```typescript
import { notifyResourceListChanged } from '@mcp/server';

// After schema changes (table created/dropped)
notifyResourceListChanged();

// After tool availability changes
notifyToolListChanged();

// When specific resource updates
notifyResourceUpdated('schema://table/users');
```

## Security Considerations

### Tool Permissions

Tools are categorized by risk level:

| Risk Level | Tools | Default State |
|------------|-------|---------------|
| Read-only | `listTables` | Enabled |
| Schema modification | `createTable` | Enabled |
| Data modification | `executeModification` | Disabled (requires admin) |
| Administrative | `adminLogin`, `addUser` | Enabled with authentication |

### Admin Authentication

```typescript
// Enable dangerous operations
await client.callTool('adminLogin', { password: 'admin' });

// Now dangerous tools are available
const result = await client.callTool('executeModification', {
  sql: 'UPDATE users SET active = 0'
});
```

## Testing Architecture

```
test/
├── server/
│   ├── tools.test.ts      # Tool handler tests
│   └── resources.test.ts  # Resource handler tests
├── client/
│   ├── client.test.ts     # MCP client tests
│   └── lmstudio.test.ts   # LM Studio integration tests
└── integration/
    └── e2e.test.ts        # End-to-end tests
```

**Test Runner:** Vitest with watch mode support

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Build Pipeline

```
┌─────────────────┐
│  Source Files   │
│  (packages/*/   │
│   src/*.ts)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Type Check     │
│  (tsc --noEmit) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Compile        │
│  (tsc)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Output         │
│  (packages/*/   │
│   dist/*.js)    │
└─────────────────┘
```

**Project References:** TypeScript composite builds enable fast incremental compilation across packages.

## Extension Points

### Adding a New Tool

1. Create handler in `packages/server/src/tools/myTool.ts`
2. Export definition from `packages/server/src/tools/index.ts`
3. Register in `packages/server/src/server.ts`

### Adding a New Prompt

1. Add template to `packages/client/src/prompts/index.ts`
2. Use via `/prompts` command in CLI

### Adding a New Resource

1. Implement resource handler in server
2. Register with `server.registerResource()`
3. Emit `notifyResourceListChanged()` on updates
