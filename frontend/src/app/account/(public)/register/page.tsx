import { getI18n, localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { RegisterForm } from "@/features/portal/auth/signup";

export const generateMetadata = () => localizedTitle("Create account");

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t.text("Customer account")}</p>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{t.text("Create your account")}</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted-foreground">{t.text("Request samples, follow production and track delivery in one place.")}</p>
      <Suspense fallback={null}><RegisterForm /></Suspense>
    </>
  );
}
