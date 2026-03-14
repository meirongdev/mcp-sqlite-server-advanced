import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDbConnection } from '../db.js';
import { notifyResourceUpdated } from '../server.js';

const InputSchema = z.object({
  operation: z.enum(['UPDATE']),
  tableName: z.string(),
  set: z.string(),
  where: z.string(),
});

export const executeModificationHandler = async ({
  tableName,
  set,
  where,
}: z.infer<typeof InputSchema>): Promise<CallToolResult> => {
  const db = await getDbConnection(false);
  try {
    await db.run(`UPDATE ${tableName} SET ${set} WHERE ${where}`);
    notifyResourceUpdated(`schema://table/${tableName}`);
    return { content: [{ type: 'text', text: 'Update successful.' }] };
  } finally {
    await db.close();
  }
};

export const executeModificationDefinition = {
  title: 'Execute Modification',
  description: 'Performs UPDATE operations.',
  inputSchema: InputSchema.shape,
};
