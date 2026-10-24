import { NextResponse, type NextRequest } from "next/server";
import { callBackend, clearRefreshCookie, forwardHeaders } from "@/lib/auth/bff";

export const dynamic = "force-dynamic";

/** `?all=1` revokes every session (logout-all). The cookie is always cleared. */
export async function POST(req: NextRequest) {
  const headers = forwardHeaders(req);
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;
  const path = req.nextUrl.searchParams.get("all") === "1" ? "/auth/logout-all" : "/auth/logout";
  try {
    await callBackend(path, { method: "POST", headers, body: "{}" });
  } catch {
    // Backend unreachable: still sign out locally.
  }
  const out = NextResponse.json({ ok: true });
  clearRefreshCookie(out);
  return out;
}
