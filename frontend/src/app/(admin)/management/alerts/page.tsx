import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertsPage } from "@/features/management/pages";

export const metadata: Metadata = { title: "Alerts" };

export default function Page() {
  return <Suspense fallback={null}><AlertsPage /></Suspense>;
}
