import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'test/**',
        '**/*.test.ts',
        '**/*.d.ts',
        'vitest.config.ts',
      ],
      thresholds: {
        lines: 25,
        functions: 5,
        branches: 5,
        statements: 25,
      },
    },
    server: {
      deps: {
        external: [/node_modules\/@modelcontextprotocol\/sdk/],
      },
    },
  },
  // Resolve shared package
  resolve: {
    alias: {
      '@mcp/shared': path.resolve(__dirname, './shared/src/schema.ts'),
    },
  },
});
