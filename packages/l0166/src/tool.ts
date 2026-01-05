import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tool: Tool = {
  name: "L0166",
  description: `Generate math questions and exercises using the L0166 DSL (Domain Specific Language).

L0166 is designed for creating interactive math content including:
- Arithmetic problems (addition, subtraction, multiplication, division)
- Fractions and decimals
- Word problems
- Multi-step equations
- Customizable difficulty levels

The code follows a declarative syntax for defining question types, ranges, and formatting.`,
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "L0166 code to compile. Use the L0166 DSL syntax to define math questions.",
      },
      data: {
        type: "object",
        description: "Optional input data to pass to the compiled form (e.g., student answers, parameters).",
        additionalProperties: true,
      },
    },
    required: ["code"],
  },
};

interface CompileOptions {
  apiUrl: string;
  token: string;
  lang: string;
  code: string;
  data: Record<string, unknown>;
}

export async function compile(options: CompileOptions): Promise<unknown> {
  const { apiUrl, token, lang, code, data } = options;

  // Step 1: Create task
  const taskResponse = await fetch(`${apiUrl}/task`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-graffiticode-storage-type": "ephemeral",
    },
    body: JSON.stringify({
      lang,
      code,
    }),
  });

  if (!taskResponse.ok) {
    const error = await taskResponse.text();
    throw new Error(`Failed to create task: ${error}`);
  }

  const taskResult = await taskResponse.json() as { id?: string };
  const taskId = taskResult.id;

  if (!taskId) {
    throw new Error("No task ID returned from API");
  }

  // Step 2: Compile with data
  const compileResponse = await fetch(`${apiUrl}/compile`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: taskId,
      data,
    }),
  });

  if (!compileResponse.ok) {
    const error = await compileResponse.text();
    throw new Error(`Failed to compile: ${error}`);
  }

  return compileResponse.json();
}
