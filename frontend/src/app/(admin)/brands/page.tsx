import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandsPage } from "@/features/brands/brands-page";

export const metadata: Metadata = { title: "Brands" };

export default function Page() {
  return <Suspense fallback={null}><BrandsPage /></Suspense>;
}
