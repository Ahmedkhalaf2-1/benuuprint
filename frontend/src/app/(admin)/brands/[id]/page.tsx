import type { Metadata } from "next";
import { BrandDetailPage } from "@/features/brands/brand-detail-page";

export const metadata: Metadata = { title: "Brand" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <BrandDetailPage id={(await params).id} />;
}
