import type { Metadata } from "next";
import { TrackResultPage } from "@/features/public-site/pages/track-pages";
import { loadTracking } from "@/features/public-site/tracking";

/** A tracking link is a credential: never indexed, never leaked through the Referer header, never cached. */
export const metadata: Metadata = { title: "Order tracking", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TrackResultPage result={await loadTracking(decodeURIComponent(token))} />;
}
