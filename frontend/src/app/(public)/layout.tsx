import type { ReactNode } from "react";
import localFont from "next/font/local";
import { PublicFooter } from "@/features/public-site/public-footer";
import { RevealObserver } from "@/features/public-site/reveal-observer";
import { StickyMobileCta } from "@/features/public-site/sticky-cta";
import { PublicHeader } from "@/features/public-site/public-header";
import { DESCRIPTION, organizationJsonLd, publicGroupMetadata } from "@/features/public-site/seo";
import { getI18n } from "@/i18n/server";

/** Thmanyah serif display: public-site headings, navigation and CTAs only (admin, staff and portal keep their own typography). */
const thmanyah = localFont({
  variable: "--font-thmanyah",
  display: "swap",
  src: [
    { path: "../../fonts/thmanyah/thmanyahserifdisplay-Light.woff2", weight: "300", style: "normal" },
    { path: "../../fonts/thmanyah/thmanyahserifdisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/thmanyah/thmanyahserifdisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/thmanyah/thmanyahserifdisplay-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../fonts/thmanyah/thmanyahserifdisplay-Black.woff2", weight: "900", style: "normal" },
  ],
});

/** The public website: its own dark presentation layer, isolated from the admin and customer-portal shells. It opts back into indexing. */
export const metadata = publicGroupMetadata;

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className={`pub min-h-dvh ${thmanyah.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(undefined, t.text(DESCRIPTION))).replace(/</g, "\\u003c") }} />
      <PublicHeader />
      {children}
      <PublicFooter />
      <StickyMobileCta />
      <RevealObserver />
    </div>
  );
}
