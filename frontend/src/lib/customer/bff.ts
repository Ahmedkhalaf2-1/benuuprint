import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { CUSTOMER_SESSION_HINT } from "./session";

export { CUSTOMER_SESSION_HINT };
/** httpOnly cookie holding the CUSTOMER refresh token (distinct from the staff `bp_rt`). */
export const CUSTOMER_REFRESH_COOKIE = "bp_c_rt";
const MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

export function setCustomerRefreshCookie(res: NextResponse, token: string) {
  res.cookies.set(CUSTOMER_SESSION_HINT, "1", { httpOnly: false, sameSite: "lax", secure: env.isProduction, path: "/", maxAge: MAX_AGE_SECONDS });
  // Scoped to the customer auth routes: the browser never sends it anywhere else.
  res.cookies.set(CUSTOMER_REFRESH_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: env.isProduction, path: "/api/customer", maxAge: MAX_AGE_SECONDS });
}

export function clearCustomerRefreshCookie(res: NextResponse) {
  res.cookies.set(CUSTOMER_SESSION_HINT, "", { httpOnly: false, sameSite: "lax", secure: env.isProduction, path: "/", maxAge: 0 });
  res.cookies.set(CUSTOMER_REFRESH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: env.isProduction, path: "/api/customer", maxAge: 0 });
}

interface CustomerTokens { accessToken?: string; refreshToken?: string; expiresIn?: number; customer?: unknown }

/** Moves the refresh token out of the body into the cookie; the browser only receives the short-lived access token. */
export function customerSessionResponse(json: unknown): NextResponse {
  const t = (json ?? {}) as CustomerTokens;
  if (typeof t.accessToken !== "string" || typeof t.refreshToken !== "string") {
    return NextResponse.json({ statusCode: 502, error: "Bad Gateway", message: "Unexpected sign-in response." }, { status: 502 });
  }
  const out = NextResponse.json({ accessToken: t.accessToken, expiresIn: t.expiresIn, customer: t.customer });
  setCustomerRefreshCookie(out, t.refreshToken);
  out.headers.set("Cache-Control", "no-store");
  return out;
}
