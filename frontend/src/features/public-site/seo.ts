import type { Metadata, MetadataRoute } from "next";
import { getI18n } from "@/i18n/server";
import { env } from "@/lib/config/env";
import { PRIVATE_PATHS, PUBLIC_ROUTES } from "./routes";

export const SITE_NAME = "Benuu Print";
const HOME_TITLE = "Benuu Print — Custom apparel manufacturing, sample to delivery";
export const DESCRIPTION = "Custom apparel manufacturing, from the first sample to full production. Quality is checked along the way and progress is visible in your account.";

/** Site-wide metadata for the `(public)` group: it opts the public site back into indexing (the root layout is noindex). */
export const publicGroupMetadata: Metadata = {
  robots: { index: true, follow: true },
  ...(env.siteUrl ? { metadataBase: new URL(env.siteUrl) } : {}),
};

/**
 * Per-page metadata, localised from the locale cookie (routes are not locale-prefixed, so there are deliberately no hreflang
 * alternates). Canonical and OG url are emitted only when NEXT_PUBLIC_SITE_URL is configured (never localhost).
 * `title` / `description` are the English source strings; Arabic comes from `phrases`.
 */
export async function pageMetadata({ path, title, description }: { path: string; title: string; description: string }): Promise<Metadata> {
  const { t } = await getI18n();
  const home = t.text(HOME_TITLE);
  const pageTitle = t.text(title);
  const desc = t.text(description);
  const full = path === "/" ? home : `${pageTitle} · ${t("common.brand")}`;
  return {
    title: path === "/" ? { absolute: home } : pageTitle,
    description: desc,
    ...(env.siteUrl ? { alternates: { canonical: path } } : {}),
    openGraph: { type: "website", siteName: SITE_NAME, title: full, description: desc, ...(env.siteUrl ? { url: path } : {}) },
    twitter: { card: "summary_large_image", title: full, description: desc },
  };
}

export const homeMetadata = () => pageMetadata({ path: "/", title: HOME_TITLE, description: DESCRIPTION });

/** Organization data limited to what is actually known: no address, phone, socials or dates. */
export function organizationJsonLd(siteUrl: string = env.siteUrl, description: string = DESCRIPTION) {
  return { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, description, ...(siteUrl ? { url: siteUrl } : {}) };
}

/** Public marketing pages only. Without a configured site origin there are no absolute URLs to publish, so the list is empty. */
export function buildSitemap(siteUrl: string = env.siteUrl): MetadataRoute.Sitemap {
  if (!siteUrl) return [];
  return PUBLIC_ROUTES.map((r) => ({ url: r.path === "/" ? siteUrl : `${siteUrl}${r.path}`, changeFrequency: r.changeFrequency, priority: r.priority }));
}

export function buildRobots(siteUrl: string = env.siteUrl): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] }, ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl } : {}) };
}
