#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tool, execute } from "./tool.js";
import { createAuthClient } from "./auth.js";

async function main() {
  const keyId = process.env.GC_API_KEY_ID;
  const keySecret = process.env.GC_API_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("Error: GC_API_KEY_ID and GC_API_KEY_SECRET environment variables are required");
    process.exit(1);
  }

  // Create auth client for token management
  const auth = createAuthClient({ keyId, keySecret });

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

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
