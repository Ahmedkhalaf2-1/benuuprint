import { localizedTitle } from "@/i18n/server";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const generateMetadata = () => localizedTitle("Team");

export default function Page() {
  return <ModulePlaceholder title="Team" description="Staff, roles and permissions." />;
}
