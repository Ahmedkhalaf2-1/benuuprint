import { api } from "@/lib/api/client";
import { env } from "@/lib/config/env";

export interface DownloadUrl {
  url: string;
  expiresAt: string;
}

/**
 * The backend returns the signed URL as a path on ITS host (e.g. `/api/v1/storage/local/<token>`), so it must be
 * resolved against the API origin, never the frontend's. Absolute URLs (a future S3-style provider) pass through.
 * The token is the credential: it is requested on demand, opened once, and never stored, logged or built by hand.
 */
export function resolveDownloadUrl(url: string, apiUrl: string = env.apiUrl): string {
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, new URL(apiUrl).origin).toString();
}

/** GET /admin/assets/:id/download-url (needs assets.read). */
export async function getAssetDownloadUrl(assetId: string, disposition: "attachment" | "inline" = "attachment"): Promise<DownloadUrl> {
  const r = await api.get<DownloadUrl>(`/admin/assets/${encodeURIComponent(assetId)}/download-url`, { query: { disposition } });
  return { ...r, url: resolveDownloadUrl(r.url) };
}
