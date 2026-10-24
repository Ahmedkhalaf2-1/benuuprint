import type { Metadata } from "next";
import { ResponsibilitiesPage } from "@/features/responsibilities/responsibilities-page";

export const metadata: Metadata = { title: "Factory Responsibilities" };

export default function Page() {
  return <ResponsibilitiesPage />;
}
