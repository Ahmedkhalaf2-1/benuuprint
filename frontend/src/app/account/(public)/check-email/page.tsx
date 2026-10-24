import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { CheckEmailPanel } from "@/features/portal/auth/signup";

export const generateMetadata = () => localizedTitle("Check your email");

export default function Page() {
  return <Suspense fallback={null}><CheckEmailPanel /></Suspense>;
}
