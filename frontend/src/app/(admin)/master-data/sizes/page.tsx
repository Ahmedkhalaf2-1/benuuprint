import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { SizesPage } from "@/features/master-data/simple-lists";

export const generateMetadata = () => localizedTitle("Sizes");

export default function Page() {
  return <Suspense fallback={null}><SizesPage /></Suspense>;
}
