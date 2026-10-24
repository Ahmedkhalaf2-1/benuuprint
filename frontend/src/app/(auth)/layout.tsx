import type { ReactNode } from "react";
import { AuthSplit } from "@/components/layout/auth-split";
import { AuthProvider } from "@/features/auth/auth-provider";

/** Staff sign-in: same composition as the customer sign-in, system wording. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthSplit footer="Staff access only · Activity is audited" eyebrow="Factory operating system" headline={["One view of every sample,", "order and job on the floor."]}>{children}</AuthSplit>
    </AuthProvider>
  );
}
