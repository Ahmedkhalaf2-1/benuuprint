import { useEffect, useState } from "react";
import { getCustomerAuthConfig } from "../api";

/**
 * Return-destination handling for the customer auth suite. Only same-app portal paths are ever honoured: anything external,
 * protocol-relative, scheme-based (javascript:), backslashed, or pointing at an auth screen itself is rejected.
 */
const AUTH_PATHS = ["/account/login", "/account/register", "/account/check-email", "/account/verify-email", "/account/forgot-password", "/account/reset-password", "/account/activate"];

export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || next.length > 300) return null;
  if (!next.startsWith("/account") || next.startsWith("//") || /[\\\s]|:\/\//.test(next) || /^\/account[^/?#]/.test(next)) return null;
  const path = next.split(/[?#]/)[0]!;
  if (AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return next;
}

/** `/account/register?next=…` style link that keeps a safe destination and drops an unsafe one. */
export function authHref(path: string, next: string | null | undefined, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams(extra);
  const safe = safeNextPath(next);
  if (safe) p.set("next", safe);
  const qs = p.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * The email link opens in a fresh tab, so the destination chosen before registering is kept (only a safe path, never a token or
 * password) in localStorage until the verified user signs in. Storage can be unavailable: every call is guarded.
 */
const KEY = "bp.customer.signup-next";
export const signupNext = {
  set(next: string | null) { try { const s = safeNextPath(next); if (s) localStorage.setItem(KEY, s); } catch {} },
  get(): string | null { try { return safeNextPath(localStorage.getItem(KEY)); } catch { return null; } },
  clear() { try { localStorage.removeItem(KEY); } catch {} },
};

/** Masks an address for display ("amina@example.com" -> "a***@example.com"). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}${"*".repeat(Math.min(3, Math.max(1, local.length - 1)))}@${domain}`;
}

/**
 * Whether email verification is required, from the public auth config. Fails safe: while loading or if the config cannot be
 * read, verification is treated as required; only an explicit `false` from the backend turns it off.
 */
export function useEmailVerificationRequired(): boolean {
  const [required, setRequired] = useState(true);
  useEffect(() => {
    const ctl = new AbortController();
    getCustomerAuthConfig(ctl.signal).then((c) => setRequired(c?.emailVerificationRequired !== false), () => setRequired(true));
    return () => ctl.abort();
  }, []);
  return required;
}
