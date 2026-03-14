import type { ResourceContent, TextContent } from '@mcp/shared';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDbConnection } from '../db.js';

const InputSchema = z.object({
  cursor: z.string().optional().describe('Pagination cursor.'),
});

export const listTablesHandler = async ({
  cursor,
}: z.infer<typeof InputSchema>): Promise<CallToolResult> => {
  const db = await getDbConnection();
  try {
    const tables = await db.all<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    const page = Number.parseInt(cursor ?? '0', 10);
    const pageSize = 5;
    const start = page * pageSize;
    const paginatedTables = tables.slice(start, start + pageSize);
    const nextCursor = start + pageSize < tables.length ? (page + 1).toString() : undefined;

    const content: (TextContent | ResourceContent)[] = [
      { type: 'text', text: `Found ${tables.length} tables:` },
      ...paginatedTables.map((t) => ({
        type: 'resource' as const,
        resource: {
          type: 'resource' as const,
          uri: `schema://table/${t.name}`,
          name: t.name,
          text: t.name,
        },
      })),
    ];

    return {
      content,
      nextCursor,
    };
  } finally {
    await db.close();
  }
};

export const listTablesDefinition = {
  title: 'List Tables',
  description: 'Lists all tables in the database.',
  inputSchema: InputSchema.shape,
};
