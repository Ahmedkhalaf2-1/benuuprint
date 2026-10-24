import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { BrandsPage } from "@/features/brands/brands-page";

export const generateMetadata = () => localizedTitle("Brands");

export default function Page() {
  return <Suspense fallback={null}><BrandsPage /></Suspense>;
}
