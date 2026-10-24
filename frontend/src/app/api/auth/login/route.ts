import type { NextRequest } from "next/server";
import { backendUnavailable, callBackend, forwardHeaders, relayError, sessionResponse } from "@/lib/auth/bff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const { res, json } = await callBackend("/auth/login", { method: "POST", headers: forwardHeaders(req), body });
    return res.ok ? sessionResponse(json) : relayError(res, json);
  } catch {
    return backendUnavailable();
  }
}
