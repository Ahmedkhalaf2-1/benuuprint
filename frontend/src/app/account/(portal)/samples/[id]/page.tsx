import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { SampleDetailPage } from "@/features/portal/sample-detail";

export const generateMetadata = () => localizedTitle("Sample");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><SampleDetailPage id={(await params).id} /></Suspense>;
}
