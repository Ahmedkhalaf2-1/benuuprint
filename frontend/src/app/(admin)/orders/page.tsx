import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { OrdersPage } from "@/features/orders/orders-page";

export const generateMetadata = () => localizedTitle("Orders");

export default function Page() {
  return <Suspense fallback={null}><OrdersPage /></Suspense>;
}
