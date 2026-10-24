import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { DeliveryInsightsPage } from "@/features/management/pages";

export const generateMetadata = () => localizedTitle("Delivery KPIs");

export default function Page() {
  return <Suspense fallback={null}><DeliveryInsightsPage /></Suspense>;
}
