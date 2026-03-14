import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Prompt, Resource, Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Client for connecting to MCP servers via stdio transport
 */
export class MCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private connected = false;

  constructor() {
    this.client = new Client({
      name: 'mcp-sqlite-client',
      version: '1.0.0',
    });
  }

  /**
   * Connect to an MCP server via stdio
   */
  async connect(command: string, args: string[], env?: Record<string, string>): Promise<void> {
    const params: { command: string; args: string[]; env?: Record<string, string> } = {
      command,
      args,
    };
    if (env) {
      params.env = env;
    }
    this.transport = new StdioClientTransport(params);

    await this.client.connect(this.transport);
    this.connected = true;
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.connected = false;
  }

  /**
   * List available tools
   */
  async listTools(): Promise<Tool[]> {
    const result = await this.client.listTools();
    return result.tools as Tool[];
  }

  /**
   * List available resources
   */
  async listResources(): Promise<Resource[]> {
    const result = await this.client.listResources();
    return result.resources as Resource[];
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<Prompt[]> {
    const result = await this.client.listPrompts();
    return result.prompts as Prompt[];
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await this.client.callTool({
      name,
      arguments: args,
    });
    return result;
  }

  /**
   * Get a prompt from the MCP server
   */
  async getPrompt(name: string, args: Record<string, string>): Promise<unknown> {
    const result = await this.client.getPrompt({
      name,
      arguments: args,
    });
    return result;
  }

  /**
   * Read a resource from the MCP server
   */
  async readResource(uri: string): Promise<unknown> {
    const result = await this.client.readResource({ uri });
    return result;
  }

  /**
   * Check if connected to a server
   */
  isConnected(): boolean {
    return this.connected;
  }
}
