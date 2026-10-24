import type { ReactNode } from "react";
import { AuthSplit } from "@/components/layout/auth-split";
import { getI18n } from "@/i18n/server";

/** Customer sign-in family (login, forgot / reset password, activate): same composition as the staff sign-in, customer wording. */
export default async function PublicAccountLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return <AuthSplit footer={t.text("Benuu Print customer account")} eyebrow={t.text("Customer account")} headline={[t.text("From first sample"), t.text("to delivery, in one place.")]}>{children}</AuthSplit>;
}
