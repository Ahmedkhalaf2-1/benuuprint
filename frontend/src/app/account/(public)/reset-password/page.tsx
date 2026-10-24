import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/features/portal/auth/forms";

export const metadata: Metadata = { title: "Reset password" };

export default function Page() {
  return (
    <>
      <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">Customer account</p>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">Choose a new password</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted-foreground">Pick a password you have not used here before.</p>
      <Suspense fallback={null}><ResetPasswordForm /></Suspense>
    </>
  );
}
