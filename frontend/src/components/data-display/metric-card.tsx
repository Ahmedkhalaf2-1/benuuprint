import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Card } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "danger" | "warning";
  className?: string;
}) {
  return (
    <Card variant={tone === "danger" || tone === "warning" ? "attention" : "default"} className={cn("p-3.5", className)}>
      <div className="flex items-center justify-between gap-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <span>{label}</span>
        {icon ? <span aria-hidden className="[&_svg]:size-4">{icon}</span> : null}
      </div>
      <div className={cn("mt-2 text-[1.75rem] font-semibold tabular-nums leading-none tracking-tight", tone === "danger" && "text-danger", tone === "warning" && "text-tone-warning-fg")}>
        {value}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
