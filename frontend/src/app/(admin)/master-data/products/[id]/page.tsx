import type { Metadata } from "next";
import { ProductTypeDetailPage } from "@/features/master-data/product-types";

export const metadata: Metadata = { title: "Product type" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductTypeDetailPage id={(await params).id} />;
}
