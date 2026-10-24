import type { Metadata } from "next";
import { Suspense } from "react";
import { ManagementDashboard } from "@/features/management/pages";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return <Suspense fallback={null}><ManagementDashboard /></Suspense>;
}
