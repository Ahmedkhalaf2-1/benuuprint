import { AboutPage } from "@/features/public-site/pages/about-page";
import { pageMetadata } from "@/features/public-site/seo";

export const generateMetadata = () => pageMetadata({ path: "/about", title: "About", description: "Benuu Print makes custom apparel around a sample-first process, with clear approvals, structured production and visible delivery." });

export default function Page() {
  return <AboutPage />;
}
