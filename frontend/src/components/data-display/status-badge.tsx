"use client";

import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

import { statusTone, toneClasses, toneShape, type DotShape } from "./status";

const shapeClass: Record<DotShape, string> = {
  solid: "rounded-full",
  ring: "rounded-full bg-transparent! border-[1.5px] border-current",
  square: "rounded-[1px]",
  diamond: "rotate-45 rounded-[1px]",
};

/**
 * The status code is the contract; only its display text is localised. In English the backend-provided label (if any) is kept as-is.
 * In other locales the canonical translation of the code wins, falling back to the label / humanised code.
 */
export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const { locale, t, fmt } = useI18n();
  const text = locale === "en" ? (label ?? fmt.code(status)) : (t.dyn("codes", status) ?? label ?? fmt.code(status));
  const tone = statusTone[status] ?? "neutral";
  const c = toneClasses[tone];
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-sm px-1.5 text-[0.75rem] font-medium leading-none ring-1 ring-inset ring-current/20",
        c.badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0", c.dot, shapeClass[toneShape[tone]])} />
      {text}
    </span>
  );
}
