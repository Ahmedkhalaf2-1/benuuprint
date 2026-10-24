import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { ProductionInsightsPage } from "@/features/management/pages";

export const generateMetadata = () => localizedTitle("Production overview");

export default function Page() {
  return <Suspense fallback={null}><ProductionInsightsPage /></Suspense>;
}
