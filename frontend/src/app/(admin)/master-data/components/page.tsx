import type { Metadata } from "next";
import { Suspense } from "react";
import { ComponentsPage } from "@/features/master-data/simple-lists";

export const metadata: Metadata = { title: "Labels & packaging" };

export default function Page() {
  return <Suspense fallback={null}><ComponentsPage /></Suspense>;
}
