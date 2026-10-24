import type { Metadata } from "next";
import { Suspense } from "react";
import { QualityPage } from "@/features/management/pages";

export const metadata: Metadata = { title: "Quality" };

export default function Page() {
  return <Suspense fallback={null}><QualityPage /></Suspense>;
}
