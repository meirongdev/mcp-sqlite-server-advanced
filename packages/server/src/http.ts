import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express, { type Request, type Response } from 'express';
import { server } from './server.js';

const app = express();
app.use(express.json());

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

app.all('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport;
        console.error(`New HTTP session initialized: ${newSessionId}`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        console.error(`HTTP session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };

    await server.connect(transport as any);
  } else {
    res.status(400).json({
      error: { message: 'Bad Request: No valid session ID provided' },
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

const PORT = 3000;

app.listen(PORT, () => {
  console.error(`MCP Streamable HTTP Server listening on http://localhost:${PORT}/mcp`);
});
