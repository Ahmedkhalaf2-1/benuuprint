"use client";

import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const isHex = (v: string | null | undefined): v is string => !!v && HEX.test(v);

const sizes = { sm: "size-4", md: "size-6", lg: "size-10" } as const;

/**
 * Colour preview with an always-available text alternative. Not every colour has a hex: those get a neutral
 * striped fallback (never a guessed colour). `showLabel` renders name / hex / pantone / code beside the chip.
 */
export function ColorSwatch({
  name,
  hex,
  pantone,
  code,
  size = "md",
  showLabel = true,
  muted,
  className,
}: {
  name: string;
  hex?: string | null;
  pantone?: string | null;
  code?: string | null;
  size?: keyof typeof sizes;
  showLabel?: boolean;
  /** e.g. unavailable colours. */
  muted?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const valid = isHex(hex);
  const description = valid ? `${name}, ${hex!.toUpperCase()}` : `${name}, ${t("common.noColourValue")}`;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", muted && "opacity-60", className)}>
      <span
        role="img"
        aria-label={showLabel ? undefined : description}
        aria-hidden={showLabel ? true : undefined}
        data-fallback={valid ? undefined : "true"}
        className={cn("shrink-0 rounded-md border border-white/20", sizes[size])}
        style={
          valid
            ? { backgroundColor: hex! }
            : { backgroundImage: "repeating-linear-gradient(45deg, var(--tone-neutral-bg) 0 4px, var(--surface) 4px 8px)" }
        }
      />
      {showLabel ? (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {[valid ? hex!.toUpperCase() : t("common.noColourValueCap"), pantone ? t("common.pantoneValue", { value: pantone }) : null, code].filter(Boolean).join(" · ")}
          </span>
        </span>
      ) : null}
    </span>
  );
}
