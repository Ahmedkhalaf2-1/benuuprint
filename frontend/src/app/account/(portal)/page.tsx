import { localizedTitle } from "@/i18n/server";
import { PortalDashboard } from "@/features/portal/dashboard";

export const generateMetadata = () => localizedTitle("My account");

export default function Page() {
  return <PortalDashboard />;
}
