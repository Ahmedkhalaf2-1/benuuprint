import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { MyWorkPage } from "@/features/production/my-work-page";

export const generateMetadata = () => localizedTitle("My work");

export default function Page() {
  return <Suspense fallback={null}><MyWorkPage /></Suspense>;
}
