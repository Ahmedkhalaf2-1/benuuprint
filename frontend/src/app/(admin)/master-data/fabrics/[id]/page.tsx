import type { Metadata } from "next";
import { FabricDetailPage } from "@/features/master-data/fabrics";

export const metadata: Metadata = { title: "Fabric" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <FabricDetailPage id={(await params).id} />;
}
