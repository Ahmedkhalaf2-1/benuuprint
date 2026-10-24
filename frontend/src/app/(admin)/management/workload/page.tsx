import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkloadPage } from "@/features/management/pages";

export const metadata: Metadata = { title: "Workload and capacity" };

export default function Page() {
  return <Suspense fallback={null}><WorkloadPage /></Suspense>;
}
