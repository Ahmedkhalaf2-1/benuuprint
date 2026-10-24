import type { ReactNode } from "react";
import { AuthSplit } from "@/components/layout/auth-split";
import { AuthProvider } from "@/features/auth/auth-provider";
import { getI18n } from "@/i18n/server";

/** Staff sign-in: same composition as the customer sign-in, system wording. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <AuthProvider>
      <AuthSplit footer={t.text("Staff access only · Activity is audited")} eyebrow={t.text("Factory operating system")} headline={[t.text("One view of every sample,"), t.text("order and job on the floor.")]}>{children}</AuthSplit>
    </AuthProvider>
  );
}
