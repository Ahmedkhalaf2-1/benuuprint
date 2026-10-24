import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { AlertsPage } from "@/features/management/pages";

export const generateMetadata = () => localizedTitle("Alerts");

export default function Page() {
  return <Suspense fallback={null}><AlertsPage /></Suspense>;
}
