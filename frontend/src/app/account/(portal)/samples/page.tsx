import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { SamplesList } from "@/features/portal/samples-list";

export const generateMetadata = () => localizedTitle("My samples");

export default function Page() {
  return <Suspense fallback={null}><SamplesList /></Suspense>;
}
