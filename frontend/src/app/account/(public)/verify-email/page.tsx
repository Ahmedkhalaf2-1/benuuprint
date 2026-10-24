import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailPanel } from "@/features/portal/auth/signup";

/** The page holds a one-time token in its URL until it is consumed: keep it out of referrers and search results. */
export const metadata: Metadata = { title: "Verify your email", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense fallback={null}><VerifyEmailPanel /></Suspense>;
}
