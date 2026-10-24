"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CommandMenu, type CommandGroup } from "@/components/ui/command-menu";
import { Drawer } from "@/components/ui/drawer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { filterNav } from "@/features/navigation/nav-config";
import { useAuth } from "@/features/auth/auth-provider";
import { Sidebar, SidebarNav } from "./sidebar";
import { Topbar } from "./topbar";
import { useI18n } from "@/i18n/provider";

const COLLAPSE_KEY = "bp.sidebar.collapsed";

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const auth = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);

  // Per-viewer convenience only; the shell renders fine without storage.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read after hydration to avoid an SSR mismatch
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch {}
      return !c;
    });

  const groups = useMemo<CommandGroup[]>(
    () => [{ heading: t("common.goTo"), items: filterNav(auth).flatMap((s) => s.items).map((i) => ({ id: i.href, label: t.text(i.label), icon: <i.icon aria-hidden />, onSelect: () => router.push(i.href) })) }],
    [auth, router, t],
  );

  return (
    <TooltipProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow">{t("common.skipToContent")}</a>
      <div className="flex min-h-dvh">
        <Sidebar collapsed={collapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar collapsed={collapsed} onToggleCollapsed={toggle} onOpenDrawer={() => setDrawer(true)} onOpenSearch={() => setSearch(true)} />
          <main id="main" className="bp-enter min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
        </div>
      </div>
      <Drawer open={drawer} onOpenChange={setDrawer} title={t("common.brand")} side="start">
        <div className="flex h-full flex-col"><SidebarNav onNavigate={() => setDrawer(false)} /></div>
      </Drawer>
      <CommandMenu open={search} onOpenChange={setSearch} groups={groups} emptyText={t("common.noMatchingCommandsGlobalSearchIs")} />
    </TooltipProvider>
  );
}

