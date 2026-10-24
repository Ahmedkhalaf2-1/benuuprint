import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessoriesPage } from "@/features/master-data/simple-lists";

export const metadata: Metadata = { title: "Accessories" };

export default function Page() {
  return <Suspense fallback={null}><AccessoriesPage /></Suspense>;
}
