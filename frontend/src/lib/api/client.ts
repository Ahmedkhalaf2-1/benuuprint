import { assertApiUrl, authRoutes } from "@/lib/config/env";
import { emitSessionExpired, tokenStore } from "@/lib/auth/token-store";
import type { QueryParams } from "@/types/api";
import { abortedError, ApiError, networkError, normalizeError, retryAfterFromHeaders } from "./errors";

export interface RequestOptions {
  query?: QueryParams;
  /** Plain objects are sent as JSON; FormData as multipart/form-data. */
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Skip Authorization and refresh handling (public endpoints). */
  anonymous?: boolean;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export function buildUrl(path: string, query?: QueryParams): string {
  const base = assertApiUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, String(v)));
    else sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function send(method: Method, url: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body; // browser sets the multipart boundary
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (token && !opts.anonymous) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(url, { method, headers, body, signal: opts.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw abortedError();
    throw networkError();
  }
}

/** One isolated session: its own token memory, refresh route and "session is gone" signal. Staff and customer portals each get one. */
export interface ClientSession {
  tokenStore: { get: () => string | null; set: (t: string | null) => void };
  refreshUrl: string;
  onExpired: () => void;
}

export function createApiClient(session: ClientSession) {
  /* ---- coordinated refresh: one in-flight promise shared by every caller ---- */
  let refreshing: Promise<string | null> | null = null;

  /**
   * Resolves a fresh access token, or `null` when the session is definitively gone (401/403: expired, revoked, replayed).
   * Throws an ApiError for TRANSIENT failures (429 rate limit, 5xx, network): those must not sign the user out.
   */
  function refreshAccessToken(): Promise<string | null> {
    refreshing ??= (async () => {
      let res: Response;
      try {
        res = await fetch(session.refreshUrl, { method: "POST", headers: { Accept: "application/json" } });
      } catch {
        throw networkError();
      }
      if (res.ok) {
        const data = (await parseBody(res)) as { accessToken?: string } | undefined;
        return typeof data?.accessToken === "string" ? data.accessToken : null;
      }
      if (res.status === 401 || res.status === 403) return null;
      throw normalizeError(res.status, await parseBody(res), retryAfterFromHeaders(res.headers));
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
    const url = buildUrl(path, opts.query);
    let res = await send(method, url, opts, session.tokenStore.get());

    if (res.status === 401 && !opts.anonymous) {
      const fresh = await refreshAccessToken();
      if (!fresh) {
        session.onExpired();
        throw normalizeError(401, await parseBody(res));
      }
      session.tokenStore.set(fresh);
      res = await send(method, url, opts, fresh); // retried exactly once
      if (res.status === 401) {
        session.onExpired();
        throw normalizeError(401, await parseBody(res));
      }
    }

    const body = await parseBody(res);
    if (!res.ok) throw normalizeError(res.status, body, retryAfterFromHeaders(res.headers));
    return body as T;
  }

  const api = {
    get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, opts),
    post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, { ...opts, body }),
    put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, { ...opts, body }),
    patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, { ...opts, body }),
    delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, opts),
  };
  return { api, refreshAccessToken };
}

/** The staff session (unchanged behaviour). */
const staff = createApiClient({ tokenStore, refreshUrl: authRoutes.refresh, onExpired: emitSessionExpired });
export const api = staff.api;
export const refreshAccessToken = staff.refreshAccessToken;

export { ApiError };
