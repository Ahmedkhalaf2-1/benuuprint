"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { refreshAccessToken } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { createPermissionChecker, type PermissionChecker } from "@/lib/permissions";
import { onSessionExpired, tokenStore } from "@/lib/auth/token-store";
import type { AuthUser } from "@/types/auth";
import { fetchMe, login as loginRequest, logoutRequest, type LoginInput } from "./auth-api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue extends PermissionChecker {
  status: AuthStatus;
  user: AuthUser | null;
  roles: AuthUser["roles"];
  permissions: string[];
  login: (input: LoginInput) => Promise<void>;
  logout: (opts?: { all?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const bootstrapped = useRef(false);

  const clearLocal = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, [queryClient]);

  // Restore the session after a reload: the httpOnly cookie -> fresh access token -> /auth/me.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    // No session hint cookie -> nothing to restore (avoids a pointless 401 on the login page).
    (async () => {
      // The provider now lives in the (auth) and (admin) layouts, so signing in mounts a fresh one: if this page already holds a
      // valid access token (just logged in) there is nothing to refresh — a second refresh right after login races the cookie
      // rotation and can leave the old refresh token behind.
      if (tokenStore.get()) {
        try { setUser(await fetchMe()); setStatus("authenticated"); return; } catch { /* fall through to a normal restore */ }
      }
      if (!document.cookie.split("; ").some((c) => c.startsWith("bp_session="))) return clearLocal();
      // Transient failures (rate limit / network / 5xx) keep the session cookie and are retried; only a
      // definitive 401/403 from refresh means "signed out".
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const token = await refreshAccessToken();
          if (!token) return clearLocal();
          tokenStore.set(token);
          setUser(await fetchMe());
          setStatus("authenticated");
          return;
        } catch (e) {
          if (!isApiError(e) || (e.kind !== "rate_limited" && e.kind !== "network" && e.kind !== "server")) return clearLocal();
          await new Promise((r) => setTimeout(r, Math.min((e.retryAfter ?? 3) * 1000, 30_000)));
        }
      }
      clearLocal();
    })();
  }, [clearLocal]);

  // Refresh failed somewhere in the app -> leave to login.
  useEffect(
    () =>
      onSessionExpired(() => {
        clearLocal();
        router.replace("/login?reason=expired");
      }),
    [clearLocal, router],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      await loginRequest(input);
      try {
        setUser(await fetchMe());
      } catch (e) {
        tokenStore.clear();
        throw e;
      }
      setStatus("authenticated");
    },
    [],
  );

  const logout = useCallback(
    async (opts?: { all?: boolean }) => {
      await logoutRequest(opts?.all).catch(() => undefined);
      clearLocal();
      router.replace("/login");
    },
    [clearLocal, router],
  );

  const value = useMemo<AuthContextValue>(() => {
    const permissions = user?.permissions ?? [];
    return {
      status,
      user,
      roles: user?.roles ?? [],
      permissions,
      login,
      logout,
      ...createPermissionChecker(permissions),
    };
  }, [status, user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
