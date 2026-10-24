import type { Metadata } from "next";
import { Suspense } from "react";
import { SizesPage } from "@/features/master-data/simple-lists";

export const metadata: Metadata = { title: "Sizes" };

export default function Page() {
  return <Suspense fallback={null}><SizesPage /></Suspense>;
}
