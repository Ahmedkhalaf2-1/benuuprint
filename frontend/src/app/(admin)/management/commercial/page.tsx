import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { CommercialPage } from "@/features/management/pages";

export const generateMetadata = () => localizedTitle("Commercial");

export default function Page() {
  return <Suspense fallback={null}><CommercialPage /></Suspense>;
}
