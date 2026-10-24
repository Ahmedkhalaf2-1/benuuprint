import { ContactPage } from "@/features/public-site/pages/contact-page";
import { pageMetadata } from "@/features/public-site/seo";

export const metadata = pageMetadata({ path: "/contact", title: "Contact", description: "Talk to Benue Print about a project, or start a sample request directly." });

export default function Page() {
  return <ContactPage />;
}
