import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { NewOrderPage } from "@/features/orders/new-order-page";

export const generateMetadata = () => localizedTitle("New order");

export default function Page() {
  return <Suspense fallback={null}><NewOrderPage /></Suspense>;
}
