export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type ApiRequestOptions<TBody = unknown> = {
  method?: HttpMethod;
  url: string;
  body?: TBody;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

type ValidationIssue = {
  msg?: string;
};

type ApiErrorShape = {
  detail?: string | ValidationIssue[];
  message?: string;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Un 401 aquí significa credenciales o refresh inválidos, no un access token caducado.
const NO_REFRESH_URLS = new Set(["/auth/login", "/auth/refresh"]);

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

function readErrorMessage(data: ApiErrorShape): string | null {
  if (typeof data.detail === "string") {
    return data.detail;
  }

  // FastAPI devuelve los 422 de validación como lista de objetos con `msg`.
  if (Array.isArray(data.detail)) {
    const messages = data.detail
      .map((issue) => issue.msg)
      .filter((msg): msg is string => typeof msg === "string" && msg.length > 0);
    if (messages.length > 0) {
      return messages.join(". ");
    }
  }

  return data.message ?? null;
}

async function parseError(response: Response): Promise<ApiError> {
  let message: string | null = null;
  try {
    message = readErrorMessage((await response.json()) as ApiErrorShape);
  } catch {
    // Cuerpo vacío o no JSON, como el 500 en texto plano de Starlette.
  }
  return new ApiError(response.status, message ?? `HTTP ${response.status}`);
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

  if (response.status === 401 && !isRetry && !NO_REFRESH_URLS.has(options.url)) {
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
      throw new ApiError(401, "Sesión expirada");
    }
    return apiRequest<TResponse, TBody>(options, true);
  }

  if (!response.ok) {
    throw await parseError(response);
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
