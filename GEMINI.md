# GEMINI.md - MCP SQLite Server Advanced Context

## Project Overview

`mcp-sqlite-server-advanced` is a **monorepo project** implementing a Model Context Protocol (MCP) server backed by SQLite, with an MCP client that integrates with LM Studio for AI-powered database interactions.

### Main Technologies

- **Runtime:** Node.js 24+ (ESM, managed via `fnm`)
- **Package Manager:** npm workspaces
- **Language:** TypeScript 5.9+ (strict mode, project references)
- **Protocol:** `@modelcontextprotocol/sdk`
- **Database:** SQLite (via `sqlite` wrapper for `sqlite3`)
- **Validation:** Zod
- **Testing:** Vitest
- **AI Integration:** LM Studio (OpenAI-compatible API)

### Project Structure

```
mcp-sqlite-server-advanced/
├── packages/
│   ├── server/           # @mcp/server - MCP Server implementation
│   │   ├── src/
│   │   │   ├── index.ts      # Main exports
│   │   │   ├── server.ts     # MCP server definition
│   │   │   ├── db.ts         # Database connection helper
│   │   │   ├── stdio.ts      # Stdio transport entry point
│   │   │   ├── http.ts       # HTTP transport entry point
│   │   │   ├── setupDb.ts    # Database seeding
│   │   │   └── tools/        # Modular tool implementations
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── client/           # @mcp/client - MCP Client with LM Studio
│       ├── src/
│       │   ├── index.ts      # Main exports
│       │   ├── client.ts     # MCP client wrapper
│       │   ├── lmstudio.ts   # LM Studio API client
│       │   ├── cli.ts        # Interactive CLI
│       │   └── prompts/      # AI prompt templates
│       ├── package.json
│       └── tsconfig.json
│
├── shared/               # @mcp/shared - Common types
│   ├── types.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docs/plan/            # Planning documents
├── test/                 # Integration tests
├── package.json          # Workspace root
└── tsconfig.json         # Base TypeScript config
```

---

## Building and Running

### Prerequisites

- Node.js 24.14.0+ (managed via `fnm`)
- npm
- LM Studio (optional, for AI features)

### Commands

#### Root Workspace

```bash
npm install                    # Install all dependencies
npm run build                  # Build all packages (shared first)
npm run typecheck              # Type-check all packages
npm run test                   # Run tests in all packages
npm run test:coverage          # Run tests with coverage validation
npm run seed                   # Seed the database
npm run clean                  # Remove all build artifacts
```

#### Development

```bash
npm run dev:server             # Run server in watch mode
npm run dev:client             # Run client in watch mode
```

#### Production

```bash
npm run start:server           # Run production server (stdio)
npm run start:client           # Run interactive CLI
```

---

## Development Conventions

### Code Style & Architecture

- **ESM:** Strict ES Modules (`"type": "module"`, `module: "nodenext"`)
- **TypeScript:** Strict type-checking, no `any` types, project references
- **Database:** Always use `getDbConnection()` and close in `finally` blocks
- **Validation:** All inputs validated with Zod schemas
- **File Structure:** Source in `src/`, build artifacts in `dist/`

### MCP Features

- **Resources:** `schema://table/{tableName}` - Table schemas
- **Prompts:** `query-table` - Interactive SQL builder
- **Tools:**
  - `listTables` - List tables (paginated)
  - `createTable` - Create tables (DDL)
  - `executeModification` - UPDATE operations (disabled by default)
  - `adminLogin` - Enable dangerous tools
  - `addUser` - Client-side elicitation demo

### Notifications

Use typed helpers in `packages/server/src/server.ts`:
- `notifyResourceListChanged()` - Schema changes
- `notifyToolListChanged()` - Tool availability changes
- `notifyResourceUpdated(uri)` - Specific resource updates

---

## LM Studio Integration

The client (`packages/client/src/lmstudio.ts`) connects to LM Studio's OpenAI-compatible API:

```typescript
const config: LMStudioConfig = {
  baseUrl: 'http://localhost:1234/v1',
  model: 'local-model',
  temperature: 0.7,
  maxTokens: 2048,
};
```

### Features

1. **Natural Language to SQL:** Convert questions to queries
2. **Query Assistance:** Schema-aware suggestions
3. **Result Explanation:** AI explains query results

---

## Key Files

| File | Purpose |
|------|---------|
| `package.json` | Workspace root configuration |
| `tsconfig.json` | Base TypeScript config with project references |
| `packages/server/src/server.ts` | MCP server definition |
| `packages/server/src/tools/*` | Individual tool implementations |
| `packages/client/src/cli.ts` | Interactive CLI entry point |
| `packages/client/src/lmstudio.ts` | LM Studio API integration |
| `shared/types.ts` | Shared type definitions |
| `docs/plan/reorganization-plan.md` | Architecture documentation |

---

## Environment Variables

| Variable | Package | Description | Default |
|----------|---------|-------------|---------|
| `DB_PATH` | server | SQLite database path | `packages/server/src/database.db` |
| `ADMIN_PASSWORD` | server | Admin password | `admin` |

---

## Testing

```bash
npm test                       # Run all tests
```

Test files are in `test/` directory. Integration tests verify server-client communication.
