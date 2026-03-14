# QWEN.md - MCP SQLite Server Advanced

## Project Overview

A **monorepo project** implementing a Model Context Protocol (MCP) server backed by SQLite, with an MCP client that integrates with LM Studio for AI-powered database interactions.

### Architecture

```
mcp-sqlite-server-advanced/
├── packages/
│   ├── server/           # MCP Server (@mcp/server)
│   │   ├── src/
│   │   │   ├── index.ts      # Main exports
│   │   │   ├── server.ts     # MCP server definition
│   │   │   ├── db.ts         # Database connection helper
│   │   │   ├── stdio.ts      # Stdio transport entry
│   │   │   ├── http.ts       # HTTP transport entry
│   │   │   ├── setupDb.ts    # Database seeding
│   │   │   └── tools/        # Modular tool implementations
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── client/           # MCP Client (@mcp/client)
│       ├── src/
│       │   ├── index.ts      # Main exports
│       │   ├── client.ts     # MCP client wrapper
│       │   ├── lmstudio.ts   # LM Studio API client
│       │   ├── cli.ts        # Interactive CLI
│       │   └── prompts/      # AI prompt templates
│       ├── package.json
│       └── tsconfig.json
│
├── shared/               # Shared types (@mcp/shared)
│   ├── types.ts
│   └── package.json
│
├── test/                 # Integration tests
├── package.json          # Workspace root
└── tsconfig.json         # Base TypeScript config
```

### Core Technologies

| Category | Technology |
|----------|------------|
| Runtime | Node.js 24.14.0+ (ESM) |
| Package Manager | npm workspaces |
| Language | TypeScript 5.9+ (strict, project references) |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Database | SQLite via `sqlite` wrapper |
| Validation | Zod |
| Testing | Vitest |
| AI Integration | LM Studio (OpenAI-compatible API) |

---

## Building and Running

### Prerequisites

- Node.js 24.14.0+
- npm
- LM Studio (optional, for AI features)

### Installation

```bash
# Install all workspace dependencies
npm install
```

### Database Setup

```bash
# Seed the database (creates packages/server/src/database.db)
npm run seed
```

### Development

```bash
# Run server in watch mode
npm run dev:server

# Run client in watch mode (separate terminal)
npm run dev:client
```

### Testing

```bash
# Run all tests
npm test
```

### Building

```bash
# Type-check all packages
npm run typecheck

# Build all packages to dist/
npm run build
```

### Production

```bash
# Run server (stdio transport)
npm run start:server

# Run interactive client
npm run start:client
```

---

## MCP Server Capabilities (@mcp/server)

### Resources

| URI Pattern | Description |
|-------------|-------------|
| `schema://table/{tableName}` | Table schema (CREATE statement) |

**Features:**
- Autocomplete for table names via `complete()` handler
- Dynamic resource list via `list()` handler

### Prompts

| Name | Description |
|------|-------------|
| `query-table` | Interactive SQL query builder |

### Tools

| Tool | Description | Default |
|------|-------------|---------|
| `listTables` | List tables (paginated, 5/page) | ✅ Enabled |
| `createTable` | Create new table (DDL) | ✅ Enabled |
| `executeModification` | UPDATE operations | ❌ Disabled |
| `adminLogin` | Enable dangerous tools | ✅ Enabled |
| `addUser` | Add user with elicitation | ✅ Enabled |

### Notification Helpers

```typescript
import {
  notifyResourceListChanged,
  notifyToolListChanged,
  notifyResourceUpdated,
} from '@mcp/server';

// Call after schema changes
notifyResourceListChanged();

// Call when tool availability changes
notifyToolListChanged();

// Call when specific resource updates
notifyResourceUpdated('schema://table/users');
```

### Database Pattern

```typescript
import { getDbConnection } from '@mcp/server';

const db = await getDbConnection(readOnly?: boolean);
try {
  // db.all(), db.run(), etc.
} finally {
  await db.close(); // MUST close to prevent locks
}
```

---

## MCP Client Features (@mcp/client)

### LM Studio Integration

```typescript
import { LMStudioClient } from '@mcp/client';

const lmClient = new LMStudioClient({
  baseUrl: 'http://localhost:1234/v1',
  model: 'local-model',
  temperature: 0.7,
});

// Generate SQL from natural language
const sql = await lmClient.generateSQL(
  'Show all users with gmail email',
  schemaContext
);

// Explain query results
const explanation = await lmClient.explainResults(query, results);

// Health check
const available = await lmClient.healthCheck();
```

