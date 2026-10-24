import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfiguratorPage } from "@/features/master-data/configurator-page";

export const metadata: Metadata = { title: "Configurator options" };

export default function Page() {
  return <Suspense fallback={null}><ConfiguratorPage /></Suspense>;
}
