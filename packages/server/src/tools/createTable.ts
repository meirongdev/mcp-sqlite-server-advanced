import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDbConnection } from '../db.js';
import { notifyResourceListChanged } from '../server.js';

const InputSchema = z.object({
  tableName: z.string().describe('The name of the new table.'),
  columns: z.string().describe('A comma-separated list of column definitions.'),
});

export const createTableHandler = async ({
  tableName,
  columns,
}: z.infer<typeof InputSchema>): Promise<CallToolResult> => {
  const db = await getDbConnection(false);
  try {
    await db.run(`CREATE TABLE ${tableName} (${columns})`);
    notifyResourceListChanged();
    return {
      content: [{ type: 'text', text: `Table '${tableName}' created successfully.` }],
    };
  } catch (err) {
    return {
      content: [
        { type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` },
      ],
      isError: true,
    };
  } finally {
    await db.close();
  }
};

export const createTableDefinition = {
  title: 'Create Table',
  description: 'Creates a new table in the database.',
  inputSchema: InputSchema.shape,
};
