#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tool, compile } from "./tool.js";
import { createAuthClient } from "./auth.js";

const API_URL = process.env.GRAFFITICODE_API_URL || "https://api.graffiticode.org";

async function main() {
  const apiKey = process.env.GRAFFITICODE_API_KEY;
  if (!apiKey) {
    console.error("Error: GRAFFITICODE_API_KEY environment variable is required");
    process.exit(1);
  }

  // Create auth client for token management
  const auth = createAuthClient(apiKey);

  // Create MCP server
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

    const { code, data } = request.params.arguments as {
      code: string;
      data?: Record<string, unknown>;
    };

    try {
      const token = await auth.getToken();
      const result = await compile({
        apiUrl: API_URL,
        token,
        lang: "0166",
        code,
        data: data || {},
      });

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

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
