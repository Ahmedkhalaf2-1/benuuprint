import { localizedTitle } from "@/i18n/server";
import { ModulePlaceholder } from "@/components/feedback/module-placeholder";

export const generateMetadata = () => localizedTitle("Notifications");

export default function Page() {
  return <ModulePlaceholder title="Notifications" description="Your in-app notifications. The bell in the top bar already works." />;
}
