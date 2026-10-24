import { getI18n, localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { CustomerLoginForm } from "@/features/portal/auth/forms";

export const generateMetadata = () => localizedTitle("Sign in");

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t.text("Customer account")}</p>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{t.text("Welcome back")}</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted-foreground">{t.text("Sign in to follow your sample requests.")}</p>
      <Suspense fallback={null}><CustomerLoginForm /></Suspense>
    </>
  );
}
