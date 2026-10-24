import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { ManagementDashboard } from "@/features/management/pages";

export const generateMetadata = () => localizedTitle("Dashboard");

export default function Page() {
  return <Suspense fallback={null}><ManagementDashboard /></Suspense>;
}
