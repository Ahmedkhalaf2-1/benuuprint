import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductionInsightsPage } from "@/features/management/pages";

export const metadata: Metadata = { title: "Production overview" };

export default function Page() {
  return <Suspense fallback={null}><ProductionInsightsPage /></Suspense>;
}
