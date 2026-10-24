import type { Metadata } from "next";
import { Suspense } from "react";
import { PatternsPage } from "@/features/master-data/patterns";

export const metadata: Metadata = { title: "Patterns" };

export default function Page() {
  return <Suspense fallback={null}><PatternsPage /></Suspense>;
}
