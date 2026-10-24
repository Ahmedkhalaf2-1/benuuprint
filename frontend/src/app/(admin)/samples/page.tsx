import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { SamplesPage } from "@/features/samples/samples-page";

export const generateMetadata = () => localizedTitle("Samples");

export default function Page() {
  return <Suspense fallback={null}><SamplesPage /></Suspense>;
}
