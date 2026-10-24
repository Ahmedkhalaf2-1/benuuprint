import type { Metadata } from "next";
import { Suspense } from "react";
import { SamplesList } from "@/features/portal/samples-list";

export const metadata: Metadata = { title: "My samples" };

export default function Page() {
  return <Suspense fallback={null}><SamplesList /></Suspense>;
}
