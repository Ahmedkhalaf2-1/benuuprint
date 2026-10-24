import { redirect } from "next/navigation";
import { TrackLandingPage } from "@/features/public-site/pages/track-pages";
import { pageMetadata } from "@/features/public-site/seo";
import { extractToken } from "@/features/public-site/tracking";

export const metadata = pageMetadata({ path: "/track", title: "Track an order", description: "Open your Benuu Print tracking link to see the status of your order and its shipments. No account needed." });

/** `/track?token=…` is forwarded to the canonical `/track/<token>` route. */
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const raw = (await searchParams).token;
  const token = extractToken(Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? ""));
  if (token) redirect(`/track/${encodeURIComponent(token)}`);
  return <TrackLandingPage />;
}
