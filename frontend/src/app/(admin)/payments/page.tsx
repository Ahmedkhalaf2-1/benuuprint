import { localizedTitle } from "@/i18n/server";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const generateMetadata = () => localizedTitle("Payments");

export default function Page() {
  return <ModulePlaceholder title="Payments" description="Payment verification." />;
}
