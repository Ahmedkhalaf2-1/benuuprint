import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { PrintMethodsPage } from "@/features/master-data/simple-lists";

export const generateMetadata = () => localizedTitle("Print methods");

export default function Page() {
  return <Suspense fallback={null}><PrintMethodsPage /></Suspense>;
}
