import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { JobDetailPage } from "@/features/production/job-detail-page";

export const generateMetadata = () => localizedTitle("Factory job");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><JobDetailPage id={(await params).id} /></Suspense>;
}
