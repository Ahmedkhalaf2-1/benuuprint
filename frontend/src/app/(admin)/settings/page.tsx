import { localizedTitle } from "@/i18n/server";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const generateMetadata = () => localizedTitle("Settings");

export default function Page() {
  return <ModulePlaceholder title="Settings" description="System configuration." />;
}
