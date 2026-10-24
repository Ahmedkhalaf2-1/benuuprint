import type { ReactNode } from "react";
import { CustomerAuthProvider } from "@/features/portal/auth/customer-auth-provider";

/** The customer portal has its own auth provider: independent from the staff one (separate token, cookies and refresh route). */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <CustomerAuthProvider>{children}</CustomerAuthProvider>;
}
