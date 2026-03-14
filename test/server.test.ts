import { describe, expect, it } from 'vitest';
import { server } from '../packages/server/src/server.js';

describe('MCP Server Registration', () => {
  it('should have the correct name and version', () => {
    // Note: accessing internal properties for verification in this demo context
    const serverInfo = (server as any).server._serverInfo;
    expect(serverInfo.name).toBe('sqlite-explorer-server-advanced');
    expect(serverInfo.version).toBe('1.0.0');
  });

  it('should have registered resources', () => {
    const resources = (server as any)._registeredResourceTemplates;
    expect('table-schema' in resources).toBe(true);
  });

  it('should have registered tools', () => {
    const tools = (server as any)._registeredTools;
    expect('listTables' in tools).toBe(true);
    expect('createTable' in tools).toBe(true);
    expect('executeModification' in tools).toBe(true);
  });

  it('should have registered prompts', () => {
    const prompts = (server as any)._registeredPrompts;
    expect('query-table' in prompts).toBe(true);
  });
});
