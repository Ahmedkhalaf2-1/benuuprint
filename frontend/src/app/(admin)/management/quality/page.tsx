import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { QualityPage } from "@/features/management/pages";

export const generateMetadata = () => localizedTitle("Quality");

export default function Page() {
  return <Suspense fallback={null}><QualityPage /></Suspense>;
}
