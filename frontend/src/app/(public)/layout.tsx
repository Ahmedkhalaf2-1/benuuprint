import type { ReactNode } from "react";
import { PublicFooter } from "@/features/public-site/public-footer";
import { RevealObserver } from "@/features/public-site/reveal-observer";
import { StickyMobileCta } from "@/features/public-site/sticky-cta";
import { PublicHeader } from "@/features/public-site/public-header";
import { organizationJsonLd, publicGroupMetadata } from "@/features/public-site/seo";

/** The public website: its own dark presentation layer, isolated from the admin and customer-portal shells. It opts back into indexing. */
export const metadata = publicGroupMetadata;

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pub min-h-dvh">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()).replace(/</g, "\\u003c") }} />
      <PublicHeader />
      {children}
      <PublicFooter />
      <StickyMobileCta />
      <RevealObserver />
    </div>
  );
}
