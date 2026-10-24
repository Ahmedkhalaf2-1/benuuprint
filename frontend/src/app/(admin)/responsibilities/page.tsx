import { localizedTitle } from "@/i18n/server";
import { ResponsibilitiesPage } from "@/features/responsibilities/responsibilities-page";

export const generateMetadata = () => localizedTitle("Factory Responsibilities");

export default function Page() {
  return <ResponsibilitiesPage />;
}
