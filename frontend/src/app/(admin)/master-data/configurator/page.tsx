import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { ConfiguratorPage } from "@/features/master-data/configurator-page";

export const generateMetadata = () => localizedTitle("Configurator options");

export default function Page() {
  return <Suspense fallback={null}><ConfiguratorPage /></Suspense>;
}
