import type { Metadata } from "next";
import { Suspense } from "react";
import { DeliveryPage } from "@/features/fulfillment/delivery-page";

export const metadata: Metadata = { title: "Delivery" };

export default function Page() {
  return <Suspense fallback={null}><DeliveryPage /></Suspense>;
}
