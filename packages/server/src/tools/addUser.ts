import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDbConnection } from '../db.js';
import { notifyResourceListChanged } from '../server.js';

const InputSchema = z.object({});

const UserInfoSchema = z.object({
  name: z.string(),
  email: z.string(),
});

export const addUserHandler = async (
  _args: Record<string, unknown>,
  requestHandler: (req: unknown, schema: z.ZodType) => Promise<unknown>
): Promise<CallToolResult> => {
  const userInfo = await requestHandler(
    {
      method: 'elicitation/create',
      params: {
        message: 'Please provide user info.',
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
      content: UserInfoSchema.optional(),
    })
  );

  const parsed = z
    .object({
      action: z.enum(['accept', 'reject']),
      content: UserInfoSchema.optional(),
    })
    .parse(userInfo);

  if (parsed.action !== 'accept' || !parsed.content) {
    return { content: [{ type: 'text', text: 'Cancelled.' }] };
  }

  const db = await getDbConnection(false);
  try {
    await db.run('INSERT INTO users (name, email) VALUES (?, ?)', [
      parsed.content.name,
      parsed.content.email,
    ]);
    notifyResourceListChanged();
    return { content: [{ type: 'text', text: `User ${parsed.content.name} added.` }] };
  } finally {
    await db.close();
  }
};

export const addUserDefinition = {
  title: 'Add User',
  description: 'Adds a new user by asking for their info.',
  inputSchema: InputSchema.shape,
};
