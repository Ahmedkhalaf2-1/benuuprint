import { NextResponse, type NextRequest } from "next/server";
import { retryAfterFromHeaders } from "@/lib/api/errors";
import { assertApiUrl, env } from "@/lib/config/env";

/** Non-secret, JS-readable marker so the client only tries to restore a session when one may exist. */
export const SESSION_HINT_COOKIE = "bp_session";

/** httpOnly cookie holding the backend refresh token ("<sessionId>.<secret>"). */
export const REFRESH_COOKIE = "bp_rt";
const MAX_AGE_SECONDS = 14 * 24 * 60 * 60; // backend REFRESH_TOKEN_TTL_DAYS default; backend stays authoritative

export function setRefreshCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_HINT_COOKIE, "1", { httpOnly: false, sameSite: "lax", secure: env.isProduction, path: "/", maxAge: MAX_AGE_SECONDS });
  res.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set(SESSION_HINT_COOKIE, "", { httpOnly: false, sameSite: "lax", secure: env.isProduction, path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: env.isProduction, path: "/", maxAge: 0 });
}

/** Forward client identity so backend sessions and per-IP rate limits see the real caller. */
export function forwardHeaders(req: NextRequest): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const ua = req.headers.get("user-agent");
  if (ua) h["User-Agent"] = ua;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) h["X-Forwarded-For"] = xff;
  return h;
}

export async function callBackend(path: string, init: RequestInit): Promise<{ res: Response; json: unknown }> {
  const res = await fetch(`${assertApiUrl()}${path}`, { ...init, cache: "no-store" });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { res, json };
}

export function relayError(res: Response, json: unknown): NextResponse {
  const out = NextResponse.json(json ?? { statusCode: res.status, error: "Error", message: "Request failed" }, {
    status: res.status,
  });
  const retry = retryAfterFromHeaders(res.headers);
  if (retry) out.headers.set("Retry-After", retry);
  return out;
}

export function backendUnavailable(): NextResponse {
  return NextResponse.json(
    { statusCode: 503, error: "Service Unavailable", message: "The server is unreachable." },
    { status: 503 },
  );
}

interface TokenResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: unknown;
}

/** Strips the refresh token out of the body and moves it into the cookie. */
export function sessionResponse(json: unknown): NextResponse {
  const t = (json ?? {}) as TokenResponse;
  if (typeof t.accessToken !== "string" || typeof t.refreshToken !== "string") {
    return NextResponse.json({ statusCode: 502, error: "Bad Gateway", message: "Unexpected auth response." }, { status: 502 });
  }
  const out = NextResponse.json({ accessToken: t.accessToken, expiresIn: t.expiresIn, user: t.user });
  setRefreshCookie(out, t.refreshToken);
  out.headers.set("Cache-Control", "no-store");
  return out;
}
