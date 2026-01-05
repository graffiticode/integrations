import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateCode, getData } from "./api.js";

export const tool: Tool = {
  name: "L0166",
  description: `Create embeddable spreadsheets using natural language.

Describe the spreadsheet you want in plain English, and L0166 will generate it.

Examples:
- "Create a budget tracker with income and expense columns"
- "Make a simple invoice with item, quantity, price, and total"
- "Build a grade calculator that averages test scores"

## React Usage

Install the component:
\`\`\`bash
npm install @graffiticode/l0166
\`\`\`

Use in your React app:
\`\`\`jsx
import { Form } from '@graffiticode/l0166';
import '@graffiticode/l0166/style.css';

// 'data' is the response from this tool
function Spreadsheet({ data }) {
  const state = {
    data,
    apply: (action) => console.log('Action:', action)
  };
  return <Form state={state} />;
}
\`\`\`

The tool returns { taskId, code, description, data, usage }.
Pass the 'data' field to the Form component.`,
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Natural language description of the spreadsheet you want to create",
      },
    },
    required: ["prompt"],
  },
};

interface ExecuteOptions {
  token: string;
  prompt: string;
}

export interface ExecuteResult {
  taskId: string;
  code: string;
  description: string;
  data: unknown;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Execute the L0166 tool:
 * 1. Generate code from natural language prompt
 * 2. Get compiled data from the taskId
 */
export async function execute(options: ExecuteOptions): Promise<ExecuteResult> {
  const { token, prompt } = options;

  // Step 1: Generate code from prompt
  const generated = await generateCode({
    token,
    prompt,
    language: "0166",
  });

  if (!generated.taskId) {
    throw new Error("No taskId returned from code generation");
  }

  // Step 2: Get compiled data
  const data = await getData({
    token,
    taskId: generated.taskId,
  });

  return {
    taskId: generated.taskId,
    code: generated.code,
    description: generated.description,
    data,
    usage: generated.usage,
  };
}
