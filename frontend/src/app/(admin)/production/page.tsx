import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductionPage } from "@/features/production/production-page";

export const metadata: Metadata = { title: "Production" };

export default function Page() {
  return <Suspense fallback={null}><ProductionPage /></Suspense>;
}
