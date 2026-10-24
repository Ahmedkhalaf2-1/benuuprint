import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const metadata: Metadata = { title: "Payments" };

export default function Page() {
  return <ModulePlaceholder title="Payments" description="Payment verification." />;
}
