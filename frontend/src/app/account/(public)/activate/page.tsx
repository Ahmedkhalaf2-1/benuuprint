import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivateForm } from "@/features/portal/auth/forms";

export const metadata: Metadata = { title: "Activate your account" };

export default function Page() {
  return (
    <>
      <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">Customer account</p>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">Activate your account</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted-foreground">Choose a password to finish setting up your account.</p>
      <Suspense fallback={null}><ActivateForm /></Suspense>
    </>
  );
}
