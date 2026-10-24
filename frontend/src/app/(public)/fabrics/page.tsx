import { FabricsPage } from "@/features/public-site/pages/fabrics-page";
import { pageMetadata } from "@/features/public-site/seo";

export const generateMetadata = () => pageMetadata({ path: "/fabrics", title: "Fabrics", description: "A visual fabric book: jersey, rib, fleece, brushed and twill, with how each feels and where it is typically used." });

export default function Page() {
  return <FabricsPage />;
}
