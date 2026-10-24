import { getI18n, localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export const generateMetadata = () => localizedTitle("Sign in");

export default async function LoginPage() {
  const { t } = await getI18n();
  return (
    <>
      <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t.text("Staff access")}</p>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{t.text("Sign in")}</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted-foreground">{t.text("Use your Benuu Print staff account.")}</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
