Build, test, and lint commands

- Type-check / build (TypeScript):
  - npx tsc --noEmit  # fast type-checking without emitting
  - npx tsc            # perform full compile (honors tsconfig)
- Database seed/setup:
  - node setupDb.js   # creates src/database.db (used by setup script)
- Run / dev (quick):
  - npx ts-node src/server.ts  # note: ts-node ESM flags may be required; prefer building then running node
- Tests: none configured. There are no test scripts or test files; to run a single test add a test runner (jest/ava/mocha) and a package.json script.
- Lint: no linter configured. To add ESLint/Prettier, add devDependencies and scripts.

High-level architecture

- This repository implements an MCP-style server using the @modelcontextprotocol/sdk (see src/server.ts).
- Core pieces:
  - server (McpServer) — registered resources, prompts, and tools drive the behavior.
  - getDb helper — opens a sqlite3 Database per operation and exposes promise-friendly methods: all, run, close, instance.
  - Resource template: resources use the "schema://table/{tableName}" URI scheme for table schema resources.
  - Tools/Prompts: zod is used for input schemas (validation). Tools like listTables, createTable, executeModification encapsulate DB operations and return structured content/messages.
- DB file and seeding:
  - setupDb.js currently creates and populates src/database.db (avoid committing that file). server.ts prefers DB path from DB_PATH env var and defaults to src/database.db.
- Security pattern:
  - Potentially destructive tool (executeModification) is created disabled by default; adminLogin tool enables it at runtime. Client notifications (sendResourceListChanged, sendToolListChanged, sendResourceUpdated) inform clients of state changes.

Key conventions and repository-specific patterns

- Module system and types:
  - package.json is set to "type": "module" and tsconfig uses "module": "nodenext" and verbatimModuleSyntax; source files use ESM imports/exports.
  - A minimal ambient declaration lives at src/modelcontext.d.ts to satisfy @modelcontextprotocol/sdk types during local development (see that file if the SDK is missing types).

- Database usage convention:
  - Always use getDb() to open a DB for each operation and close it in a finally block. DB operations use promisified db.all and a custom run that resolves with {changes, lastID}.
  - For writable operations, call getDb(false) so OPEN_READWRITE|OPEN_CREATE flags are used.
  - Avoid keeping a long-lived shared sqlite handle in memory; current pattern opens/closes per request.

- Resource and URI conventions:
  - Resource URIs follow schema://table/{tableName}. Resource definitions must provide list and a handler that returns contents containing uri and text.
  - Templates provide a complete() implementation to power autocomplete for template variables.

- Tool lifecycle:
  - Tools that modify state may be disabled by default. Use a separate admin/auth tool (adminLogin) to enable them; when enabled, call server.server.sendToolListChanged() / sendResourceListChanged() to notify clients.

Files of interest (quick pointers)

- src/server.ts — main server implementation: resource/prompt/tool registration and DB access patterns.
- setupDb.js — seed script that creates src/database.db (synchronous sqlite3 usage).
- src/modelcontext.d.ts — ambient module declaration used to build without the SDK types installed.

Other AI assistant configs

- No CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, CONVENTIONS.md, or similar AI assistant config files were found; add them here if you rely on other assistants with repo-specific rules.

MCP servers

- This repo is itself an MCP server implementation. Would you like assistance configuring local MCP servers (e.g., automated test MCP server, or additional tooling integrations) for this project? If so, specify what to configure.

Summary

Created .github/copilot-instructions.md with repository-specific build/type-check commands, architecture summary, and key conventions (DB handling, resource URIs, tool lifecycle, SDK typing). Want any adjustments or extra coverage (e.g., recommended package.json scripts, ESLint config, or example run scripts)?
