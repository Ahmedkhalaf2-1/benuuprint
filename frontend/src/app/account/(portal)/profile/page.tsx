import { localizedTitle } from "@/i18n/server";
import { ProfilePage } from "@/features/portal/profile";

export const generateMetadata = () => localizedTitle("Profile");

export default function Page() {
  return <ProfilePage />;
}
