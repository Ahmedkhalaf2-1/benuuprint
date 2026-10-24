import { Homepage } from "@/features/public-site/homepage";
import { homeMetadata } from "@/features/public-site/seo";

export const generateMetadata = homeMetadata;

export default function Page() {
  return <Homepage />;
}
