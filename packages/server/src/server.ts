import { EventEmitter } from 'node:events';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDbConnection } from './db.js';

// 1. Initialize the McpServer
export const server = new McpServer({
  name: 'sqlite-explorer-server-advanced',
  version: '1.0.0',
});

// Helper for internal access in tests/notifications
type InternalMcpServer = McpServer & {
  _registeredResourceTemplates: Map<string, any>;
  _registeredTools: Map<string, any>;
  _registeredPrompts: Map<string, any>;
};

const internalServer = server as unknown as InternalMcpServer;

// Local event bus
const localEvents = new EventEmitter();

// Track modification tools state
let modificationToolsEnabled = false;
const modificationToolRefs: { enable?: () => void; disable?: () => void }[] = [];

// Typed Notification helpers
export const notifyResourceListChanged = () => {
  const sdkServer = server.server;
  if (typeof (sdkServer as any).sendResourceListChanged === 'function') {
    (sdkServer as any).sendResourceListChanged();
  } else {
    localEvents.emit('resourceListChanged');
  }
};

export const onResourceListChanged = (listener: () => void) =>
  localEvents.on('resourceListChanged', listener);

export const notifyToolListChanged = () => {
  const sdkServer = (server as any).server as any;
  if (sdkServer && typeof sdkServer.sendToolListChanged === 'function') {
    sdkServer.sendToolListChanged();
  } else {
    localEvents.emit('toolListChanged');
  }
};

export const onToolListChanged = (listener: () => void) =>
  localEvents.on('toolListChanged', listener);

export const notifyResourceUpdated = (uri: string) => {
  const sdkServer = (server as any).server as any;
  const payload = { uri, title: `Resource updated: ${uri}` };
  if (sdkServer && typeof sdkServer.sendResourceUpdated === 'function') {
    sdkServer.sendResourceUpdated(payload);
  } else {
    localEvents.emit('resourceUpdated', payload);
  }
};

/**
 * Enable modification tools (called by adminLogin)
 */
export const enableModificationTools = () => {
  if (modificationToolsEnabled) return;
  modificationToolsEnabled = true;
  modificationToolRefs.forEach((ref) => {
    ref.enable?.();
  });
  notifyToolListChanged();
};

/**
 * Disable modification tools
 */
export const disableModificationTools = () => {
  if (!modificationToolsEnabled) return;
  modificationToolsEnabled = false;
  modificationToolRefs.forEach((ref) => {
    ref.disable?.();
  });
  notifyToolListChanged();
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
          return tables.map((t) => t.name).filter((name) => name.startsWith(value));
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

// Import tool handlers and definitions
import {
  addUserDefinition,
  addUserHandler,
  adminLoginDefinition,
  adminLoginHandler,
  createTableDefinition,
  createTableHandler,
  executeModificationDefinition,
  executeModificationHandler,
  listTablesDefinition,
  listTablesHandler,
} from './tools/index.js';

server.registerTool('listTables', listTablesDefinition, listTablesHandler);

server.registerTool('createTable', createTableDefinition, createTableHandler);

const modificationTool = server.registerTool(
  'executeModification',
  executeModificationDefinition,
  executeModificationHandler
);
modificationTool.disable();
modificationToolRefs.push(modificationTool);

server.registerTool('adminLogin', adminLoginDefinition, adminLoginHandler);

server.registerTool('addUser', addUserDefinition, async (args) =>
  addUserHandler(args, async (req, schema) => {
    const sdkServer = (server as any).server as any;
    return sdkServer.request(req, schema);
  })
);

// Export for tests
export { internalServer, localEvents };
