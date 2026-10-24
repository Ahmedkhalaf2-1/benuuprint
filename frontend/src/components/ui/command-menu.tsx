"use client";

import { Command } from "cmdk";
import { Dialog as D } from "radix-ui";
import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/i18n/provider";

export interface CommandItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

/**
 * Command palette shell. Backend has no global search endpoint, so this only lists navigation
 * commands; `onQueryChange` is the hook where future search results will plug in.
 */
export function CommandMenu({
  open,
  onOpenChange,
  groups,
  emptyText = "No matching commands.",
  onQueryChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandGroup[];
  emptyText?: string;
  onQueryChange?: (q: string) => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <D.Content aria-describedby={undefined} className="fixed start-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-lg border bg-surface shadow-lg ltr:-translate-x-1/2 rtl:translate-x-1/2">
          <D.Title className="sr-only">{t("common.commandMenu")}</D.Title>
          <Command label={t("common.commandMenu")} loop>
            <Command.Input
              autoFocus
              onValueChange={onQueryChange}
              placeholder={t("common.typeACommand")}
              className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Command.List className="max-h-80 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</Command.Empty>
              {groups.map((g) => (
                <Command.Group key={g.heading} heading={g.heading} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                  {g.items.map((i) => (
                    <Command.Item
                      key={i.id}
                      value={`${g.heading} ${i.label}`}
                      onSelect={() => {
                        onOpenChange(false);
                        i.onSelect();
                      }}
                      className="flex h-9 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm data-[selected=true]:bg-white/5 [&_svg]:size-4 [&_svg]:text-muted-foreground"
                    >
                      {i.icon}
                      {i.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
