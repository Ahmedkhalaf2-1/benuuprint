import type { Metadata } from "next";
import { ProfilePage } from "@/features/portal/profile";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <ProfilePage />;
}
