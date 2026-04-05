const REQUEST_TIMEOUT_MS = 10000;

function resolveApiBase(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredBase) {
    return configuredBase.replace(/\/$/, "");
  }

  // In browser production deployments, prefer same-origin API path over localhost.
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1`;
  }

  return "http://localhost:3005/api/v1";
}

const API_BASE = resolveApiBase();

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(typeof body === "string" ? body : JSON.stringify(body));
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...init } = options ?? {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        0,
        `Request timed out after ${
          REQUEST_TIMEOUT_MS / 1000
        }s. Verify NEXT_PUBLIC_API_URL is set to your deployed backend URL.`,
      );
    }

    throw new ApiError(
      0,
      "Network error while contacting API. Verify NEXT_PUBLIC_API_URL and backend availability.",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => res.statusText);
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
