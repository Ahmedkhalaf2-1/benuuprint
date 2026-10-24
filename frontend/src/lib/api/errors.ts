import type { ApiErrorBody } from "@/types/api";

export type ApiErrorKind =
  | "validation" // 400 / 422
  | "unauthorized" // 401
  | "forbidden" // 403
  | "not_found" // 404
  | "conflict" // 409
  | "rate_limited" // 429
  | "server" // 5xx
  | "network"
  | "aborted"
  | "unknown";

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly messages: string[];
  readonly requestId?: string;
  readonly path?: string;
  readonly timestamp?: string;
  /** Seconds, from Retry-After on 429. */
  readonly retryAfter?: number;
  /** Machine code some backend errors carry in the body's `error` field (e.g. EMAIL_NOT_VERIFIED); undefined for plain HTTP names like "Conflict". */
  readonly code?: string;

  constructor(init: {
    status: number;
    kind: ApiErrorKind;
    messages: string[];
    requestId?: string;
    path?: string;
    timestamp?: string;
    retryAfter?: number;
    code?: string;
  }) {
    super(init.messages[0] ?? "Request failed");
    this.name = "ApiError";
    this.status = init.status;
    this.kind = init.kind;
    this.messages = init.messages;
    this.requestId = init.requestId;
    this.path = init.path;
    this.timestamp = init.timestamp;
    this.retryAfter = init.retryAfter;
    this.code = init.code;
  }
}

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "unknown";
}

/**
 * The live backend names its throttlers, so a 429 carries `Retry-After-auth` (not `Retry-After`).
 * Accept the standard header first, then any `Retry-After-*`.
 */
export function retryAfterFromHeaders(headers: Headers): string | null {
  const std = headers.get("retry-after");
  if (std) return std;
  for (const [k, v] of headers.entries()) if (k.toLowerCase().startsWith("retry-after-")) return v;
  return null;
}

function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (Number.isFinite(n)) return Math.max(0, Math.ceil(n));
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : Math.max(0, Math.ceil((t - Date.now()) / 1000));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Turns any non-OK response (body already parsed, if possible) into an ApiError. */
export function normalizeError(status: number, body: unknown, retryAfterHeader?: string | null): ApiError {
  const b: Partial<ApiErrorBody> = isRecord(body) ? (body as Partial<ApiErrorBody>) : {};
  const raw = b.message;
  const messages = Array.isArray(raw)
    ? raw.filter((m): m is string => typeof m === "string")
    : typeof raw === "string"
      ? [raw]
      : [];
  const kind = kindForStatus(status);
  return new ApiError({
    status,
    kind,
    // Never surface server internals for 5xx.
    // 5xx and 429 bodies carry framework text ("ThrottlerException: ..."): show our own wording instead.
    messages: kind === "server" || kind === "rate_limited" ? [defaultMessage(kind === "server" ? "unknown" : kind)] : messages.length ? messages : [defaultMessage(kind)],
    requestId: typeof b.requestId === "string" ? b.requestId : undefined,
    path: typeof b.path === "string" ? b.path : undefined,
    timestamp: typeof b.timestamp === "string" ? b.timestamp : undefined,
    retryAfter: parseRetryAfter(retryAfterHeader),
    code: typeof b.error === "string" && /^[A-Z][A-Z0-9_]+$/.test(b.error) ? b.error : undefined,
  });
}

export function networkError(): ApiError {
  return new ApiError({ status: 0, kind: "network", messages: ["Cannot reach the server. Check your connection."] });
}

export function abortedError(): ApiError {
  return new ApiError({ status: 0, kind: "aborted", messages: ["Request cancelled."] });
}

function defaultMessage(kind: ApiErrorKind): string {
  switch (kind) {
    case "validation":
      return "Some of the submitted values are not valid.";
    case "unauthorized":
      return "Your session has expired. Please sign in again.";
    case "forbidden":
      return "You do not have permission to do this.";
    case "not_found":
      return "The requested item was not found.";
    case "conflict":
      return "This conflicts with the current state. Refresh and try again.";
    case "rate_limited":
      return "Too many requests. Please wait a moment and try again.";
    default:
      return "Something went wrong on our side.";
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Friendly one-liner for toasts / inline errors. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.kind === "rate_limited" && e.retryAfter) return `Too many attempts. Try again in ${e.retryAfter}s.`;
    return e.messages.join(" ");
  }
  return e instanceof Error ? e.message : "Unexpected error.";
}
