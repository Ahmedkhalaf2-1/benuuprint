import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { ComponentsPage } from "@/features/master-data/simple-lists";

export const generateMetadata = () => localizedTitle("Labels & packaging");

export default function Page() {
  return <Suspense fallback={null}><ComponentsPage /></Suspense>;
}
