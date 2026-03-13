import path from 'path';
import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk';
import { z } from 'zod';

const sqlite = sqlite3.verbose();

// 1. Initialize the McpServer
export const server = new McpServer({
  name: 'sqlite-explorer-server-advanced',
  version: '1.0.0',
  // 2. Declare Server Capabilities
  capabilities: {
    roots: {}, // Server requests roots from client
    prompts: { listChanged: true }, // Server provides prompts and sends notifications
    resources: { listChanged: true, subscribe: true }, // Server provides resources with notifications and subscriptions
    tools: { listChanged: true }, // Server provides tools and sends notifications
    elicitation: {}, // Server requests user input from client
  },
});

// 3. Create a Database Helper
export const getDb = (readOnly = true) => {
  // prefer environment override; default to a database file next to this module
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.db');
  const mode = readOnly
    ? sqlite.OPEN_READONLY
    : sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE;

  const db = new sqlite.Database(dbPath, mode, (err: Error | null) => {
    if (err) {
      // surface error early
      console.error(`Failed to open DB at ${dbPath}:`, err.message);
      throw err;
    }
  });

  const run = (sql: string, params: any[] = []) => {
    return new Promise<{ changes: number; lastID: number }>((resolve, reject) => {
      db.run(sql, params, function (err: Error | null) {
        if (err) return reject(err);
        // `this` is the Statement context provided by sqlite3
        const info: any = this as any;
        resolve({ changes: info?.changes ?? 0, lastID: info?.lastID ?? 0 });
      });
    });
  };

  return {
    all: promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>,
    run,
    close: promisify(db.close.bind(db)) as () => Promise<void>,
    instance: db,
  };
};

server.registerResource(
  'table-schema',
  new ResourceTemplate('schema://table/{tableName}', {
    list: async () => {
      const db = getDb();
      try {
        const tables = await db.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );
        return {
          resources: tables.map((t: { name: string }) => ({
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
    // The complete function provides autocomplete for template variables
    complete: {
      tableName: async (value: any) => {
        const db = getDb();
        try {
          const tables = await db.all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
          );
          return tables
            .map((t: { name: string }) => t.name)
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
    annotations: {
      audience: ['user', 'assistant'],
      priority: 0.8,
    },
  },
  async (uri: any, { tableName }: any) => {
    const db = getDb();
    try {
      const result = await db.all(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?",
        [tableName]
      );
      if (result.length === 0) {
        throw new Error(`Table '${tableName}' not found.`);
      }
      // SDK types require uri in content, even though spec says it's redundant
      return { contents: [{ uri: uri.href, text: result[0].sql }] };
    } finally {
      await db.close();
    }
  }
);

server.registerPrompt(
  'query-table',
  {
    title: 'Query Table',
    description: 'Helps construct a SQL query to retrieve data from a specific table.',
    argsSchema: {
      tableName: z.string().describe('The name of the table to query.'),
      columns: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of columns to select. If not provided, all columns will be selected.'
        ),
      filter: z
        .string()
        .optional()
        .describe('Optional WHERE clause to filter rows.'),
      limit: z
        .string()
        .optional()
        .describe('Maximum number of rows to return.'),
    },
  },
  async ({ tableName, columns, filter, limit }: any) => {
    const db = getDb();
    try {
      const columnList = columns || '*';
      let query = `SELECT ${columnList} FROM ${tableName}`;
      if (filter) {
        query += ` WHERE ${filter}`;
      }
      if (limit) {
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum <= 0) {
          throw new Error('Limit must be a positive number');
        }
        query += ` LIMIT ${limitNum}`;
      }
      const rows = await db.all(query);
      const tableInfo = await db.all(`PRAGMA table_info(${tableName})`);
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Query the ${tableName} table:\n\nTable Structure:\n${JSON.stringify(
                tableInfo,
                null,
                2
              )}\n\nSQL Query: ${query}\n\nResults:\n${JSON.stringify(
                rows,
                null,
                2
              )}`,
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
              text: `Error querying table ${tableName}: ${
                (err as Error).message
              }`,
            },
          },
        ],
      };
    } finally {
      await db.close();
    }
  }
);

server.registerTool(
  'listTables',
  {
    title: 'List Tables',
    description:
      'Lists all tables in the database, returning links to their schemas.',
    inputSchema: {
      cursor: z
        .string()
        .optional()
        .describe('The pagination cursor from a previous call.'),
    },
  },
  async ({ cursor }: any) => {
    const db = getDb();
    try {
      const tables = await db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      const page = parseInt(cursor ?? '0', 10);
      const pageSize = 2;
      const start = page * pageSize;
      const end = start + pageSize;
      const paginatedTables = tables.slice(start, end);
      const nextCursor =
        end < tables.length ? (page + 1).toString() : undefined;
      return {
        content: [
          { type: 'text', text: `Found ${tables.length} tables:` },
          ...paginatedTables.map((t: { name: string }) => ({
            type: 'resource' as const,
            resource: {
              type: 'resource',
              uri: `schema://table/${t.name}`, // URI matches our resource template
              name: t.name,
              description: `Schema for the '${t.name}' table.`,
              text: t.name,
            },
          })),
        ],
        nextCursor, // Signal to the client that more data is available
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing tables: ${(err as Error).message}`,
          },
        ],
        isError: true,
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
      columns: z
        .string()
        .describe('A comma-separated list of column definitions.'),
    },
  },
  async ({ tableName, columns }: any) => {
    const db = getDb(false); // Open in read-write mode
    try {
      await db.run(`CREATE TABLE ${tableName} (${columns})`);
      // Notify the client that the list of resources has changed
      server.server.sendResourceListChanged();
      return {
        content: [
          { type: 'text', text: `Table '${tableName}' created successfully.` },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating table '${tableName}': ${
              (err as Error).message
            }`,
          },
        ],
        isError: true,
      };
    } finally {
      await db.close();
    }
  }
);

