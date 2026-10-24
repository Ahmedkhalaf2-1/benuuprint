"use client";

import type { ReactNode } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils/cn";

/** Radio choices rendered as selectable cards (label + optional description). Fully keyboard accessible (Radix radio group). */
export function ChoiceGroup<T extends string>({
  name,
  value,
  onValueChange,
  options,
  className,
  "aria-label": ariaLabel,
  columns = 2,
}: {
  name: string;
  value: T;
  onValueChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string; description?: string; icon?: ReactNode; extra?: ReactNode }>;
  className?: string;
  "aria-label": string;
  columns?: 1 | 2 | 3 | 4;
}) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onValueChange(v as T)} aria-label={ariaLabel} className={cn("gap-2", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3", columns === 4 && "sm:grid-cols-2 xl:grid-cols-4", className)}>
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        return (
          <label key={o.value} htmlFor={id} className={cn("flex min-h-12 cursor-pointer items-start gap-3 rounded-md border bg-surface p-3.5 text-sm transition-colors hover:border-border-strong hover:bg-surface-muted active:scale-[0.995]", value === o.value && "border-brand bg-brand-soft/50 shadow-[inset_2px_0_0_var(--brand)] hover:border-brand hover:bg-brand-soft/50")}>
            <RadioGroupItem id={id} value={o.value} className="mt-0.5" />
            {o.icon ? <span aria-hidden className="shrink-0">{o.icon}</span> : null}
            <span className="min-w-0 flex-1"><span className={cn("block font-medium", value === o.value && "text-foreground")}>{o.label}</span>{o.description ? <span className="block text-xs text-muted-foreground">{o.description}</span> : null}{o.extra ? <span className="mt-1.5 block">{o.extra}</span> : null}</span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
