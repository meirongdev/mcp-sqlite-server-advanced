# GEMINI.md - MCP SQLite Server Advanced Context

## Project Overview
`mcp-sqlite-server-advanced` is a learning-focused implementation of a Model Context Protocol (MCP) server backed by SQLite. It demonstrates advanced MCP features such as resource templates, dynamic tool management, and client-side input elicitation.

### Main Technologies
- **Runtime:** Node.js (ESM)
- **Language:** TypeScript (configured for 2026 standards)
- **Protocol:** [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)
- **Database:** SQLite (via `sqlite` wrapper for `sqlite3` providing Promise-based API)
- **Validation:** Zod
- **Testing:** Vitest

### Key Components
- **`src/server.ts`**: The core MCP server implementation, defining resources, prompts, and tools.
- **`src/setupDb.ts`**: Database initialization and seeding script (Promise-based).
- **`src/database.db`**: The SQLite database file (generated after seeding).
- **`test/server.test.ts`**: Unit tests for server registration and configuration.
- **`vitest.config.ts`**: Configuration for the Vitest test runner.

---

## Building and Running

### Prerequisites
- Node.js 24+ (Latest LTS recommended, managed via `fnm`)
- npm

### Commands
- **Install Dependencies:** `npm install`
- **Seed Database:** `npm run seed` (Runs `tsx src/setupDb.ts` to create/reset `src/database.db`)
- **Run (Development):** `npm run dev` (Runs `tsx watch src/server.ts` for live reloading)
- **Test:** `npm test` (Runs unit tests with `vitest`)
- **Type-Check:** `npm run typecheck`
- **Build:** `npm run build` (Compiles TypeScript to `dist/`)
- **Run (Production):** `npm run start` (Runs the compiled server from `dist/`)

---

## Development Conventions

### Code Style & Architecture
- **ESM:** The project is strictly ES Module based (`"type": "module"`).
- **TypeScript:** Strict type-checking enabled via `tsconfig.json` (`nodenext`). No `any` types allowed.
- **Database Helper:** Always use `getDbConnection(readOnly?: boolean)` in `src/server.ts` which returns a Promise-based `Database` object.
- **Lifecycle Management:** Database connections **MUST** be closed in `finally` blocks to prevent locks.
- **Validation:** All tool and prompt inputs are validated using `zod` schemas.
- **File Structure:** Source code lives in `src/`. Build artifacts go to `dist/`. Generated files (`.js`, `.d.ts`, `.map`) are excluded from `src/` via `.gitignore`.

### MCP Features
- **Resources:** Exposes table schemas via the `schema://table/{tableName}` URI template.
- **Prompts:** Includes `query-table` for interactive SQL construction.
- **Tools:**
    - `listTables`: Lists available tables.
    - `createTable`: Standard DDL operation.
    - `executeModification`: Update operations (Disabled by default).
    - `adminLogin`: Enables dangerous tools like `executeModification`.
    - `addUser`: Demonstrates `elicitation/create` to request user input from the client.

### Notifications
The server implements typed helper functions (`notifyResourceListChanged`, `notifyToolListChanged`, etc.) to inform clients of state changes. These should be used whenever the database schema or tool availability changes.

---

## Key Files
- `package.json`: Project metadata and scripts.
- `tsconfig.json`: TypeScript compiler configuration.
- `vitest.config.ts`: Test runner configuration.
- `src/server.ts`: Entry point and MCP logic.
- `src/setupDb.ts`: Database schema definition and seeding.
- `test/server.test.ts`: Server verification tests.
- `README.md`: Public documentation.
