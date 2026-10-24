"use client";

import { Popover as P } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;

export function PopoverContent({ className, align = "start", sideOffset = 6, ...props }: ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content align={align} sideOffset={sideOffset} collisionPadding={8} className={cn("z-50 w-72 rounded-md border bg-surface p-3 shadow-md", className)} {...props} />
    </P.Portal>
  );
}
