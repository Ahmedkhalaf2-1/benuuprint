"use client";

import { RadioGroup as R } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export function RadioGroup({ className, ...props }: ComponentProps<typeof R.Root>) {
  return <R.Root className={cn("grid gap-2", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: ComponentProps<typeof R.Item>) {
  return (
    <R.Item className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border bg-surface data-[state=checked]:border-brand disabled:opacity-50", className)} {...props}>
      <R.Indicator className="size-2 rounded-full bg-brand" />
    </R.Item>
  );
}