### MCP Client Wrapper

```typescript
import { MCPClient } from '@mcp/client';

const client = new MCPClient();

// Connect to server via stdio
await client.connect('node', ['packages/server/dist/stdio.js']);

// List capabilities
const tools = await client.listTools();
const resources = await client.listResources();
const prompts = await client.listPrompts();

// Call tools
const result = await client.callTool('listTables', {});

// Get prompts
const prompt = await client.getPrompt('query-table', { tableName: 'users' });

// Read resources
const schema = await client.readResource('schema://table/users');

// Cleanup
await client.disconnect();
```

### Interactive CLI

```bash
npm run start:client
```

**Commands:**
- `/help` - Show help
- `/tools` - List tools
- `/resources` - List resources
- `/prompts` - List prompts
- `/ask <question>` - AI SQL generation
- `/explain <result>` - AI result explanation
- `/schema` - Show schema context
- `/call <tool> <args>` - Direct tool call
- `/quit` - Exit

---

## Development Conventions

### Code Style

- **ESM Only**: `"type": "module"`, `module: "nodenext"`
- **Strict TypeScript**: No `any` types, strict null checks
- **Formatting**: 2-space indent, LF endings (see `.editorconfig`)
- **Validation**: All inputs validated with Zod

### Project Structure

- **Source**: `packages/*/src/` - TypeScript only
- **Build**: `packages/*/dist/` - Compiled output
- **Shared**: `shared/` - Common types
- **Tests**: `test/` - Integration tests

### Workspace Dependencies

```json
{
  "dependencies": {
    "@mcp/shared": "2.0.0"
  }
}
```

### TypeScript Project References

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "references": [
    { "path": "../../shared" }
  ]
}
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `package.json` | Workspace root configuration |
| `tsconfig.json` | Base TypeScript config |
| `packages/server/package.json` | Server package config |
| `packages/server/src/server.ts` | MCP server definition |
| `packages/server/src/tools/*` | Individual tool implementations |
| `packages/client/src/cli.ts` | Interactive CLI entry |
| `packages/client/src/lmstudio.ts` | LM Studio API client |
| `shared/types.ts` | Shared type definitions |

---

## Environment Variables

| Variable | Package | Description | Default |
|----------|---------|-------------|---------|
| `DB_PATH` | server | SQLite database path | `packages/server/src/database.db` |
| `ADMIN_PASSWORD` | server | Admin password | `admin` |
| `LM_STUDIO_URL` | client | LM Studio API URL | `http://localhost:1234/v1` |

---

## Testing

```bash
# Run all tests
npm test

# Test specific package
npm test -w @mcp/server
npm test -w @mcp/client
```

---

## Troubleshooting

### LM Studio Connection Issues

```
❌ LM Studio not available
```

**Solution:**
1. Download LM Studio from https://lmstudio.ai/
2. Load a model
3. Go to Server tab → Start Server (port 1234)

### Database Not Found

```
Error: ENOENT: no such file or directory
```

**Solution:**
```bash
npm run seed
```

### Workspace Resolution Issues

```bash
# Reinstall workspace dependencies
rm -rf node_modules packages/*/node_modules
npm install
```

---

## Common Tasks

### Add a New Tool

1. Create `packages/server/src/tools/myTool.ts`:
```typescript
import { z } from 'zod';
import { getDbConnection } from '../db.js';
import type { ToolResult } from '@mcp/shared';

const InputSchema = z.object({ /* ... */ });

export const myToolHandler = async (args: z.infer<typeof InputSchema>): Promise<ToolResult> => {
  // Implementation
};

export const myToolDefinition = {
  title: 'My Tool',
  description: 'Description',
  inputSchema: InputSchema.shape,
};
```

2. Export from `packages/server/src/tools/index.ts`

3. Register in `packages/server/src/server.ts`

### Add a New Prompt Template

1. Add to `packages/client/src/prompts/index.ts`:
```typescript
export const myPrompt: PromptTemplate = {
  name: 'my-prompt',
  description: 'Description',
  systemPrompt: 'System instructions...',
};
```

### Update Shared Types

1. Edit `shared/types.ts`
2. Rebuild: `npm run build`
