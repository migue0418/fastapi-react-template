export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type ApiRequestOptions<TBody = unknown> = {
  method?: HttpMethod;
  url: string;
  body?: TBody;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

type ApiErrorShape = {
  detail?: string;
  message?: string;
};

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent("auth:expired"));
        return null;
      }

      const data = (await response.json()) as { access_token: string };
      setAccessToken(data.access_token);
      return data.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function isBodyInit(value: unknown): value is BodyInit {
  return value instanceof FormData || value instanceof URLSearchParams || typeof value === "string";
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiErrorShape;
    return data.detail ?? data.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function apiRequest<TResponse, TBody = unknown>(
  options: ApiRequestOptions<TBody>,
  isRetry = false,
): Promise<TResponse> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    if (isBodyInit(options.body)) {
      body = options.body;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`/api${options.url}`, {
    method: options.method ?? "GET",
    body,
    signal: options.signal,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && !isRetry && options.url !== "/auth/refresh") {
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
      throw new Error("Sesion expirada");
    }
    return apiRequest<TResponse, TBody>(options, true);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export const api = {
  get: <TResponse>(url: string, signal?: AbortSignal) =>
    apiRequest<TResponse>({ method: "GET", url, signal }),
  post: <TResponse, TBody>(url: string, body?: TBody, signal?: AbortSignal) =>
    apiRequest<TResponse, TBody>({ method: "POST", url, body, signal }),
  put: <TResponse, TBody>(url: string, body?: TBody, signal?: AbortSignal) =>
    apiRequest<TResponse, TBody>({ method: "PUT", url, body, signal }),
  delete: <TResponse>(url: string, signal?: AbortSignal) =>
    apiRequest<TResponse>({ method: "DELETE", url, signal }),
};
