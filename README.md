# Graffiticode Integrations

Monorepo for Graffiticode MCP (Model Context Protocol) server integrations.

## Overview

This repository provides MCP servers that enable AI assistants to create, update, and render Graffiticode items. The architecture uses a thin-router pattern where the MCP server routes requests to language-specific backends.

```
┌─────────────────────────────────────────────────────────────────────┐
│  MCP Server (thin router)                                           │
│  Tools: create_item, update_item, get_item, list_languages,        │
│         get_language_info                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Graffiticode API → Language-specific backends                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| [@graffiticode/mcp](./packages/mcp) | Language-agnostic MCP server |

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Running the MCP Server

**Stdio transport (for local CLI usage):**
```bash
cd packages/mcp
GRAFFITICODE_API_KEY=your-api-key npm run start
```

**HTTP transport (for hosted deployments):**
```bash
cd packages/mcp
npm run start:hosted
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `create_item(language, description)` | Create a new item in any language |
| `update_item(item_id, modification)` | Update an existing item |
| `get_item(item_id)` | Retrieve an item by ID |
| `list_languages(category?, search?)` | Discover available languages |
| `get_language_info(language)` | Get language documentation |

## Rendering Items with React

All Graffiticode languages provide a `Form` component for rendering items. The component expects a state object with a `data` getter and an `apply` method:

```jsx
import React from 'react';
import { Form } from '@graffiticode/l0166';  // or any language package
import '@graffiticode/l0166/dist/style.css';

function createState(initialData) {
  let data = initialData;
  return {
    get data() { return data; },
    apply(action) {
      if (action.args) {
        data = { ...data, ...action.args };
      }
    }
  };
}

function App({ itemData }) {
  // itemData is the 'data' field from create_item, update_item, or get_item
  const [state] = React.useState(() => createState(itemData));
  return <Form state={state} />;
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GRAFFITICODE_API_KEY` | API key for authentication | Required |
| `GRAFFITICODE_CONSOLE_URL` | API endpoint | `https://graffiticode.org/api` |
| `GRAFFITICODE_AUTH_URL` | Auth endpoint | `https://auth.graffiticode.org` |
| `PORT` | HTTP server port | `3001` |

## Development

```bash
npm run build    # Build all packages
npm run clean    # Clean build artifacts
npm run lint     # Run linter
npm run test     # Run tests
```

## License

MIT
