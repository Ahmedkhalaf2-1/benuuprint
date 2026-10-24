import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/features/portal/auth/signup";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return (
    <>
      <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">Customer account</p>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">Create your account</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted-foreground">Request samples, follow production and track delivery in one place.</p>
      <Suspense fallback={null}><RegisterForm /></Suspense>
    </>
  );
}
