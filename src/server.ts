import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { open, type Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EventEmitter } from 'node:events';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Initialize the McpServer
export const server = new McpServer({
  name: 'sqlite-explorer-server-advanced',
  version: '1.0.0',
});

// Helper for internal access in tests/notifications
// Note: These are private in the SDK but needed for this advanced implementation
type InternalMcpServer = McpServer & {
  _registeredResourceTemplates: Map<string, any>;
  _registeredTools: Map<string, any>;
  _registeredPrompts: Map<string, any>;
};

const internalServer = server as unknown as InternalMcpServer;

// Local event bus
const localEvents = new EventEmitter();

// Typed Notification helpers
export const notifyResourceListChanged = () => {
  const sdkServer = server.server;
  if (typeof (sdkServer as any).sendResourceListChanged === 'function') {
    (sdkServer as any).sendResourceListChanged();
  } else {
    localEvents.emit('resourceListChanged');
  }
};

export const onResourceListChanged = (listener: () => void) => localEvents.on('resourceListChanged', listener);

export const notifyToolListChanged = () => {
  const sdkServer = (server as any).server as any;
  if (sdkServer && typeof sdkServer.sendToolListChanged === 'function') {
    sdkServer.sendToolListChanged();
  } else {
    localEvents.emit('toolListChanged');
  }
};

export const onToolListChanged = (listener: () => void) => localEvents.on('toolListChanged', listener);

export const notifyResourceUpdated = (uri: string) => {
  const sdkServer = (server as any).server as any;
  const payload = { uri, title: `Resource updated: ${uri}` };
  if (sdkServer && typeof sdkServer.sendResourceUpdated === 'function') {
    sdkServer.sendResourceUpdated(payload);
  } else {
    localEvents.emit('resourceUpdated', payload);
  }
};

// 3. Create a Database Helper using async/await and sqlite wrapper
export const getDbConnection = async (readOnly = true): Promise<Database> => {
  const dbPath = process.env['DB_PATH'] ?? path.join(__dirname, 'database.db');
  
  return open({
    filename: dbPath,
    driver: sqlite3.Database,
    mode: readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE),
  });
};

// --- Resources ---

server.registerResource(
  'table-schema',
  new ResourceTemplate('schema://table/{tableName}', {
    list: async () => {
      const db = await getDbConnection();
      try {
        const tables = await db.all<{ name: string }[]>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );
        return {
          resources: tables.map((t) => ({
            uri: `schema://table/${t.name}`,
            name: t.name,
            title: `Schema for ${t.name}`,
            description: `The SQL CREATE statement for the '${t.name}' table.`,
            mimeType: 'application/sql',
          })),
        };
      } finally {
        await db.close();
      }
    },
    complete: {
      tableName: async (value: string) => {
        const db = await getDbConnection();
        try {
          const tables = await db.all<{ name: string }[]>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
          );
          return tables
            .map((t) => t.name)
            .filter((name) => name.startsWith(value));
        } finally {
          await db.close();
        }
      },
    },
  }),
  {
    title: 'Table Schema',
    description: 'Returns the SQL CREATE statement for a specific table.',
  },
  async (uri, { tableName }) => {
    const db = await getDbConnection();
    try {
      const result = await db.get<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?",
        [tableName]
      );
      if (!result) {
        throw new Error(`Table '${tableName}' not found.`);
      }
      return { contents: [{ uri: uri.href, text: result.sql }] };
    } finally {
      await db.close();
    }
  }
);

// --- Prompts ---

const QueryTableSchema = z.object({
  tableName: z.string().describe('The name of the table to query.'),
  columns: z.string().optional().describe('Comma-separated list of columns to select.'),
  filter: z.string().optional().describe('Optional WHERE clause to filter rows.'),
  limit: z.string().optional().describe('Maximum number of rows to return.'),
});

