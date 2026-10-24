import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckEmailPanel } from "@/features/portal/auth/signup";

export const metadata: Metadata = { title: "Check your email" };

export default function Page() {
  return <Suspense fallback={null}><CheckEmailPanel /></Suspense>;
}
