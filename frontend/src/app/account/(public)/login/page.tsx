import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerLoginForm } from "@/features/portal/auth/forms";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <>
      <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">Customer account</p>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">Welcome back</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted-foreground">Sign in to follow your sample requests.</p>
      <Suspense fallback={null}><CustomerLoginForm /></Suspense>
    </>
  );
}
