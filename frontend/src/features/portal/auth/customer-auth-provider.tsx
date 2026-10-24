"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isApiError } from "@/lib/api/errors";
import { refreshCustomerToken } from "@/lib/customer/client";
import { CUSTOMER_SESSION_HINT, customerTokenStore, onCustomerSessionExpired } from "@/lib/customer/session";
import { queryKeys } from "@/lib/query/keys";
import type { CustomerMe } from "../types";
import { customerLogin, customerLogoutRequest, fetchCustomer } from "./auth-api";

export type CustomerAuthStatus = "loading" | "authenticated" | "unauthenticated";
interface Value { status: CustomerAuthStatus; customer: CustomerMe | null; login: (input: { email: string; password: string }) => Promise<void>; logout: () => Promise<void> }
const Ctx = createContext<Value | null>(null);

/**
 * Customer portal session. Independent from the staff AuthProvider: own token memory (lib/customer/session), own cookies
 * (`bp_c_session` / `bp_c_rt`), own refresh route. Signing out here never touches a staff session, and vice versa.
 */
export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CustomerAuthStatus>("loading");
  const [customer, setCustomer] = useState<CustomerMe | null>(null);
  const bootstrapped = useRef(false);

  const clearLocal = useCallback(() => {
    customerTokenStore.clear();
    queryClient.removeQueries({ queryKey: queryKeys.customer.all }); // only the portal cache
    setCustomer(null);
    setStatus("unauthenticated");
  }, [queryClient]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      if (!document.cookie.split("; ").some((c) => c.startsWith(`${CUSTOMER_SESSION_HINT}=`))) return clearLocal();
      // Transient failures (429 / 5xx / network) are retried and keep the session; only a definitive 401/403 signs out.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const token = await refreshCustomerToken();
          if (!token) return clearLocal();
          customerTokenStore.set(token);
          setCustomer(await fetchCustomer());
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

  useEffect(() => onCustomerSessionExpired(() => { clearLocal(); router.replace("/account/login?reason=expired"); }), [clearLocal, router]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    await customerLogin(input);
    try {
      setCustomer(await fetchCustomer());
    } catch (e) {
      customerTokenStore.clear();
      throw e;
    }
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await customerLogoutRequest().catch(() => undefined);
    clearLocal();
    router.replace("/account/login");
  }, [clearLocal, router]);

  const value = useMemo<Value>(() => ({ status, customer, login, logout }), [status, customer, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCustomerAuth(): Value {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCustomerAuth must be used inside <CustomerAuthProvider>");
  return ctx;
}
