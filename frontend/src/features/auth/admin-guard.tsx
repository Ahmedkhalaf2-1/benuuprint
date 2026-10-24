"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AccessDeniedState, PageSkeleton } from "@/components/feedback/states";
import { findNavItem, landingPath } from "@/features/navigation/nav-config";
import { satisfies } from "@/lib/permissions";
import { useAuth } from "./auth-provider";

/**
 * Unauthenticated -> /login. Authenticated but lacking the route's permissions -> access denied
 * (never a redirect to login). UX only; the backend enforces every request.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.status === "unauthenticated") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [auth.status, router, pathname]);

  const item = findNavItem(pathname);
  const denied = auth.status === "authenticated" && item && !satisfies(auth, item);
  // The default landing page (/dashboard) is not for everyone: send those users to their first allowed page.
  const redirectHome = denied && pathname === "/dashboard";
  const home = landingPath(auth);

  useEffect(() => {
    if (redirectHome && home !== pathname) router.replace(home);
  }, [redirectHome, home, pathname, router]);

  if (auth.status !== "authenticated" || (redirectHome && home !== pathname)) return <PageSkeleton />;
  if (denied) return <AccessDeniedState />;
  return <>{children}</>;
}
