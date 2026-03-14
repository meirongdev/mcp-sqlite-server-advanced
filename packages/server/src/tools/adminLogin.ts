import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getServerEnv } from '../env.js';
import { enableModificationTools } from '../server.js';

const InputSchema = z.object({
  password: z.string().describe('Admin password'),
});

const { ADMIN_PASSWORD } = getServerEnv();

export const adminLoginHandler = async ({
  password,
}: z.infer<typeof InputSchema>): Promise<CallToolResult> => {
  if (password !== ADMIN_PASSWORD) {
    return {
      content: [{ type: 'text', text: 'Invalid password.' }],
      isError: true,
    };
  }

  enableModificationTools();
  return {
    content: [{ type: 'text', text: 'Admin access granted. Modification tools are now enabled.' }],
  };
};

export const adminLoginDefinition = {
  title: 'Admin Login',
  description: 'Authenticates as admin to enable dangerous tools.',
  inputSchema: InputSchema.shape,
};
