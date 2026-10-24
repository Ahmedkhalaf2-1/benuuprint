import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { SampleDetailPage } from "@/features/samples/sample-detail-page";

export const generateMetadata = () => localizedTitle("Sample");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><SampleDetailPage id={(await params).id} /></Suspense>;
}
