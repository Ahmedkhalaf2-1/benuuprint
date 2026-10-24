import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { ProductTypesPage } from "@/features/master-data/product-types";

export const generateMetadata = () => localizedTitle("Product types");

export default function Page() {
  return <Suspense fallback={null}><ProductTypesPage /></Suspense>;
}
