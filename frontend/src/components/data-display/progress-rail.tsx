import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type RailState = "DONE" | "ACTIVE" | "PENDING";
export interface RailStep { code: string; label: string; state: RailState }

/**
 * Vertical production/progress rail: the manufacturing language of the public Process section, simplified for the customer.
 * Done = emerald, active = emerald ring with a soft ping, pending = hollow. State is also spoken ("Done" / "In progress" / "Not started").
 */
export function ProgressRail({ steps, label, testId, phase, compact, className }: { steps: RailStep[]; label: string; testId?: string; phase?: string; compact?: boolean; className?: string }) {
  return (
    <ol aria-label={label} data-testid={testId} data-phase={phase} className={cn("relative", className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const next = steps[i + 1];
        return (
          <li key={s.code} data-state={s.state} data-code={s.code} className={cn("relative flex items-center gap-4", last ? "" : compact ? "pb-4" : "pb-6")}>
            {last ? null : <span aria-hidden className={cn("absolute start-[11px] top-6 w-px", compact ? "h-[calc(100%-1.5rem)]" : "h-[calc(100%-1.5rem)]", s.state === "DONE" && next?.state !== "PENDING" ? "bg-brand" : s.state === "DONE" ? "bg-gradient-to-b from-brand to-border" : "bg-border")} />}
            <span aria-hidden className={cn("relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-surface", s.state === "DONE" && "border-brand bg-brand-fill text-white", s.state === "ACTIVE" && "border-brand text-brand", s.state === "PENDING" && "border-dashed border-border-strong")}>
              {s.state === "DONE" ? <Check className="size-3.5" /> : s.state === "ACTIVE" ? <><span className="bp-ping absolute inset-0 rounded-full bg-brand" /><span className="size-2 rounded-full bg-brand" /></> : null}
            </span>
            <span className="flex min-w-0 flex-1 items-baseline gap-3 text-sm">
              <span className="font-mono text-[0.6875rem] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className={cn(s.state === "PENDING" && "text-muted-foreground", s.state === "ACTIVE" && "font-semibold text-foreground")}>{s.label}</span>
            </span>
            <span className="sr-only">{s.state === "DONE" ? "Done" : s.state === "ACTIVE" ? "In progress" : "Not started"}</span>
          </li>
        );
      })}
    </ol>
  );
}
