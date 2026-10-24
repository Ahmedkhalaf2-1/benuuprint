import type { Metadata } from "next";
import { Suspense } from "react";
import { SampleDetailPage } from "@/features/portal/sample-detail";

export const metadata: Metadata = { title: "Sample" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><SampleDetailPage id={(await params).id} /></Suspense>;
}
