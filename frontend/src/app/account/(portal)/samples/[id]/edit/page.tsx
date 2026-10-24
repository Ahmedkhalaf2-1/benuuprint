import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { SampleWizard } from "@/features/portal/wizard";

export const generateMetadata = () => localizedTitle("Your sample request");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><SampleWizard id={(await params).id} /></Suspense>;
}
