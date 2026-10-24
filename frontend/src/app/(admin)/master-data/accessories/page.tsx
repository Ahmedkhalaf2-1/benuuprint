import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { AccessoriesPage } from "@/features/master-data/simple-lists";

export const generateMetadata = () => localizedTitle("Accessories");

export default function Page() {
  return <Suspense fallback={null}><AccessoriesPage /></Suspense>;
}
