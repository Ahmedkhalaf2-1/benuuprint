import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { FabricsPage } from "@/features/master-data/fabrics";

export const generateMetadata = () => localizedTitle("Fabrics");

export default function Page() {
  return <Suspense fallback={null}><FabricsPage /></Suspense>;
}
