import type { Metadata } from "next";
import { PortalDashboard } from "@/features/portal/dashboard";

export const metadata: Metadata = { title: "My account" };

export default function Page() {
  return <PortalDashboard />;
}
