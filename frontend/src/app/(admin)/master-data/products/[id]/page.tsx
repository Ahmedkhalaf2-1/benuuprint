import { localizedTitle } from "@/i18n/server";
import { ProductTypeDetailPage } from "@/features/master-data/product-types";

export const generateMetadata = () => localizedTitle("Product type");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductTypeDetailPage id={(await params).id} />;
}
