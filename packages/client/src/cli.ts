#!/usr/bin/env node
import path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { MCPClient } from './client.js';
import { LMStudioClient } from './lmstudio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Interactive CLI for MCP SQLite Client with LM Studio integration
 */
class InteractiveCLI {
  private mcpClient: MCPClient;
  private lmClient: LMStudioClient | null = null;
  private rl: readline.Interface;
  private schemaContext = '';

  constructor() {
    this.mcpClient = new MCPClient();
    this.lmClient = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Main entry point
   */
  async run(): Promise<void> {
    console.log('🚀 MCP SQLite Client with LM Studio Integration');
    console.log('================================================\n');

    // Try to connect to LM Studio
    await this.initLMStudio();

    // Connect to MCP server
    await this.connectToServer();

    // Load schema context for AI
    await this.loadSchemaContext();

    // Start interactive loop
    this.showHelp();
    this.prompt();
  }

  /**
   * Initialize LM Studio connection
   */
  private async initLMStudio(): Promise<void> {
    console.log('📡 Checking LM Studio connection...');
    this.lmClient = new LMStudioClient();

    const healthy = await this.lmClient.healthCheck();
    if (healthy) {
      console.log('✅ LM Studio connected\n');
    } else {
      console.log('❌ LM Studio not available. Run LM Studio and enable the server.\n');
      console.log('   Download: https://lmstudio.ai/\n');
      this.lmClient = null;
    }
  }

  /**
   * Connect to the MCP server
   */
  private async connectToServer(): Promise<void> {
    const serverPath = path.join(__dirname, '../../server/dist/stdio.js');
    console.log('📡 Connecting to MCP server...');

    try {
      await this.mcpClient.connect('node', [serverPath]);
      console.log('✅ MCP server connected\n');

      // List available capabilities
      const tools = await this.mcpClient.listTools();
      const resources = await this.mcpClient.listResources();
      const prompts = await this.mcpClient.listPrompts();

      console.log(`📦 Tools: ${tools.map((t) => t.name).join(', ')}`);
      console.log(`📚 Resources: ${resources.length} available`);
      console.log(`💬 Prompts: ${prompts.map((p) => p.name).join(', ')}\n`);
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      process.exit(1);
    }
  }

  /**
   * Load schema context for AI assistance
   */
  private async loadSchemaContext(): Promise<void> {
    try {
      const tables = await this.mcpClient.callTool('listTables', {});
      this.schemaContext = JSON.stringify(tables, null, 2);
    } catch {
      this.schemaContext = '';
    }
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    console.log('Commands:');
    console.log('  /help              - Show this help');
    console.log('  /tools             - List available tools');
    console.log('  /resources         - List available resources');
    console.log('  /prompts           - List available prompts');
    console.log('  /ask <question>    - Ask AI (LM Studio) to generate SQL');
    console.log('  /explain <result>  - Ask AI to explain results');
    console.log('  /schema            - Show current schema context');
    console.log('  /call <tool> <args> - Call a tool directly');
    console.log('  /quit              - Exit\n');
    console.log('Type a natural language question to use AI-powered SQL generation.\n');
  }

  /**
   * Show prompt and wait for input
   */
  private prompt(): void {
    this.rl.question('🔍 > ', async (input) => {
      await this.handleCommand(input.trim());
      this.prompt();
    });
  }

  /**
   * Handle user input
   */
  private async handleCommand(input: string): Promise<void> {
    if (!input) return;

    if (input === '/quit' || input === '/exit') {
      await this.cleanup();
      process.exit(0);
    }

    if (input === '/help') {
      this.showHelp();
      return;
    }

    if (input === '/tools') {
      const tools = await this.mcpClient.listTools();
      console.log('\nAvailable Tools:');
      tools.forEach((tool) => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
      console.log();
      return;
    }

    if (input === '/resources') {
      const resources = await this.mcpClient.listResources();
      console.log('\nAvailable Resources:');
      resources.forEach((res) => {
        console.log(`  - ${res.uri}: ${res.name}`);
      });
      console.log();
      return;
    }

    if (input === '/prompts') {
      const prompts = await this.mcpClient.listPrompts();
      console.log('\nAvailable Prompts:');
      prompts.forEach((prompt) => {
        console.log(`  - ${prompt.name}: ${prompt.description}`);
      });
      console.log();
      return;
    }

    if (input === '/schema') {
      console.log('\nSchema Context:');
      console.log(this.schemaContext || '(not loaded)');
      console.log();
      return;
    }

    if (input.startsWith('/ask ')) {
      await this.handleAsk(input.slice(5));
      return;
    }

    if (input.startsWith('/call ')) {
      await this.handleCall(input.slice(6));
      return;
    }

    // Default: treat as natural language query
    await this.handleNaturalLanguage(input);
  }

  /**
   * Handle /ask command
   */
  private async handleAsk(question: string): Promise<void> {
    if (!this.lmClient) {
      console.log('❌ LM Studio not available. Start LM Studio to use AI features.\n');
      return;
    }

    console.log('🤔 Generating SQL...\n');
    try {
      const sql = await this.lmClient.generateSQL(question, this.schemaContext);
      console.log('📝 Generated SQL:\n');
      console.log(sql);
      console.log();
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle natural language input
   */
  private async handleNaturalLanguage(input: string): Promise<void> {
    if (!this.lmClient) {
      console.log('❌ LM Studio not available. Use /call to use tools directly.\n');
      return;
    }

    console.log('🤔 Processing...\n');
    try {
      const response = await this.lmClient.generateSQL(input, this.schemaContext);
      console.log('💡 Response:\n');
      console.log(response);
      console.log();
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle /call command
   */
  private async handleCall(args: string): Promise<void> {
    const parts = args.split(' ');
    const toolName = parts[0];

    if (!toolName) {
      console.log('❌ Please specify a tool name: /call <tool> [args...]\n');
      return;
    }

    const toolArgs: Record<string, unknown> = {};

    // Parse remaining args as key=value pairs
    for (const part of parts.slice(1)) {
      const [key, value] = part.split('=');
      if (key && value) {
        toolArgs[key] = value;
      }
    }

    try {
      const result = await this.mcpClient.callTool(toolName, toolArgs);
      console.log('📦 Result:\n');
      console.log(JSON.stringify(result, null, 2));
      console.log();
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    this.rl.close();
    await this.mcpClient.disconnect();
    console.log('\n👋 Goodbye!');
  }
}

// Run the CLI
const cli = new InteractiveCLI();
cli.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
