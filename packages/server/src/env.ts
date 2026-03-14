import { z } from 'zod';

/**
 * Environment variables schema for the MCP server
 * Validates required configuration at startup
 */
const ServerEnvSchema = z.object({
  /**
   * Path to the SQLite database file
   * @default 'database.db' in the src directory
   */
  DB_PATH: z.string().optional(),
  /**
   * Admin password for enabling dangerous tools
   * @default 'admin'
   */
  ADMIN_PASSWORD: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

/**
 * Validate and normalize environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
export function validateServerEnv(env: NodeJS.ProcessEnv): ServerEnv {
  const result = ServerEnvSchema.safeParse(env);

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
export function getServerEnv(): ServerEnv {
  const env = validateServerEnv(process.env);

  return {
    DB_PATH: env.DB_PATH,
    ADMIN_PASSWORD: env.ADMIN_PASSWORD ?? 'admin',
  };
}
