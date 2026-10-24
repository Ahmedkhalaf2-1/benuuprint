import { localizedTitle } from "@/i18n/server";
import { PatternDetailPage } from "@/features/master-data/patterns";

export const generateMetadata = () => localizedTitle("Pattern");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PatternDetailPage id={(await params).id} />;
}
