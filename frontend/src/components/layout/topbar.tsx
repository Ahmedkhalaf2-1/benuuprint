"use client";

import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { useAuth } from "@/features/auth/auth-provider";
import { NotificationBell } from "@/features/notifications/notification-bell";

export function Topbar({ collapsed, onToggleCollapsed, onOpenDrawer, onOpenSearch }: { collapsed: boolean; onToggleCollapsed: () => void; onOpenDrawer: () => void; onOpenSearch: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] shrink-0 items-center gap-2 border-b bg-surface-sunken px-3 sm:px-4">
      <IconButton label="Open navigation" icon={<Menu />} className="lg:hidden" onClick={onOpenDrawer} />
      <IconButton label={collapsed ? "Expand sidebar" : "Collapse sidebar"} icon={collapsed ? <PanelLeftOpen className="rtl:rotate-180" /> : <PanelLeftClose className="rtl:rotate-180" />} className="hidden lg:inline-flex" onClick={onToggleCollapsed} aria-expanded={!collapsed} />

      <Button variant="secondary" onClick={onOpenSearch} className="h-9 min-w-0 max-w-sm flex-1 shrink justify-start gap-2 text-muted-foreground" aria-label="Search or run a command">
        <Search aria-hidden />
        <span className="truncate font-normal">Search…</span>
        <kbd className="ms-auto hidden rounded-sm border bg-surface-muted px-1.5 font-mono text-[0.625rem] sm:inline">⌘K</kbd>
      </Button>

      <div className="ms-auto flex items-center gap-1">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Account menu" className="rounded-full"><Avatar name={user?.name ?? "?"} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>
              <span className="block text-sm font-medium text-foreground">{user?.name}</span>
              <span className="block">{user?.email}</span>
              {user?.roles.length ? <span className="mt-0.5 block">{user.roles.map((r) => r.name ?? r.code).join(", ")}</span> : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logout()}><LogOut /> Sign out</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void logout({ all: true })}><LogOut /> Sign out of all devices</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
