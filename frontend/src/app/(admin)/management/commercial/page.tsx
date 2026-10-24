import type { Metadata } from "next";
import { Suspense } from "react";
import { CommercialPage } from "@/features/management/pages";

export const metadata: Metadata = { title: "Commercial" };

export default function Page() {
  return <Suspense fallback={null}><CommercialPage /></Suspense>;
}
