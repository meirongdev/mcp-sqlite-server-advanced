declare module '@modelcontextprotocol/sdk' {
  // Minimal ambient types used in this learning project. Keep these broad to avoid strict coupling.
  export class McpServer {
    constructor(opts?: any);
    registerResource(...args: any[]): any;
    registerPrompt(...args: any[]): any;
    registerTool(...args: any[]): any;
    server: any; // SDK exposes runtime helpers on .server (sendToolListChanged, request, etc.)
  }

  export class ResourceTemplate {
    constructor(template: string, handlers?: any);
  }

  export interface ResourceDescriptor {
    uri?: string;
    name?: string;
    title?: string;
    description?: string;
    mimeType?: string;
    text?: string;
  }

  export {};
}
