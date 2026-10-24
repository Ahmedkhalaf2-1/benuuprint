import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type Severity = "INFO" | "WARNING" | "CRITICAL";

const config = {
  INFO: { label: "Info", cls: "bg-tone-progress-bg text-tone-progress-fg", Icon: Info },
  WARNING: { label: "Warning", cls: "bg-tone-warning-bg text-tone-warning-fg", Icon: AlertTriangle },
  CRITICAL: { label: "Critical", cls: "bg-tone-danger-bg text-tone-danger-fg", Icon: AlertOctagon },
} as const;

export function SeverityBadge({
  severity,
  iconOnly = false,
  className,
}: {
  severity: Severity | string;
  iconOnly?: boolean;
  className?: string;
}) {
  const c = config[severity as Severity] ?? config.INFO;
  const Icon = c.Icon;
  return (
    <span
      role="status"
      data-severity={severity}
      aria-label={`Severity: ${c.label}`}
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm px-1.5 text-[0.75rem] font-medium leading-none",
        c.cls,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {iconOnly ? <span className="sr-only">{c.label}</span> : c.label}
    </span>
  );
}
