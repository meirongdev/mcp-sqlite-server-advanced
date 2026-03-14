# Technology Stack

This document outlines the core technologies and tools used in the MCP SQLite Server project.

## Core Technologies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Runtime** | Node.js | 24.14.0+ | JavaScript runtime environment |
| **Package Manager** | npm | Latest | Dependency management and workspace orchestration |
| **Language** | TypeScript | 5.9+ | Type-safe JavaScript superset |
| **MCP SDK** | @modelcontextprotocol/sdk | Latest | Model Context Protocol implementation |
| **Database** | SQLite | 3.x + `sqlite` wrapper | Embedded SQL database |
| **Validation** | Zod | Latest | Runtime type validation |
| **Testing** | Vitest | Latest | Fast unit and integration testing |
| **AI Integration** | LM Studio | Latest | Local LLM inference server |

## Architecture Packages

### @mcp/server

The MCP server implementation that exposes SQLite operations via the Model Context Protocol.

**Key Dependencies:**
- `@modelcontextprotocol/sdk` - MCP server primitives
- `sqlite` - Async SQLite wrapper
- `zod` - Input validation for tools

**Entry Points:**
- `stdio.ts` - Stdio transport for local CLI integration
- `http.ts` - HTTP transport for remote connections

### @mcp/client

The MCP client that connects to the server and provides AI-powered interactions.

**Key Dependencies:**
- `@modelcontextprotocol/sdk` - MCP client primitives
- `openai` - LM Studio API compatibility layer
- `zod` - Response validation

**Components:**
- `client.ts` - MCP connection wrapper
- `lmstudio.ts` - LM Studio API client
- `cli.ts` - Interactive command-line interface

### @mcp/shared

Shared types and utilities used across server and client packages.

**Contents:**
- TypeScript type definitions
- Common constants and configurations
- Shared validation schemas

## Development Tools

| Tool | Purpose |
|------|---------|
| **TypeScript** | Static type checking with strict mode |
| **Vitest** | Fast test execution with watch mode |
| **tsx** | TypeScript execution with hot reload |
| **Biome** | Code formatting and linting (via biome.json) |

## Project Configuration

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Workspace Structure

```json
{
  "workspaces": [
    "packages/server",
    "packages/client",
    "shared"
  ]
}
```

## Transport Protocols

### Stdio Transport

Used for local CLI integration. The server communicates via standard input/output streams.

```typescript
// Server side
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
const transport = new StdioServerTransport();
```

### HTTP Transport (SSE)

Used for remote connections. Implements Server-Sent Events for bidirectional communication.

```typescript
// Server side
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
const transport = new SSEServerTransport('/messages', res);
```

## Database Layer

SQLite is used as the embedded database engine with the following pattern:

```typescript
import { getDbConnection } from './db.js';

const db = await getDbConnection(readOnly?: boolean);
try {
  const results = await db.all('SELECT * FROM users');
  // Process results
} finally {
  await db.close(); // Critical: prevents file locks
}
```

## AI Integration Pattern

The LM Studio integration follows this pattern:

```typescript
import { LMStudioClient } from '@mcp/client';

const client = new LMStudioClient({
  baseUrl: 'http://localhost:1234/v1',
  model: 'local-model',
});

// Generate SQL from natural language
const sql = await client.generateSQL(
  'Find all active users',
  schemaContext
);
```

## Environment Variables

| Variable | Package | Description | Default |
|----------|---------|-------------|---------|
| `DB_PATH` | server | SQLite database file path | `packages/server/src/database.db` |
| `ADMIN_PASSWORD` | server | Admin authentication password | `admin` |
| `LM_STUDIO_URL` | client | LM Studio API endpoint | `http://localhost:1234/v1` |

## Build Pipeline

1. **Type Check**: `tsc --noEmit` validates all TypeScript files
2. **Build**: `tsc` compiles to `dist/` directories
3. **Test**: `vitest` runs test suite
4. **Package**: npm workspaces handle dependency resolution

## Code Quality

- **Strict TypeScript**: No `any` types, strict null checks enabled
- **ESM Only**: Native ES modules throughout
- **EditorConfig**: Consistent formatting (2-space indent, LF endings)
- **Project References**: TypeScript composite builds for fast incremental compilation
