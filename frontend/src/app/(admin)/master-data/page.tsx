import type { Metadata } from "next";
import { Suspense } from "react";
import { MasterDataOverviewPage } from "@/features/master-data/overview-page";

export const metadata: Metadata = { title: "Master data" };

export default function Page() {
  return <Suspense fallback={null}><MasterDataOverviewPage /></Suspense>;
}
