import { Check, Pause, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { humanizeCode } from "@/lib/utils/format";
import type { SampleStatus } from "./types";

/** The normal path of a sample. ON_HOLD / REJECTED / CANCELLED are shown as a state on top of it. */
export const MAIN_PATH: SampleStatus[] = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "QUOTED", "AWAITING_PAYMENT", "READY_FOR_PRODUCTION", "IN_PRODUCTION", "AWAITING_APPROVAL", "APPROVED", "COMPLETED",
];

/**
 * Read-only lifecycle indicator. Steps are NOT interactive: transitions only happen through the explicit action buttons
 * (backend action routes). Position for ON_HOLD is the status held from; REJECTED/CANCELLED have no position.
 */
export function StatusTimeline({ status, holdPreviousStatus }: { status: SampleStatus; holdPreviousStatus?: SampleStatus | null }) {
  const effective = status === "ON_HOLD" ? holdPreviousStatus ?? null : status;
  const idx = effective ? MAIN_PATH.indexOf(effective) : -1;
  const ended = status === "REJECTED" || status === "CANCELLED";
  return (
    <div data-testid="status-timeline">
      <ol aria-label="Sample lifecycle" className="relative flex gap-1 overflow-x-auto pb-1">
        {MAIN_PATH.map((step, i) => {
          const done = idx >= 0 && i < idx;
          const current = i === idx && !ended;
          return (
            <li key={step} aria-current={current ? "step" : undefined} data-state={current ? "current" : done ? "done" : "todo"} className="min-w-[5.5rem] flex-1">
              <div className={cn("h-1.5 rounded-full", done ? "bg-brand" : current ? (status === "ON_HOLD" ? "bg-tone-warning-dot" : "bg-brand") : "bg-border", ended && "opacity-50")} />
              <p className={cn("mt-1.5 flex items-center gap-1 text-[0.6875rem] leading-tight", current ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {done ? <Check aria-hidden className="size-3 text-brand" /> : null}
                {current && status === "ON_HOLD" ? <Pause aria-hidden className="size-3 text-tone-warning-fg" /> : null}
                {humanizeCode(step)}
                {done ? <span className="sr-only"> (completed)</span> : null}
                {current ? <span className="sr-only"> (current{status === "ON_HOLD" ? ", on hold" : ""})</span> : null}
              </p>
            </li>
          );
        })}
      </ol>
      {ended ? (
        <p role="status" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-tone-danger-fg"><X aria-hidden className="size-4" /> {humanizeCode(status)} — no further steps</p>
      ) : status === "ON_HOLD" ? (
        <p role="status" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-tone-warning-fg"><Pause aria-hidden className="size-4" /> On hold{holdPreviousStatus ? ` (was ${humanizeCode(holdPreviousStatus)})` : ""}</p>
      ) : null}
    </div>
  );
}
