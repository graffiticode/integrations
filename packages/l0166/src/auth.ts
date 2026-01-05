const AUTH_URL = process.env.GRAFFITICODE_AUTH_URL || "https://auth.graffiticode.org";

interface AuthClient {
  getToken(): Promise<string>;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

export function createAuthClient(apiKey: string): AuthClient {
  let cache: TokenCache | null = null;

  async function exchangeApiKeyForToken(): Promise<string> {
    const response = await fetch(`${AUTH_URL}/authenticate/api-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: apiKey }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to authenticate: ${error}`);
    }

    const data = await response.json() as {
      status: string;
      error?: string;
      data?: { firebaseCustomToken?: string };
    };

    if (data.status !== "success") {
      throw new Error(`Authentication failed: ${data.error || "Unknown error"}`);
    }

    const firebaseToken = data.data?.firebaseCustomToken;
    if (!firebaseToken) {
      throw new Error("No token returned from authentication");
    }

    return firebaseToken;
  }

  return {
    async getToken(): Promise<string> {
      const now = Date.now();

      // Return cached token if still valid (with 5 minute buffer)
      if (cache && cache.expiresAt > now + 5 * 60 * 1000) {
        return cache.token;
      }

      // Exchange API key for new token
      const token = await exchangeApiKeyForToken();

      // Cache for 55 minutes (Firebase tokens typically expire in 1 hour)
      cache = {
        token,
        expiresAt: now + 55 * 60 * 1000,
      };

      return token;
    },
  };
}