server.registerPrompt(
  'query-table',
  {
    title: 'Query Table',
    description: 'Helps construct a SQL query to retrieve data from a specific table.',
    argsSchema: QueryTableSchema.shape,
  },
  async ({ tableName, columns, filter, limit }) => {
    const db = await getDbConnection();
    try {
      const columnList = columns ?? '*';
      let query = `SELECT ${columnList} FROM ${tableName}`;
      if (filter) query += ` WHERE ${filter}`;
      
      if (limit) {
        const limitNum = Number.parseInt(limit, 10);
        if (Number.isNaN(limitNum) || limitNum <= 0) {
          throw new Error('Limit must be a positive number');
        }
        query += ` LIMIT ${limitNum}`;
      }

      const [rows, tableInfo] = await Promise.all([
        db.all(query),
        db.all(`PRAGMA table_info(${tableName})`),
      ]);

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Query the ${tableName} table:\n\nTable Structure:\n${JSON.stringify(tableInfo, null, 2)}\n\nSQL Query: ${query}\n\nResults:\n${JSON.stringify(rows, null, 2)}`,
            },
          },
        ],
      };
    } catch (err) {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Error querying table ${tableName}: ${err instanceof Error ? err.message : String(err)}`,
            },
          },
        ],
      };
    } finally {
      await db.close();
    }
  }
);

// --- Tools ---

server.registerTool(
  'listTables',
  {
    title: 'List Tables',
    description: 'Lists all tables in the database.',
    inputSchema: {
      cursor: z.string().optional().describe('Pagination cursor.'),
    },
  },
  async ({ cursor }) => {
    const db = await getDbConnection();
    try {
      const tables = await db.all<{ name: string }[]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      const page = Number.parseInt(cursor ?? '0', 10);
      const pageSize = 5;
      const start = page * pageSize;
      const paginatedTables = tables.slice(start, start + pageSize);
      const nextCursor = (start + pageSize) < tables.length ? (page + 1).toString() : undefined;

      return {
        content: [
          { type: 'text', text: `Found ${tables.length} tables:` },
          ...paginatedTables.map((t) => ({
            type: 'resource' as const,
            resource: {
              type: 'resource',
              uri: `schema://table/${t.name}`,
              name: t.name,
              text: t.name,
            },
          })),
        ],
        nextCursor,
      };
    } finally {
      await db.close();
    }
  }
);

server.registerTool(
  'createTable',
  {
    title: 'Create Table',
    description: 'Creates a new table in the database.',
    inputSchema: {
      tableName: z.string().describe('The name of the new table.'),
      columns: z.string().describe('A comma-separated list of column definitions.'),
    },
  },
  async ({ tableName, columns }) => {
    const db = await getDbConnection(false);
    try {
      await db.run(`CREATE TABLE ${tableName} (${columns})`);
      notifyResourceListChanged();
      return {
        content: [{ type: 'text', text: `Table '${tableName}' created successfully.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    } finally {
      await db.close();
    }
  }
);

const modificationTool = server.registerTool(
  'executeModification',
  {
    title: 'Execute Modification',
    description: 'Performs UPDATE operations.',
    inputSchema: {
      operation: z.enum(['UPDATE']),
      tableName: z.string(),
      set: z.string(),
      where: z.string(),
    },
  },
  async ({ tableName, set, where }) => {
    const db = await getDbConnection(false);
    try {
      await db.run(`UPDATE ${tableName} SET ${set} WHERE ${where}`);
      notifyResourceUpdated(`schema://table/${tableName}`);
      return { content: [{ type: 'text', text: 'Update successful.' }] };
    } finally {
      await db.close();
    }
  }
);
modificationTool.disable();

server.registerTool(
  'addUser',
  {
    title: 'Add User',
    description: 'Adds a new user by asking for their info.',
    inputSchema: z.object({}).shape,
  },
  async () => {
    const userInfo = await (server as any).server.request(
      {
        method: 'elicitation/create',
        params: {
          message: "Please provide user info.",
          requestedSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['name', 'email'],
          },
        },
      },
      z.object({
        action: z.enum(['accept', 'reject']),
        content: z.object({
          name: z.string(),
          email: z.string(),
        }).optional(),
      })
    );

    if (userInfo.action !== 'accept' || !userInfo.content) {
      return { content: [{ type: 'text', text: 'Cancelled.' }] };
    }

    const db = await getDbConnection(false);
    try {
      await db.run('INSERT INTO users (name, email) VALUES (?, ?)', [
        userInfo.content.name,
        userInfo.content.email,
      ]);
      notifyResourceListChanged();
      return { content: [{ type: 'text', text: `User ${userInfo.content.name} added.` }] };
    } finally {
      await db.close();
    }
  }
);
