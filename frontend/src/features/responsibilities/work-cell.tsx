"use client";

import Link from "next/link";
import type { Customer } from "@/features/customers/types";
import { cn } from "@/lib/utils/cn";
import { statusLabel } from "./labels";
import { useI18n } from "@/i18n/provider";

/**
 * The compact "what is happening now" cell of the customers list: the highest-priority live item from the backend's
 * `currentProcess`, and how many other active jobs there are. Read from the list summary; nothing is fetched per row.
 */
export function CurrentWorkCell({ c }: { c: Customer }) {
  const { t } = useI18n();
  const p = c.currentProcess;
  const total = c.activeJobCount ?? c.currentProcesses?.length ?? (p ? 1 : 0);
  if (!p) return <span className="text-muted-foreground" data-testid="no-work">{t("responsibilities.noActiveWork")}</span>;
  const more = total - 1;
  return (
    <Link href={`/customers/${c.id}`} className="block min-w-48 max-w-72 hover:underline" data-testid="current-work" data-blocked={p.blocked ? "true" : undefined}>
      <span className="flex flex-wrap items-center gap-x-2 text-xs"><span className="font-mono font-semibold">{p.referenceNumber}</span><span className="text-muted-foreground">{p.jobNumber}</span></span>
      <span className={cn("block text-sm font-semibold uppercase tracking-[-0.01em]", p.blocked && "text-tone-blocked-fg")}>{p.stageLabel}{p.blocked ? t("responsibilities.blocked") : ""}</span>
      <span className="block text-xs text-muted-foreground">{p.responsibleUser ? p.responsibleUser.name : <span className="font-medium text-tone-warning-fg">{t("responsibilities.needsAssignment")}</span>} · {p.blocked ? t("common.blocked") : statusLabel(p.status)} · <span className="tabular-nums">{p.progressPercent}%</span></span>
      {more > 0 ? <span className="block text-xs text-brand">{t.plural("responsibilities", "moreActiveJobs", more)}</span> : null}
    </Link>
  );
}
