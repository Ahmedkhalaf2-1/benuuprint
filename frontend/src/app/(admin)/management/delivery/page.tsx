import type { Metadata } from "next";
import { Suspense } from "react";
import { DeliveryInsightsPage } from "@/features/management/pages";

export const metadata: Metadata = { title: "Delivery KPIs" };

export default function Page() {
  return <Suspense fallback={null}><DeliveryInsightsPage /></Suspense>;
}
