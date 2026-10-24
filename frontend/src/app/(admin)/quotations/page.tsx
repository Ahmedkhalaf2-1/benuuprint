import { localizedTitle } from "@/i18n/server";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const generateMetadata = () => localizedTitle("Quotations");

export default function Page() {
  return <ModulePlaceholder title="Quotations" description="Quotations and commercial approval." />;
}
