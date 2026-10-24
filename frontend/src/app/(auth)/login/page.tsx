import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">Staff access</p>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">Sign in</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted-foreground">Use your Benue Print staff account.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
