# MCP SQLite Server - Learning Project

This repository is a learning/example project that implements an MCP-style server backed by SQLite. It provides resources, prompts, and tools via the @modelcontextprotocol/sdk and demonstrates basic database operations and tool lifecycle management.

## Quick start

Requirements

- Node.js 18+ (recommended)
- npm

Install

1. npm install

Seed the database

- npm run seed
  - This runs `ts-node setupDb.ts` and creates `src/database.db` with example tables and rows.

Type-check / build

- npm run typecheck  # npx tsc --noEmit
- npm run build      # npx tsc

Run (development)

- npx ts-node src/server.ts

## What this repo contains

- src/server.ts — MCP server implementation. Registers:
  - Resource template: `schema://table/{tableName}`
  - Prompts: `query-table` (builds SQL query with validation via zod)
  - Tools: `listTables`, `createTable`, `executeModification` (disabled by default), `adminLogin` (enables modification tool)
- setupDb.ts — Seed script (TypeScript/ESM). Also kept: setupDb.js for compatibility.
- src/modelcontext.d.ts — Minimal ambient declarations to allow local builds without full SDK types.
- .github/copilot-instructions.md — Guidance for Copilot sessions working on this repo.

## Conventions

- ESM + TypeScript: package.json uses "type": "module" and tsconfig is set to "nodenext".
- DB access: use `getDb()` helper (opens per operation) and always close in finally blocks.
- Dangerous operations: tools that modify DB state are created disabled; enable via adminLogin at runtime.

## Next steps (recommended)

- Add stricter types for SDK types (install or author typings for @modelcontextprotocol/sdk).
- Replace `any` with precise types in src/server.ts where applicable.
- Add ESLint/Prettier and unit tests for tools and resource handlers.
- Consider better-sqlite3 for simpler sync API and performance in local tooling.

If you want, I can commit these files and create a git tag for this cleaned-up state. Or I can also open a PR-style commit with a descriptive message—tell me how you'd like to proceed.