import type { Metadata } from "next";
import { Suspense } from "react";
import { PrintMethodsPage } from "@/features/master-data/simple-lists";

export const metadata: Metadata = { title: "Print methods" };

export default function Page() {
  return <Suspense fallback={null}><PrintMethodsPage /></Suspense>;
}
