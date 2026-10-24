import type { Metadata, MetadataRoute } from "next";
import { env } from "@/lib/config/env";
import { PRIVATE_PATHS, PUBLIC_ROUTES } from "./routes";

export const SITE_NAME = "Benue Print";
const HOME_TITLE = "Benue Print — Custom apparel manufacturing, sample to delivery";
const DESCRIPTION = "Custom apparel manufacturing from first sample to full-scale production — built around quality, visibility, and control.";

/** Site-wide metadata for the `(public)` group: it opts the public site back into indexing (the root layout is noindex). */
export const publicGroupMetadata: Metadata = {
  robots: { index: true, follow: true },
  ...(env.siteUrl ? { metadataBase: new URL(env.siteUrl) } : {}),
};

/** Per-page metadata. Canonical and OG url are emitted only when NEXT_PUBLIC_SITE_URL is configured (never localhost). */
export function pageMetadata({ path, title, description }: { path: string; title: string; description: string }): Metadata {
  const full = path === "/" ? HOME_TITLE : `${title} · ${SITE_NAME}`;
  return {
    title: path === "/" ? { absolute: HOME_TITLE } : title,
    description,
    ...(env.siteUrl ? { alternates: { canonical: path } } : {}),
    openGraph: { type: "website", siteName: SITE_NAME, title: full, description, ...(env.siteUrl ? { url: path } : {}) },
    twitter: { card: "summary_large_image", title: full, description },
  };
}

export const homeMetadata: Metadata = pageMetadata({ path: "/", title: HOME_TITLE, description: DESCRIPTION });

/** Organization data limited to what is actually known: no address, phone, socials or dates. */
export function organizationJsonLd(siteUrl: string = env.siteUrl) {
  return { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, description: DESCRIPTION, ...(siteUrl ? { url: siteUrl } : {}) };
}

/** Public marketing pages only. Without a configured site origin there are no absolute URLs to publish, so the list is empty. */
export function buildSitemap(siteUrl: string = env.siteUrl): MetadataRoute.Sitemap {
  if (!siteUrl) return [];
  return PUBLIC_ROUTES.map((r) => ({ url: r.path === "/" ? siteUrl : `${siteUrl}${r.path}`, changeFrequency: r.changeFrequency, priority: r.priority }));
}

export function buildRobots(siteUrl: string = env.siteUrl): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] }, ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl } : {}) };
}
