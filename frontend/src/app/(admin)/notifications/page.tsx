import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <ModulePlaceholder title="Notifications" description="Your in-app notifications. The bell in the top bar already works." />;
}
