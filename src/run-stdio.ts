import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server } from './server.js';
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server is running and connected via stdio.');
}
main().catch((error) => {
  console.error('Stdio server failed to start:', error);
  process.exit(1);
});
