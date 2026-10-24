import { localizedTitle } from "@/i18n/server";
import { FabricDetailPage } from "@/features/master-data/fabrics";

export const generateMetadata = () => localizedTitle("Fabric");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <FabricDetailPage id={(await params).id} />;
}
