import { getI18n, localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { ActivateForm } from "@/features/portal/auth/forms";

export const generateMetadata = () => localizedTitle("Activate your account");

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t.text("Customer account")}</p>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{t.text("Activate your account")}</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted-foreground">{t.text("Choose a password to finish setting up your account.")}</p>
      <Suspense fallback={null}><ActivateForm /></Suspense>
    </>
  );
}
