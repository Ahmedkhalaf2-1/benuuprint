"use client";

import { DropdownMenu as D } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const DropdownMenu = D.Root;
export const DropdownMenuTrigger = D.Trigger;

export function DropdownMenuContent({ className, align = "end", sideOffset = 6, ...props }: ComponentProps<typeof D.Content>) {
  return (
    <D.Portal>
      <D.Content align={align} sideOffset={sideOffset} className={cn("z-50 min-w-48 rounded-md border bg-surface p-1 shadow-md", className)} {...props} />
    </D.Portal>
  );
}

export function DropdownMenuItem({ className, destructive, ...props }: ComponentProps<typeof D.Item> & { destructive?: boolean }) {
  return (
    <D.Item className={cn("flex h-8 cursor-pointer select-none items-center gap-2 rounded-sm px-2 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-white/5 [&_svg]:size-4", destructive && "text-danger", className)} {...props} />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof D.Label>) {
  return <D.Label className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof D.Separator>) {
  return <D.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}
