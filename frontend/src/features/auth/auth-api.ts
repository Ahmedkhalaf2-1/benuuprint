import { api } from "@/lib/api/client";
import { normalizeError, networkError, retryAfterFromHeaders } from "@/lib/api/errors";
import { authRoutes } from "@/lib/config/env";
import { tokenStore } from "@/lib/auth/token-store";
import { normalizeUser } from "@/lib/auth/normalize";
import type { AuthUser, SessionPayload } from "@/types/auth";

export interface LoginInput {
  email: string;
  password: string;
}

/** Login goes through the same-origin BFF so the refresh token lands in an httpOnly cookie. */
export async function login(input: LoginInput, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(authRoutes.login, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      signal,
    });
  } catch {
    throw networkError();
  }
  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) throw normalizeError(res.status, body, retryAfterFromHeaders(res.headers));
  const session = body as SessionPayload;
  tokenStore.set(session.accessToken);
}

/** GET /auth/me — source of truth for roles and permissions. */
export async function fetchMe(signal?: AbortSignal): Promise<AuthUser> {
  const raw = await api.get<unknown>("/auth/me", { signal });
  const user = normalizeUser(raw);
  if (!user) throw new Error("Unexpected /auth/me response");
  return user;
}

export async function logoutRequest(all = false): Promise<void> {
  const token = tokenStore.get();
  try {
    await fetch(`${authRoutes.logout}${all ? "?all=1" : ""}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } finally {
    tokenStore.clear();
  }
}
