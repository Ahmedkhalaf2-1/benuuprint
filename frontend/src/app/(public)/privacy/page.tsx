import { PRIVACY_SECTIONS } from "@/features/public-site/content-pages";
import { LegalPage } from "@/features/public-site/pages/legal-page";
import { pageMetadata } from "@/features/public-site/seo";

export const metadata = pageMetadata({ path: "/privacy", title: "Privacy", description: "How information is handled when you use the Benuu Print website and customer account. Working draft with items to be confirmed." });

export default function Page() {
  return <LegalPage eyebrow="Legal" title="Privacy" sections={PRIVACY_SECTIONS} />;
}
