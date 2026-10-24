import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { WorkloadPage } from "@/features/management/pages";

export const generateMetadata = () => localizedTitle("Workload and capacity");

export default function Page() {
  return <Suspense fallback={null}><WorkloadPage /></Suspense>;
}
