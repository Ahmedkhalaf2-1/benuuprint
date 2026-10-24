import type { ReactNode } from "react";
import { AuthSplit } from "@/components/layout/auth-split";

/** Customer sign-in family (login, forgot / reset password, activate): same composition as the staff sign-in, customer wording. */
export default function PublicAccountLayout({ children }: { children: ReactNode }) {
  return <AuthSplit footer="Benuu Print customer account" eyebrow="Customer account" headline={["From first sample", "to delivery, in one place."]}>{children}</AuthSplit>;
}
