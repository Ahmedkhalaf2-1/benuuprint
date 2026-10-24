"use client";

import { Progress as P } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export function Progress({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <P.Root value={v} aria-label={label} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-border", className)}>
      <P.Indicator className="h-full bg-brand transition-[width]" style={{ width: `${v}%` }} />
    </P.Root>
  );
}
