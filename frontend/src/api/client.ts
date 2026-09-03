const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "surakshchain_token";

export function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Could not reach the SurakshChain server.", 0);
  }

  let json: { success: boolean; data?: T; error?: { code: string; message: string } };
  try {
    json = await res.json();
  } catch {
    throw new ApiError("INVALID_RESPONSE", "Server returned an unreadable response.", res.status);
  }

  if (!res.ok || !json.success) {
    const err = json.error;
    throw new ApiError(err?.code ?? "UNKNOWN_ERROR", err?.message ?? "Something went wrong.", res.status);
  }

  return json.data as T;
}
