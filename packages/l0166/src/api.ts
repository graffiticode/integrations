/**
 * Graffiticode GraphQL API client
 */

const CONSOLE_API_URL = process.env.GRAFFITICODE_CONSOLE_URL || "https://graffiticode.org/api";

interface GenerateCodeResult {
  code: string;
  taskId: string;
  description: string;
  language: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function graphqlRequest<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(CONSOLE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GraphQL request failed: ${error}`);
  }

  const result = await response.json() as GraphQLResponse<T>;

  if (result.errors && result.errors.length > 0) {
    throw new Error(`GraphQL error: ${result.errors[0].message}`);
  }

  if (!result.data) {
    throw new Error("No data returned from GraphQL");
  }

  return result.data;
}

/**
 * Generate code from a natural language prompt
 */
export async function generateCode(options: {
  token: string;
  prompt: string;
  language: string;
  currentCode?: string;
}): Promise<GenerateCodeResult> {
  const { token, prompt, language, currentCode } = options;

  const query = `
    mutation GenerateCode($prompt: String!, $language: String, $currentCode: String) {
      generateCode(prompt: $prompt, language: $language, currentCode: $currentCode) {
        code
        taskId
        description
        language
        model
        usage {
          input_tokens
          output_tokens
        }
      }
    }
  `;

  const result = await graphqlRequest<{ generateCode: GenerateCodeResult }>(
    token,
    query,
    { prompt, language, currentCode }
  );

  return result.generateCode;
}

/**
 * Get compiled data for a task
 */
export async function getData(options: {
  token: string;
  taskId: string;
}): Promise<unknown> {
  const { token, taskId } = options;

  const query = `
    query GetData($id: String!) {
      data(id: $id)
    }
  `;

  const result = await graphqlRequest<{ data: string }>(
    token,
    query,
    { id: taskId }
  );

  // The data field is returned as a JSON string
  return JSON.parse(result.data);
}
