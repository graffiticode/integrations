#!/usr/bin/env node

/**
 * Hosted MCP Server for Graffiticode
 *
 * Runs as an HTTP server with Streamable HTTP transport.
 * Users authenticate by passing their Graffiticode API key in the Authorization header.
 *
 * Usage:
 *   node dist/server.js
 *
 * Client config:
 *   {
 *     "mcpServers": {
 *       "graffiticode": {
 *         "url": "http://localhost:3001/mcp",
 *         "headers": {
 *           "Authorization": "Bearer gc_xxxxx"
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { tools, handleToolCall } from "./tools.js";
import { createAuthClient } from "./auth.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

// Store active transports and servers by session
const transports = new Map<string, StreamableHTTPServerTransport>();
const servers = new Map<string, Server>();

function extractApiKey(req: IncomingMessage): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  // Support "Bearer <token>" format
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return authHeader;
}

function createMcpServer(apiKey: string) {
  const auth = createAuthClient(apiKey);

  const server = new Server(
    {
      name: "graffiticode",
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
      tools,
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const token = await auth.getToken();
      const result = await handleToolCall(
        { token },
        name,
        args as Record<string, unknown>
      );

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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");

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

  // MCP endpoint (Streamable HTTP)
  if (url.pathname === "/mcp") {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "Authorization required",
        message: "Include your Graffiticode API key in the Authorization header"
      }));
      return;
    }

    // Check for existing session
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      // Reuse existing transport for this session
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    // Handle DELETE for session termination
    if (req.method === "DELETE") {
      if (sessionId && transports.has(sessionId)) {
        transports.delete(sessionId);
        servers.delete(sessionId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "session terminated" }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found" }));
      }
      return;
    }

    // Create new transport and server for new session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (newSessionId: string) => {
        transports.set(newSessionId, transport);
        servers.set(newSessionId, server);
      }
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        transports.delete(sid);
        servers.delete(sid);
      }
    };

    const server = createMcpServer(apiKey);
    await server.connect(transport);
    await transport.handleRequest(req, res);
    return;
  }

  // Not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}

const httpServer = createServer(handleRequest);

httpServer.listen(PORT, () => {
  console.log(`Graffiticode MCP Server (hosted) running on http://localhost:${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\nAvailable tools:`);
  tools.forEach(tool => {
    console.log(`  - ${tool.name}`);
  });
  console.log(`\nClient configuration:`);
  console.log(JSON.stringify({
    mcpServers: {
      "graffiticode": {
        url: `http://localhost:${PORT}/mcp`,
        headers: {
          Authorization: "Bearer <your-api-key>"
        }
      }
    }
  }, null, 2));
});
