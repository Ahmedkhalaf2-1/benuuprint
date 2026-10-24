import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Read-only reference card/list item for configurators (product, fabric, print method, accessory…).
 * Domain-agnostic: callers pass the pieces; `selected` / `onSelect` are optional so the same card can become a
 * selectable option later without a redesign.
 */
export function OptionCard({
  title,
  code,
  description,
  meta,
  badge,
  leading,
  selected,
  onSelect,
  className,
}: {
  title: string;
  code?: string;
  description?: string | null;
  meta?: ReactNode;
  badge?: ReactNode;
  leading?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  const body = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{title}</span>
          {code ? <span className="font-mono text-xs text-muted-foreground">{code}</span> : null}
          {badge}
        </p>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        {meta ? <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{meta}</div> : null}
      </div>
    </>
  );
  const cls = cn("flex w-full items-start gap-3 rounded-lg border bg-surface p-3 text-start", selected && "border-brand bg-brand-soft/40", className);
  return onSelect ? (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={cn(cls, "hover:bg-surface-muted")}>{body}</button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
