import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { OrderDetailPage } from "@/features/orders/order-detail-page";

export const generateMetadata = () => localizedTitle("Order");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><OrderDetailPage id={(await params).id} /></Suspense>;
}
