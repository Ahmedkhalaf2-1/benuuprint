import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { AdminGuard } from "@/features/auth/admin-guard";
import { AuthProvider } from "@/features/auth/auth-provider";
import { REFRESH_COOKIE } from "@/lib/auth/bff";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Cheap server-side gate (no session cookie -> login). Real validation happens on the first API call.
  if (!(await cookies()).has(REFRESH_COOKIE)) redirect("/login");
  return (
    <AuthProvider>
      <AdminShell>
        <AdminGuard>{children}</AdminGuard>
      </AdminShell>
    </AuthProvider>
  );
}
