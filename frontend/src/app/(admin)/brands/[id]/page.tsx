import { localizedTitle } from "@/i18n/server";
import { BrandDetailPage } from "@/features/brands/brand-detail-page";

export const generateMetadata = () => localizedTitle("Brand");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <BrandDetailPage id={(await params).id} />;
}
