"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Side sheet built on Dialog (focus trap, Escape, scroll lock). `side` is logical: start/end. */
export function Drawer({
  open,
  onOpenChange,
  title,
  side = "end",
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: "start" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <D.Content
          aria-describedby={undefined}
          className={cn("fixed inset-y-0 z-50 flex w-[min(22rem,90vw)] flex-col bg-surface-sunken shadow-2xl", side === "start" ? "start-0 border-e" : "end-0 border-s", className)}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <D.Title className="text-base font-semibold">{title}</D.Title>
            <D.Close aria-label="Close" className="rounded-sm p-1 text-muted-foreground hover:bg-white/5">
              <X aria-hidden className="size-4" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
