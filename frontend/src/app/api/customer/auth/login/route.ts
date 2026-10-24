import type { NextRequest } from "next/server";
import { backendUnavailable, callBackend, forwardHeaders, relayError } from "@/lib/auth/bff";
import { customerSessionResponse } from "@/lib/customer/bff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const { res, json } = await callBackend("/customer/auth/login", { method: "POST", headers: forwardHeaders(req), body });
    return res.ok ? customerSessionResponse(json) : relayError(res, json);
  } catch {
    return backendUnavailable();
  }
}
