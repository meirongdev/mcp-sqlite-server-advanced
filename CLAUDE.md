# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all workspace dependencies
npm install

# Build shared package first, then all workspaces
npm run build

# Type-check all packages (builds shared first)
npm run typecheck

# Run all tests
npm run test

# Run tests with coverage validation
npm run test:coverage

# Run tests for a single package
npm run test -w @mcp/server
npm run test -w @mcp/client

# Seed/reset the SQLite database
npm run seed

# Development (watch mode)
npm run dev:server     # stdio transport
npm run dev:client     # interactive CLI

# Alternative server transports (within server package)
npm run dev:stdio      # explicitly stdio
npm run dev:http       # Streamable HTTP on port 3000

# Clean all build artifacts
npm run clean
```

## Architecture

This is an **npm workspaces monorepo** with three packages:

```
shared/              # @mcp/shared — shared TypeScript types (must build first)
packages/
  server/            # @mcp/server — MCP server backed by SQLite
  client/            # @mcp/client — Interactive CLI + LM Studio integration
```

### Build order matters

`@mcp/shared` must be built before the other packages because both depend on it. The root `build` and `typecheck` scripts handle this automatically. When working on individual packages, build shared first: `npm run build -w @mcp/shared`.

### @mcp/server

The server registers MCP primitives in `packages/server/src/server.ts`:

- **Resources**: `schema://table/{tableName}` — returns SQL CREATE statements
- **Tools**: `listTables`, `createTable`, `adminLogin`, `addUser`, `executeModification`
- **Prompts**: `query-table` — constructs and executes SQL queries

`executeModification` is **disabled by default** and only enabled after `adminLogin` succeeds. The enable/disable mechanism uses `server.registerTool(...).disable()` and a ref array that `enableModificationTools()` / `disableModificationTools()` call.

The server runs in two transport modes:
- **stdio** (`src/stdio.ts`) — for Claude Desktop / MCP client connections
- **HTTP** (`src/http.ts`) — Streamable HTTP on `http://localhost:3000/mcp`, session-based

`src/db.ts` opens a fresh SQLite connection per operation (read-only by default; write mode for mutations). DB path defaults to `packages/server/src/database.db`, overridable via `DB_PATH`.

Each tool is defined in its own file under `src/tools/` and exports both a definition object and handler function, re-exported through `src/tools/index.ts`.

### @mcp/client

`packages/client/src/client.ts` — `MCPClient` class wrapping the MCP SDK's `Client`, connecting via stdio transport to a server process.

`packages/client/src/lmstudio.ts` — `LMStudioClient` calling LM Studio's OpenAI-compatible API at `http://localhost:1234/v1` for natural language → SQL and result explanation.

`packages/client/src/cli.ts` — interactive REPL entry point.

### TypeScript configuration

All packages use strict ESM (`"type": "module"`, `"module": "nodenext"`). Import paths in source must use `.js` extensions (resolved to `.ts` at compile time). The root `tsconfig.json` uses project references; each package has its own `tsconfig.json`.

The root `vitest.config.ts` aliases `@mcp/shared` directly to `shared/types.ts` for tests (bypassing the build step).

## Environment Variables

| Variable | Package | Default |
|----------|---------|---------|
| `DB_PATH` | server | `packages/server/src/database.db` |
| `ADMIN_PASSWORD` | server | `admin` |
| `LM_STUDIO_URL` | client | `http://localhost:1234/v1` |

## Claude Desktop Integration

```bash
claude mcp add sqlite-explorer -- npx tsx packages/server/src/stdio.ts
```
