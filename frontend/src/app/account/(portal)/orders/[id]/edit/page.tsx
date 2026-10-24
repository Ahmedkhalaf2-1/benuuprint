import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { OrderForm } from "@/features/portal/order-form";

export const generateMetadata = () => localizedTitle("Edit order");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><OrderForm orderId={(await params).id} /></Suspense>;
}
