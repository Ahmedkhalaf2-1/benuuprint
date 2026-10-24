import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <ModulePlaceholder title="Settings" description="System configuration." />;
}
