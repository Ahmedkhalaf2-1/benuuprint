import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const metadata: Metadata = { title: "Quotations" };

export default function Page() {
  return <ModulePlaceholder title="Quotations" description="Quotations and commercial approval." />;
}
