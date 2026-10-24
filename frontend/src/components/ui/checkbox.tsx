"use client";

import { Check } from "lucide-react";
import { Checkbox as C } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export function Checkbox({ className, ...props }: ComponentProps<typeof C.Root>) {
  return (
    <C.Root className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border bg-surface data-[state=checked]:border-brand data-[state=checked]:bg-brand disabled:opacity-50", className)} {...props}>
      <C.Indicator><Check aria-hidden className="size-3 text-white" strokeWidth={3} /></C.Indicator>
    </C.Root>
  );
}
