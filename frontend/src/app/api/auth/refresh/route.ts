import { NextResponse, type NextRequest } from "next/server";
import {
  backendUnavailable,
  callBackend,
  clearRefreshCookie,
  forwardHeaders,
  REFRESH_COOKIE,
  relayError,
  sessionResponse,
} from "@/lib/auth/bff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ statusCode: 401, error: "Unauthorized", message: "No session." }, { status: 401 });
  }
  try {
    const { res, json } = await callBackend("/auth/refresh", {
      method: "POST",
      headers: forwardHeaders(req),
      body: JSON.stringify({ refreshToken }),
    });
    if (res.ok) return sessionResponse(json);
    const out = relayError(res, json);
    // A rejected token (expired, revoked, replayed) is dead: drop the cookie. Transient errors keep it.
    if (res.status === 401 || res.status === 403) clearRefreshCookie(out);
    return out;
  } catch {
    return backendUnavailable();
  }
}