const executeModificationTool = server.registerTool(
  'executeModification',
  {
    title: 'Execute Data Modification',
    description: `Executes an UPDATE operation. Example: operation: 'UPDATE', tableName: 'users', set: "name = 'new_name'", where: "id = 1".`,
    inputSchema: {
      operation: z.enum(['UPDATE']).describe('The modification operation to perform.'),
      tableName: z.string().describe('The name of the table to modify.'),
      set: z.string().optional().describe('The SET clause for UPDATEs.'),
      where: z.string().optional().describe('The WHERE clause for UPDATEs.'),
    },
  },
  async ({ operation, tableName, set, where }: any) => {
    const db = getDb(false);  // Not read-only
    try {
      if (operation === 'UPDATE') {
        if (!set || !where) {
          throw new Error('UPDATE operations require SET and WHERE clauses.');
        }
        await db.run(`UPDATE ${tableName} SET ${set} WHERE ${where}`);
        // Notify clients that this specific resource may have changed
        server.server.sendResourceUpdated({
          uri: `schema://table/${tableName}`,
          title: `Schema for ${tableName} (updated)`,
        });
      }
      await db.close();
      return {
        content: [
          {
            type: 'text',
            text: `Successfully executed ${operation} on table ${tableName}.`,
          },
        ],
      };
    } catch (err) {
      await db.close();
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${operation} on table ${tableName}: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);
// Initially, the dangerous tool is disabled
executeModificationTool.disable();
// A tool to "log in" and enable the modification tool
server.registerTool(
  'adminLogin',
  {
    title: 'Admin Login',
    description: 'Logs in as an admin to enable data modification tools.',
    inputSchema: { password: z.string() },
  },
  async ({ password }: any) => {
    // Security Note: In production, use environment variables or secure credential storage
    // This hardcoded password is for demonstration purposes only
    if (password === 'secret-password') {
      await executeModificationTool.enable();  // Enable the tool
      // Notify clients that the list of available tools has changed
      server.server.sendToolListChanged();
      // Advanced: Server requests information FROM the client
      server.server
        .request(
          {
            method: 'roots/list',
            params: {},
          },
          z.any()
        )
        .then((roots: any) => {
          console.log('Received roots from client:', roots.roots);
        });
      return {
        content: [
          {
            type: 'text',
            text: "Admin access granted. The 'executeModification' tool is now available.",
          },
        ],
      };
    }
    return {
      content: [{ type: 'text', text: 'Error: Invalid password.' }],
      isError: true,
    };
  }
);
