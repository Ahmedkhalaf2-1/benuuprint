import { CapabilitiesPage } from "@/features/public-site/pages/capabilities-page";
import { pageMetadata } from "@/features/public-site/seo";

export const generateMetadata = () => pageMetadata({ path: "/capabilities", title: "Capabilities", description: "Eight areas of work from first sample to delivery: sample development, pattern and fit, fabric sourcing, decoration, cut and sew, quality control, packaging and fulfillment." });

export default function Page() {
  return <CapabilitiesPage />;
}
