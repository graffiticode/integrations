#!/usr/bin/env node

/**
 * Hosted MCP Server for L0166
 *
 * Runs as an HTTP server with SSE transport.
 * Users authenticate by passing their Graffiticode API credentials in the Authorization header
 * using Basic auth format: "Basic base64(keyId:keySecret)"
 *
 * Usage:
 *   node dist/server.js
 *
 * Client config:
 *   {
 *     "mcpServers": {
 *       "graffiticode-l0166": {
 *         "url": "http://localhost:3001/sse",
 *         "headers": {
 *           "Authorization": "Basic <base64(GC_API_KEY_ID:GC_API_KEY_SECRET)>"
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { tool, execute } from "./tool.js";
import { createAuthClient } from "./auth.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

// Store active transports by session
const transports = new Map<string, SSEServerTransport>();

interface ApiKeyCredentials {
  keyId: string;
  keySecret: string;
}

function extractCredentials(req: IncomingMessage): ApiKeyCredentials | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  // Support "Basic base64(keyId:keySecret)" format
  if (authHeader.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
      const [keyId, keySecret] = decoded.split(":");
      if (keyId && keySecret) {
        return { keyId, keySecret };
      }
    } catch {
      return null;
    }
  }

  return null;
}

function createMcpServer(credentials: ApiKeyCredentials) {
  const auth = createAuthClient(credentials);

  const server = new Server(
    {
      name: "graffiticode-l0166",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [tool],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== tool.name) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const { prompt } = request.params.arguments as {
      prompt: string;
    };

    try {
      const token = await auth.getToken();
      const result = await execute({ token, prompt });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // SSE endpoint
  if (url.pathname === "/sse") {
    const credentials = extractCredentials(req);

    if (!credentials) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "Authorization required",
        message: "Include your Graffiticode API credentials in the Authorization header as 'Basic base64(keyId:keySecret)'"
      }));
      return;
    }

    // Create transport and server for this connection
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = crypto.randomUUID();
    transports.set(sessionId, transport);

    const server = createMcpServer(credentials);

    // Clean up on disconnect
    res.on("close", () => {
      transports.delete(sessionId);
    });

    await server.connect(transport);
    return;
  }

  // Message endpoint (for client responses)
  if (url.pathname === "/messages" && req.method === "POST") {
    const sessionId = url.searchParams.get("sessionId");
    const transport = sessionId ? transports.get(sessionId) : null;

    if (!transport) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid session" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        await transport.handlePostMessage(req, res, body);
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal error" }));
      }
    });
    return;
  }

  // Not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}

const httpServer = createServer(handleRequest);

httpServer.listen(PORT, () => {
  console.log(`L0166 MCP Server (hosted) running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\nClient configuration:`);
  console.log(JSON.stringify({
    mcpServers: {
      "graffiticode-l0166": {
        url: `http://localhost:${PORT}/sse`,
        headers: {
          Authorization: "Basic <base64(GC_API_KEY_ID:GC_API_KEY_SECRET)>"
        }
      }
    }
  }, null, 2));
});
