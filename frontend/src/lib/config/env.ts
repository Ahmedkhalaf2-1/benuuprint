/**
 * Single source of runtime configuration. Nothing else in the app reads
 * process.env or hardcodes the backend URL.
 */
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;

export const env = {
  /** Backend base URL including the /api/v1 prefix, without trailing slash. */
  apiUrl: (rawApiUrl ?? "").replace(/\/+$/, ""),
  /** Public origin of the website (e.g. https://example.com), used for canonical/Open Graph URLs. Optional: omitted tags are skipped, never guessed. */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, ""),
  isProduction: process.env.NODE_ENV === "production",
} as const;

export function assertApiUrl(): string {
  if (!env.apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local.");
  }
  return env.apiUrl;
}

/** Same-origin auth endpoints (Next route handlers that hold the refresh cookie). */
export const authRoutes = {
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
} as const;

/** Same-origin CUSTOMER auth endpoints. Separate cookies/routes from the staff ones so the two sessions never collide. */
export const customerAuthRoutes = {
  login: "/api/customer/auth/login",
  refresh: "/api/customer/auth/refresh",
  logout: "/api/customer/auth/logout",
} as const;
