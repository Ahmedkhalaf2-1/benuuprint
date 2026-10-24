import { normalizeError, networkError, retryAfterFromHeaders } from "@/lib/api/errors";
import { customerAuthRoutes } from "@/lib/config/env";
import { customerTokenStore } from "@/lib/customer/session";
import { getMe } from "../api";
import type { CustomerMe } from "../types";

/** Sign-in goes through the same-origin BFF so the refresh token lands in the customer's own httpOnly cookie. */
export async function customerLogin(input: { email: string; password: string }, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(customerAuthRoutes.login, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(input), signal });
  } catch {
    throw networkError();
  }
  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) throw normalizeError(res.status, body, retryAfterFromHeaders(res.headers));
  customerTokenStore.set((body as { accessToken: string }).accessToken);
}

export const fetchCustomer = (signal?: AbortSignal): Promise<CustomerMe> => getMe(signal);

export async function customerLogoutRequest(): Promise<void> {
  const token = customerTokenStore.get();
  try {
    await fetch(customerAuthRoutes.logout, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } finally {
    customerTokenStore.clear();
  }
}
