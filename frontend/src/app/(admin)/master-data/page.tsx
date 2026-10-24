import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { MasterDataOverviewPage } from "@/features/master-data/overview-page";

export const generateMetadata = () => localizedTitle("Master data");

export default function Page() {
  return <Suspense fallback={null}><MasterDataOverviewPage /></Suspense>;
}
