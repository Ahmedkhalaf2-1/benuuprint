/**
 * The customer portal session is completely separate from the staff session: its own in-memory access token, its own
 * "session ended" signal and (see bff.ts) its own cookies. Nothing here imports the staff token store.
 */
let accessToken: string | null = null;
const listeners = new Set<() => void>();

export const customerTokenStore = {
  get: () => accessToken,
  set(token: string | null) {
    accessToken = token;
  },
  clear() {
    accessToken = null;
  },
};

export function onCustomerSessionExpired(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitCustomerSessionExpired() {
  customerTokenStore.clear();
  listeners.forEach((fn) => fn());
}

/** JS-readable marker (not a secret): only try to restore a customer session when one may exist. */
export const CUSTOMER_SESSION_HINT = "bp_c_session";
