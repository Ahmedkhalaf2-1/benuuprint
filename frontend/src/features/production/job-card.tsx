"use client";

import { AlertTriangle, Pause } from "lucide-react";
import Link from "next/link";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { cn } from "@/lib/utils/cn";

import type { BoardCard } from "./types";
import { useI18n } from "@/i18n/provider";

/** Board card for one stage occurrence of a job: only what the floor needs to decide what to open. */
export function JobCard({ card }: { card: BoardCard }) {
  const { t, fmt } = useI18n();
  const blocked = card.status === "BLOCKED";
  return (
    <li data-testid="job-card" data-status={card.status} className={cn("rounded-md border bg-surface p-2.5 text-sm shadow-xs", blocked && "border-tone-blocked-dot", card.isDelayed && "border-s-4 border-s-danger")}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/production/jobs/${card.jobId}?stage=${card.stageId}`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{card.jobNumber}</Link>
        <PriorityBadge priority={card.priority} />
      </div>
      <p className="mt-1 font-medium leading-tight">{card.productName}</p>
      <p className="truncate text-xs text-muted-foreground">{card.customerName} · {card.brandName}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={card.status} />
        {card.attempt > 1 ? <span className="rounded-sm bg-tone-warning-bg px-1.5 text-[0.6875rem] font-medium text-tone-warning-fg">{t("production.reworkAttemptAttempt2", { attempt: card.attempt })}</span> : null}
        {card.isOnHold ? <span className="inline-flex items-center gap-0.5 text-xs text-tone-warning-fg"><Pause aria-hidden className="size-3" />{" "}{t("production.onHold2")}</span> : null}
      </div>
      {blocked && card.blockReason ? <p className="mt-1.5 text-xs font-medium text-tone-blocked-fg">{t("production.blockedBlockreason", { blockReason: card.blockReason })}</p> : null}
      <p className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
        <span>{card.assignees.length ? card.assignees.map((a) => a.name).join(", ") : <span className="font-medium text-tone-warning-fg">{t("production.unassigned")}</span>}</span>
        {card.dueAt ? <span className={cn("inline-flex items-center gap-0.5", card.isDelayed && "font-medium text-tone-danger-fg")}>{card.isDelayed ? <AlertTriangle aria-hidden className="size-3" /> : null}{card.isDelayed ? t("production.overdue2") : t("production.due")}{fmt.date(card.dueAt)}</span> : null}
      </p>
    </li>
  );
}
