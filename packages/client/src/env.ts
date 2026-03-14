import { z } from 'zod';

/**
 * Environment variables schema for the MCP client
 * Validates required configuration at startup
 */
const ClientEnvSchema = z.object({
  /**
   * LM Studio API base URL
   * @default 'http://localhost:1234/v1'
   */
  LM_STUDIO_URL: z.string().url().optional(),
  /**
   * Model name to use in LM Studio
   * @default 'local-model'
   */
  LM_STUDIO_MODEL: z.string().optional(),
});

export type ClientEnv = z.infer<typeof ClientEnvSchema>;

/**
 * Validate and normalize environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
export function validateClientEnv(env: NodeJS.ProcessEnv): ClientEnv {
  const result = ClientEnvSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

/**
 * Get validated environment variables with defaults
 */
export function getClientEnv(): ClientEnv {
  const env = validateClientEnv(process.env);

  return {
    LM_STUDIO_URL: env.LM_STUDIO_URL,
    LM_STUDIO_MODEL: env.LM_STUDIO_MODEL,
  };
}
