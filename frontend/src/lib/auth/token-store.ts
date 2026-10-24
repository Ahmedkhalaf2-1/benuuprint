/**
 * Access token lives in module memory only: never localStorage/sessionStorage (XSS-readable)
 * and never logged. A page reload recovers it through the httpOnly refresh cookie.
 */
let accessToken: string | null = null;
const listeners = new Set<() => void>();

export const tokenStore = {
  get: () => accessToken,
  set(token: string | null) {
    accessToken = token;
  },
  clear() {
    accessToken = null;
  },
};

/** Fired when refresh fails: the session is gone and the UI must sign out. */
export function onSessionExpired(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitSessionExpired() {
  tokenStore.clear();
  listeners.forEach((fn) => fn());
}
