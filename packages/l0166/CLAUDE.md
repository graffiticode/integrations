# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run clean      # Remove dist/ directory
npm start          # Run local MCP server (stdio transport)
npm run start:hosted  # Run hosted HTTP server (SSE transport)
```

## Environment Variables

- `GC_API_KEY_ID` - Required for local mode (index.ts)
- `GC_API_KEY_SECRET` - Required for local mode (index.ts)
- `PORT` - HTTP server port (default: 3001) for hosted mode
- `GRAFFITICODE_AUTH_URL` - Auth service URL (default: https://auth.graffiticode.org)
- `GRAFFITICODE_CONSOLE_URL` - Console API URL (default: https://graffiticode.org/api)

## Architecture

This is an MCP (Model Context Protocol) server for L0166, a math question generation DSL from Graffiticode.

### Two Server Modes

1. **Local/stdio mode** (`src/index.ts`): Runs as a subprocess with stdio transport. Requires `GC_API_KEY_ID` and `GC_API_KEY_SECRET` env vars.

2. **Hosted/HTTP mode** (`src/server.ts`): Runs as an HTTP server with SSE transport. Users pass their API credentials via `Authorization: Basic base64(keyId:keySecret)` header.

### Core Flow

1. `auth.ts` - Exchanges Graffiticode API key ID and secret for Firebase token with caching (55 min TTL)
2. `api.ts` - GraphQL client for Graffiticode Console API (`generateCode` mutation, `data` query)
3. `tool.ts` - Defines the MCP tool and orchestrates: prompt → code generation → data retrieval

### Tool Execution Pipeline

The single exposed tool `L0166` takes a natural language prompt and:
1. Calls `generateCode` GraphQL mutation to convert prompt to L0166 code
2. Calls `data` GraphQL query with the returned taskId to get compiled result
3. Returns code, description, data, and token usage
