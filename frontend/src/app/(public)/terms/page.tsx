import { TERMS_SECTIONS } from "@/features/public-site/content-pages";
import { LegalPage } from "@/features/public-site/pages/legal-page";
import { pageMetadata } from "@/features/public-site/seo";

export const generateMetadata = () => pageMetadata({ path: "/terms", title: "Terms", description: "How the Benuu Print service works for samples, quotations, payments, approvals, orders and shipments. Working draft with items to be confirmed." });

export default function Page() {
  return <LegalPage eyebrow="Legal" title="Terms" sections={TERMS_SECTIONS} />;
}
