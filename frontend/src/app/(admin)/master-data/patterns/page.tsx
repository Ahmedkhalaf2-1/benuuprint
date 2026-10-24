import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { PatternsPage } from "@/features/master-data/patterns";

export const generateMetadata = () => localizedTitle("Patterns");

export default function Page() {
  return <Suspense fallback={null}><PatternsPage /></Suspense>;
}
