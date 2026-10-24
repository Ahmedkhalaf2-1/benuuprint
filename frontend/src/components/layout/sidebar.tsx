"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { filterNav } from "@/features/navigation/nav-config";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils/cn";
import { Brand } from "./brand";

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const auth = useAuth();
  const sections = filterNav(auth);

  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-3">
      {sections.map((section) => (
        <div key={section.title} className="mb-4">
          {collapsed ? <div className="mx-2 mb-1.5 h-px bg-border" aria-hidden /> : <h2 className="px-2.5 pb-1.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">{section.title}</h2>}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
                    active && "bg-brand-soft/60 text-foreground hover:bg-brand-soft/60 before:absolute before:inset-y-1.5 before:start-0 before:w-0.5 before:rounded-full before:bg-brand",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <item.icon aria-hidden className={cn("size-4 shrink-0 transition-colors", active && "text-brand")} />
                  {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                </Link>
              );
              return <li key={item.href}>{collapsed ? <Tooltip content={item.label}>{link}</Tooltip> : link}</li>;
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-e bg-surface-sunken transition-[width] lg:flex", collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]")}
    >
      <div className={cn("flex h-[var(--topbar-height)] shrink-0 items-center border-b px-4", collapsed && "justify-center px-0")}>
        <Brand collapsed={collapsed} />
      </div>
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
