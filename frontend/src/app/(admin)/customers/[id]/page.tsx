import { localizedTitle } from "@/i18n/server";
import { CustomerDetailPage } from "@/features/customers/customer-detail-page";

export const generateMetadata = () => localizedTitle("Customer");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CustomerDetailPage id={(await params).id} />;
}
