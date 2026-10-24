import type { Metadata } from "next";
import { Suspense } from "react";
import { FabricsPage } from "@/features/master-data/fabrics";

export const metadata: Metadata = { title: "Fabrics" };

export default function Page() {
  return <Suspense fallback={null}><FabricsPage /></Suspense>;
}
