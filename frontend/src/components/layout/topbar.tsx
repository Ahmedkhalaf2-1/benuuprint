"use client";

import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { useAuth } from "@/features/auth/auth-provider";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { useI18n } from "@/i18n/provider";

export function Topbar({ collapsed, onToggleCollapsed, onOpenDrawer, onOpenSearch }: { collapsed: boolean; onToggleCollapsed: () => void; onOpenDrawer: () => void; onOpenSearch: () => void }) {
  const { t, fmt } = useI18n();
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] shrink-0 items-center gap-2 border-b bg-surface-sunken px-3 sm:px-4">
      <IconButton label={t("common.openNavigation")} icon={<Menu />} className="lg:hidden" onClick={onOpenDrawer} />
      <IconButton label={collapsed ? t("common.expandSidebar") : t("common.collapseSidebar")} icon={collapsed ? <PanelLeftOpen className="rtl:rotate-180" /> : <PanelLeftClose className="rtl:rotate-180" />} className="hidden lg:inline-flex" onClick={onToggleCollapsed} aria-expanded={!collapsed} />

      <Button variant="secondary" onClick={onOpenSearch} className="h-9 min-w-0 max-w-sm flex-1 shrink justify-start gap-2 text-muted-foreground" aria-label={t("common.searchOrRunACommand")}>
        <Search aria-hidden />
        <span className="truncate font-normal">{t("common.search")}</span>
        <kbd className="ms-auto hidden rounded-sm border bg-surface-muted px-1.5 font-mono text-[0.625rem] sm:inline">⌘K</kbd>
      </Button>

      <div className="ms-auto flex items-center gap-1">
        <LanguageSwitcher className="hidden sm:inline-flex" />
        <LanguageSwitcher compact className="sm:hidden" />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={t("common.accountMenu")} className="rounded-full"><Avatar name={user?.name ?? "?"} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>
              <span className="block text-sm font-medium text-foreground">{user?.name}</span>
              <span className="block">{user?.email}</span>
              {user?.roles.length ? <span className="mt-0.5 block">{user.roles.map((r) => (t.has("roles", r.code) ? fmt.role(r.code) : (r.name ?? r.code))).join(t("common.listSeparator"))}</span> : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logout()}><LogOut />{" "}{t("common.signOut")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void logout({ all: true })}><LogOut />{" "}{t("common.signOutOfAllDevices")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
