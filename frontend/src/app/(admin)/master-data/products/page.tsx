import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductTypesPage } from "@/features/master-data/product-types";

export const metadata: Metadata = { title: "Product types" };

export default function Page() {
  return <Suspense fallback={null}><ProductTypesPage /></Suspense>;
}
