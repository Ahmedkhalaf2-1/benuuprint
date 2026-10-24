"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LayoutDashboard, Package, Shirt, UserRound } from "lucide-react";
import { PageSkeleton } from "@/components/feedback/states";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useCustomerAuth } from "./auth/customer-auth-provider";

const NAV = [
  { label: "Dashboard", href: "/account", icon: LayoutDashboard, match: (p: string) => p === "/account" },
  { label: "My samples", href: "/account/samples", icon: Shirt, match: (p: string) => p.startsWith("/account/samples") },
  { label: "My orders", href: "/account/orders", icon: Package, match: (p: string) => p.startsWith("/account/orders") },
  { label: "Profile", href: "/account/profile", icon: UserRound, match: (p: string) => p.startsWith("/account/profile") },
] as const;

/** Unauthenticated → the customer login (never the staff one). */
export function PortalGuard({ children }: { children: ReactNode }) {
  const { status } = useCustomerAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { if (status === "unauthenticated") router.replace(`/account/login?next=${encodeURIComponent(pathname)}`); }, [status, router, pathname]);
  if (status !== "authenticated") return <div className="mx-auto max-w-5xl px-4 py-8"><PageSkeleton /></div>;
  return <>{children}</>;
}

/**
 * Customer portal frame: calmer than the staff app, same Benue Print language. One `nav` element: a top tab bar from sm up and a
 * fixed bottom tab bar on phones (large touch targets, icon + label), so the four destinations are always one thumb-tap away.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const { customer, logout } = useCustomerAuth();
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-surface-sunken">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-x-6 px-4 sm:h-16">
          <Link href="/account" aria-label="Benue Print — my account"><Brand /></Link>
          <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-surface-sunken pb-[env(safe-area-inset-bottom)] sm:static sm:order-2 sm:flex sm:gap-1 sm:border-0 sm:bg-transparent sm:pb-0">
            {NAV.map((n) => {
              const active = n.match(pathname);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] transition-colors active:bg-white/5 sm:min-h-0 sm:h-9 sm:flex-row sm:gap-2 sm:rounded-sm sm:px-3 sm:text-sm sm:normal-case sm:tracking-normal", active ? "text-foreground before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:bg-brand sm:bg-brand-soft/60 sm:before:inset-x-3 sm:before:top-auto sm:before:bottom-0" : "text-muted-foreground hover:text-foreground sm:hover:bg-white/5")}>
                  <n.icon aria-hidden className={cn("size-5 sm:size-4", active && "text-brand")} />{n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 sm:order-3">
            <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline" data-testid="portal-customer">{customer?.name}</span>
            <Button variant="secondary" size="sm" onClick={() => void logout()}>Sign out</Button>
          </div>
        </div>
      </header>
      <main className="bp-enter mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 sm:py-10 sm:pb-10">{children}</main>
      <footer className="hidden border-t bg-surface-sunken px-4 py-4 text-center text-xs text-muted-foreground sm:block">Benue Print · Questions? Contact your Benue Print team.</footer>
    </div>
  );
}
