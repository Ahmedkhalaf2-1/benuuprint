import type { Metadata } from "next";
import { Suspense } from "react";
import { SamplesPage } from "@/features/samples/samples-page";

export const metadata: Metadata = { title: "Samples" };

export default function Page() {
  return <Suspense fallback={null}><SamplesPage /></Suspense>;
}
