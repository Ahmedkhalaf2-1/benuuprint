import { NextResponse, type NextRequest } from "next/server";
import { callBackend, forwardHeaders } from "@/lib/auth/bff";
import { clearCustomerRefreshCookie } from "@/lib/customer/bff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const headers = forwardHeaders(req);
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;
  try {
    await callBackend("/customer/auth/logout", { method: "POST", headers, body: "{}" });
  } catch {
    // Backend unreachable: still sign out locally.
  }
  const out = NextResponse.json({ ok: true });
  clearCustomerRefreshCookie(out);
  return out;
}
