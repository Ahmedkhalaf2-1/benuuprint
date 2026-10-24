import { ProductsPage } from "@/features/public-site/pages/products-page";
import { pageMetadata } from "@/features/public-site/seo";

export const generateMetadata = () => pageMetadata({ path: "/products", title: "Products", description: "T-shirts, hoodies, sweatshirts, polos, jackets, bottoms, sportswear and custom pieces: the garment families Benuu Print makes." });

export default function Page() {
  return <ProductsPage />;
}
