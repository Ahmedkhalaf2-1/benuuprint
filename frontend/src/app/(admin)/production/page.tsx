import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { ProductionPage } from "@/features/production/production-page";

export const generateMetadata = () => localizedTitle("Production");

export default function Page() {
  return <Suspense fallback={null}><ProductionPage /></Suspense>;
}
