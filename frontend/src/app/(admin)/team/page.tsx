import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <ModulePlaceholder title="Team" description="Staff, roles and permissions." />;
}
