import { resolveProcessVideo } from "@/features/public-site/hero-media";
import { ProcessPage } from "@/features/public-site/pages/process-page";
import { pageMetadata } from "@/features/public-site/seo";

export const generateMetadata = () => pageMetadata({ path: "/process", title: "Process", description: "The full Benuu Print journey in eleven steps: from your first idea and sample, through bulk production and shipment, to reorder." });

export default function Page() {
  return <ProcessPage videoSrc={resolveProcessVideo()} />;
}
