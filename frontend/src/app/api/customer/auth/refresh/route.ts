import { NextResponse, type NextRequest } from "next/server";
import { backendUnavailable, callBackend, forwardHeaders, relayError } from "@/lib/auth/bff";
import { clearCustomerRefreshCookie, CUSTOMER_REFRESH_COOKIE, customerSessionResponse } from "@/lib/customer/bff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.json({ statusCode: 401, error: "Unauthorized", message: "No session." }, { status: 401 });
  try {
    const { res, json } = await callBackend("/customer/auth/refresh", { method: "POST", headers: forwardHeaders(req), body: JSON.stringify({ refreshToken }) });
    if (res.ok) return customerSessionResponse(json);
    const out = relayError(res, json);
    // A rejected token (expired, revoked, replayed) is dead; transient errors (429 / 5xx) keep the cookie.
    if (res.status === 401 || res.status === 403) clearCustomerRefreshCookie(out);
    return out;
  } catch {
    return backendUnavailable();
  }
}
