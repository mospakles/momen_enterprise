const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipRefresh?: boolean;
};

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

function authAudience(path: string): "admin" | "customer" {
  return path.startsWith("/admin/") ? "admin" : "customer";
}

async function rawRequest<T>(path: string, options: RequestOptions, retried: boolean): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = new Headers(options.headers);
  if (!isFormData && options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body:
      options.body === undefined
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body),
  });

  if (response.status === 401 && !retried && !options.skipRefresh) {
    const audience = authAudience(path);
    const refreshPath = audience === "admin" ? "/admin/auth/refresh" : "/auth/refresh";
    const refreshed = await fetch(`${API_BASE_URL}${refreshPath}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (refreshed.ok) return rawRequest<T>(path, options, true);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new ApiError(errorMessage(payload, `Request failed (${response.status})`), response.status, payload);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function apiRequest<T>(path: string, options: RequestOptions = {}) {
  return rawRequest<T>(path, options, false);
}

export function apiAssetUrl(path: string | undefined) {
  if (!path || !path.startsWith("/")) return path ?? "";
  return `${API_BASE_URL.replace(/\/api$/, "")}${path}`;
}

export function notifyAuthChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("momen:auth-changed"));
}
