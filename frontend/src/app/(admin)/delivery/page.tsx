import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { DeliveryPage } from "@/features/fulfillment/delivery-page";

export const generateMetadata = () => localizedTitle("Delivery");

export default function Page() {
  return <Suspense fallback={null}><DeliveryPage /></Suspense>;
}
