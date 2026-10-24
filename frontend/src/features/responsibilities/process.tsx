"use client";

import { getActive } from "@/i18n/active";
import { AlertTriangle, ArrowRight, Check, Circle, CircleDot, Minus, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";

import { clock, sourceLabel, statusLabel } from "./labels";
import type { Blocker, JobProcess, ProcessStage, Progress as ProgressT, StageSummary, UserRef, WorkItem } from "./types";
import { useI18n } from "@/i18n/provider";

export const jobHref = (jobId: string) => `/production/jobs/${jobId}`;
const OPEN = ["READY", "IN_PROGRESS", "BLOCKED"];

export type StageState = "completed" | "skipped" | "current" | "blocked" | "unassigned" | "waiting";
export function stageState(s: StageSummary, isCurrent: boolean): StageState {
  if (s.status === "COMPLETED") return "completed";
  if (s.status === "SKIPPED" || s.status === "CANCELLED") return "skipped";
  if (s.status === "BLOCKED" || s.blocker?.active) return "blocked";
  if (!s.responsibleUser && s.status && OPEN.includes(s.status)) return "unassigned";
  if (isCurrent || s.status === "IN_PROGRESS") return "current";
  return "waiting";
}

/** Status chip: colour carries state, wording is human ("Ready to start", never READY). */
export function StageChip({ state, status, hold }: { state: StageState; status?: string; hold?: boolean }) {
  const { t } = useI18n();
  const text = state === "unassigned" ? "Needs assignment" : statusLabel(status);
  const tone = state === "blocked" ? "bg-tone-blocked-bg text-tone-blocked-fg" : state === "unassigned" ? "bg-tone-warning-bg text-tone-warning-fg" : state === "current" ? "bg-brand text-white" : state === "completed" ? "bg-brand-soft/60 text-brand-hover" : "bg-surface-sunken text-muted-foreground";
  return <span data-testid="stage-chip" data-state={state} className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-sm px-2 text-xs font-semibold", tone)}>{hold ? t("responsibilities.onHold") : ""}{text}</span>;
}

const Person = ({ u }: { u: UserRef | null | undefined }) => {
  const { t } = useI18n();
  return (u ? <span className="font-medium">{u.name}</span> : <span className="font-medium text-tone-warning-fg">{t("responsibilities.noOneAssigned")}</span>);
};

function span(s: StageSummary): string | null {
  const a = clock(s.startedAt), b = clock(s.completedAt);
  const { t } = getActive();
  if (a && b) return t("responsibilities.stageSpan", { from: a, to: b });
  return a ? t("responsibilities.startedAtClock", { time: a }) : null;
}

/** Blocked time is shown only when the backend gave the blocker's start. */
function BlockedFor({ blocker }: { blocker: Blocker | null | undefined }) {
  const { fmt, t } = useI18n();
  const [now] = useState(() => Date.now());
  if (!blocker?.since) return null;
  const mins = (now - new Date(blocker.since).getTime()) / 60000;
  return Number.isFinite(mins) && mins >= 0 ? <p className="text-xs">{t("responsibilities.blockedForMins", { mins: fmt.duration(mins) })}</p> : null;
}

function BlockerCallout({ blocker }: { blocker: Blocker | null | undefined }) {
  const { t } = useI18n();
  if (!blocker?.active) return null;
  return (
    <div role="alert" data-testid="blocker" className="flex items-start gap-2 rounded-md border border-tone-blocked-fg/40 bg-tone-blocked-bg px-3 py-2 text-sm text-tone-blocked-fg">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div><p className="font-semibold">{t("common.blocked")}{blocker.reason ? ` — ${blocker.reason}` : ""}</p><BlockedFor blocker={blocker} /></div>
    </div>
  );
}

function UnassignedCallout({ label, assignHref }: { label: string; assignHref?: string | null }) {
  const { t } = useI18n();
  return (
    <div data-testid="needs-assignment" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-tone-warning-dot/50 bg-tone-warning-bg px-3 py-2 text-sm text-tone-warning-fg">
      <span className="flex items-center gap-2"><UserX aria-hidden className="size-4" /><span><span className="font-semibold">{t("responsibilities.needsAssignment")}</span>{" "}{t("responsibilities.labelHasNoResponsibleWorker", { label })}</span></span>
      {assignHref ? <Link href={assignHref} className="font-semibold underline">{t("responsibilities.assignWorker")}</Link> : null}
    </div>
  );
}

function Details({ s }: { s: ProcessStage }) {
  const { t, fmt } = useI18n();
  const rows: Array<[string, React.ReactNode]> = [
    [t.text("Responsible"), s.responsibleUser?.name ?? "No one assigned"],
    [t.text("Also working"), s.additionalUsers?.length ? s.additionalUsers.map((u) => u.name).join(", ") : null],
    ["Assignment", sourceLabel(s.assignmentSource)],
    [t.text("Assigned"), clock(s.assignedAt)], [t.text("Ready"), clock(s.readyAt)],
    [t.text("Started"), s.startedAt ? `${clock(s.startedAt)}${s.startedBy ? ` by ${s.startedBy.name}` : ""}` : null],
    [t.text("Completed"), s.completedAt ? `${clock(s.completedAt)}${s.completedBy ? ` by ${s.completedBy.name}` : ""}` : null],
    ["Duration", s.durationMinutes != null ? fmt.duration(s.durationMinutes) : null],
    [t.text("Due"), clock(s.dueAt)],
    ["Blocker", s.blocker?.active ? [s.blocker.reason, s.blocker.type].filter(Boolean).join(" · ") || "Blocked" : null],
  ];
  return (
    <details className="group mt-1.5 text-xs">
      <summary className="inline-flex min-h-6 cursor-pointer list-none items-center text-muted-foreground hover:text-foreground">{t("common.details")}</summary>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 rounded-sm border bg-surface-sunken/50 p-2">
        {rows.filter(([, v]) => v != null && v !== "").map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </details>
  );
}

function Rail({ state, last }: { state: StageState; last: boolean }) {
  const icon = state === "completed" ? <Check className="size-3.5" /> : state === "current" ? <CircleDot className="size-4" /> : state === "blocked" ? <AlertTriangle className="size-3.5" /> : state === "unassigned" ? <UserX className="size-3.5" /> : state === "skipped" ? <Minus className="size-3.5" /> : <Circle className="size-3" />;
  const tone = state === "completed" ? "border-brand bg-brand-fill text-white" : state === "current" ? "border-brand bg-surface text-brand" : state === "blocked" ? "border-tone-blocked-fg bg-tone-blocked-bg text-tone-blocked-fg" : state === "unassigned" ? "border-tone-warning-dot bg-tone-warning-bg text-tone-warning-fg" : "border-border bg-surface text-muted-foreground";
  return (
    <div className="flex flex-col items-center">
      <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border", tone)}>{icon}</span>
      {last ? null : <span aria-hidden className={cn("w-px flex-1", state === "completed" ? "bg-brand/60" : "bg-border")} />}
    </div>
  );
}

function StageRow({ s, state, last, assignHref }: { s: ProcessStage; state: StageState; last: boolean; assignHref?: string | null }) {
  const { t, fmt } = useI18n();
  const who = s.status === "COMPLETED" ? (s.completedBy ?? s.responsibleUser) : s.responsibleUser;
  const big = state === "current" || state === "blocked" || state === "unassigned";
  return (
    <li data-testid="process-stage" data-state={state} data-stage={s.stageKey} className="flex gap-3">
      <Rail state={state} last={last} />
      <div className={cn("min-w-0 flex-1 pb-4", big && "pb-5")}>
        <div className={cn("rounded-md", big && "border bg-surface p-3", state === "current" && "border-brand/60 shadow-[inset_3px_0_0_var(--brand)]", state === "blocked" && "border-tone-blocked-fg/50", state === "unassigned" && "border-tone-warning-dot/60")}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={cn("font-mono uppercase tracking-[0.08em]", big ? "text-sm font-semibold text-foreground" : "text-xs", state === "waiting" || state === "skipped" ? "text-muted-foreground" : "text-foreground")}>{s.label}{(s.attempt ?? 1) > 1 ? t("responsibilities.attemptAttempt", { attempt: s.attempt }) : ""}</span>
            <StageChip state={state} status={s.status} hold={s.isOnHold} />
          </div>
          {state === "completed" ? (
            <p className="mt-0.5 text-sm text-muted-foreground"><Person u={who} />{" "}{t("responsibilities.completedLabel", { label: s.label })}{span(s) ? <> · <span className="tabular-nums">{span(s)}</span></> : null}{s.durationMinutes != null ? <> · {fmt.duration(s.durationMinutes)}</> : null}</p>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">{s.responsibleUser ? <><Person u={s.responsibleUser} />{state === "current" || state === "blocked" ? <>{" "}{t("responsibilities.currentlyHandlingLabel", { label: s.label })}</> : null}{span(s) ? <> · <span className="tabular-nums">{span(s)}</span></> : null}</> : state === "unassigned" ? null : <span className="text-xs">{t("responsibilities.thisStageHasNotBeenAssigned")}</span>}</p>
          )}
          {state === "blocked" ? <div className="mt-2"><BlockerCallout blocker={s.blocker} /></div> : null}
          {state === "unassigned" ? <div className="mt-2"><UnassignedCallout label={s.label} assignHref={assignHref} /></div> : null}
          {s.assignmentSource && s.assignmentSource !== "UNASSIGNED" ? <p className="mt-1 text-[0.6875rem] text-muted-foreground/80">{sourceLabel(s.assignmentSource)}</p> : null}
          <Details s={s} />
        </div>
        {state === "completed" && s.handoff ? (
          <p data-testid="handoff" className="mt-1.5 flex flex-wrap items-center gap-1.5 ps-1 text-xs text-muted-foreground"><ArrowRight aria-hidden className="rtl:-scale-x-100 size-3.5 text-brand" />{t("responsibilities.handedOffTo")}{" "}<span className="font-medium text-foreground">{s.handoff.toLabel}</span> — {s.handoff.toUser ? <span className="font-medium text-foreground">{s.handoff.toUser.name}</span> : <span className="text-tone-warning-fg">{t("responsibilities.noOneAssigned2")}</span>} <span>({statusLabel(s.handoff.toStatus)})</span></p>
        ) : null}
      </div>
    </li>
  );
}

const merge = (summary: StageSummary | null, stages: ProcessStage[]): ProcessStage | null => {
  if (!summary) return null;
  const full = stages.find((s) => s.stageKey === summary.stageKey && (s.attempt ?? 1) === (summary.attempt ?? s.attempt ?? 1));
  return { ...(full ?? {}), ...summary } as ProcessStage;
};

export function ProgressLine({ progress }: { progress?: ProgressT | null }) {
  const { t } = useI18n();
  if (!progress) return null;
  return (
    <div data-testid="progress">
      <p className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{t("responsibilities.completedstagesOfTotalstagesStages", { completedStages: progress.completedStages, totalStages: progress.totalStages })}</span><span className="tabular-nums">{progress.percent}%</span></p>
      <Progress value={progress.percent} label={t("responsibilities.productionProgress")} />
    </div>
  );
}

/** The headline of a process: who has it now, in what state, and who gets it next. */
export function CurrentStageCard({ process, assignHref }: { process: JobProcess; assignHref?: string | null }) {
  const { t } = useI18n();
  const cur = merge(process.currentStage, process.stages);
  const next = merge(process.nextStage, process.stages);
  if (!cur) {
    const done = process.lastCompleted ? merge(process.lastCompleted, process.stages) : null;
    return <Card variant="sunken" className="p-4 text-sm text-muted-foreground" data-testid="no-current">{done ? <>{t("responsibilities.allStagesAreFinishedLastCompleted")}{" "}<span className="font-medium text-foreground">{done.label}</span>{done.completedBy ? t("responsibilities.byName", { name: done.completedBy.name }) : ""}.</> : t("responsibilities.noActiveStage")}</Card>;
  }
  const state = stageState(cur, true);
  return (
    <Card variant={state === "current" ? "action" : "attention"} className="space-y-3 p-4" data-testid="current-stage" data-state={state}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t("responsibilities.currentStage")}</p>
          <h3 className="text-2xl font-semibold uppercase tracking-[-0.02em]" data-testid="current-label">{cur.label}</h3>
        </div>
        <StageChip state={state} status={cur.status} hold={cur.isOnHold} />
      </div>
      {cur.responsibleUser ? (
        <div data-testid="current-owner"><p className="text-lg font-semibold">{cur.responsibleUser.name}</p><p className="text-sm text-muted-foreground">{t("responsibilities.currentlyHandlingLabel2", { label: cur.label })}{cur.startedAt ? <>{" "}{t("responsibilities.started")}{" "}<span className="tabular-nums">{clock(cur.startedAt)}</span></> : null}</p></div>
      ) : (
        <div data-testid="current-owner"><p className="text-lg font-semibold text-tone-warning-fg">{t("responsibilities.noOneAssigned")}</p>{assignHref ? <Link href={assignHref} className="text-sm font-semibold text-brand underline">{t("responsibilities.assignWorker")}</Link> : <p className="text-sm text-muted-foreground">{t("responsibilities.thisStageHasNotBeenAssigned")}</p>}</div>
      )}
      <BlockerCallout blocker={cur.blocker ?? process.blocker} />
      {next ? <p data-testid="next-stage" className="flex flex-wrap items-center gap-1.5 border-t pt-2 text-sm text-muted-foreground"><ArrowRight aria-hidden className="rtl:-scale-x-100 size-4 text-brand" />{t("responsibilities.next")}{" "}<span className="font-medium text-foreground">{next.label}</span> — <Person u={next.responsibleUser} /></p> : null}
      <ProgressLine progress={process.progress} />
    </Card>
  );
}

/** The whole journey, top to bottom. The current stage is the emphasised node; completed stages show who finished them and who got the work. */
export function ProcessTimeline({ process, assignHref }: { process: JobProcess; assignHref?: string | null }) {
  const { t } = useI18n();
  const stages = [...process.stages].sort((a, b) => a.sequence - b.sequence || (a.attempt ?? 1) - (b.attempt ?? 1));
  const curKey = process.currentStage ? `${process.currentStage.stageKey}` : null;
  if (stages.length === 0) return <p className="text-sm text-muted-foreground">{t("responsibilities.noStagesHaveBeenPlannedYet")}</p>;
  return (
    <ol aria-label={t("responsibilities.productionJourney")} data-testid="process-timeline">
      {stages.map((s, i) => <StageRow key={`${s.stageKey}-${s.attempt ?? 1}`} s={s} state={stageState(s, s.stageKey === curKey)} last={i === stages.length - 1} assignHref={assignHref} />)}
    </ol>
  );
}

/** One production job: headline card plus the full timeline. */
export function ProcessView({ process, assignHref, title }: { process: JobProcess; assignHref?: string | null; title?: React.ReactNode }) {
  const { t } = useI18n();
  const href = assignHref === undefined ? (process.jobId ? jobHref(process.jobId) : null) : assignHref;
  return (
    <section className="space-y-4" data-testid="process" aria-label={process.jobNumber ? t("responsibilities.processJobnumber", { jobNumber: process.jobNumber }) : t("responsibilities.productionProcess")}>
      {title ?? (process.jobNumber ? <h3 className="flex flex-wrap items-center gap-x-3 text-sm font-semibold"><span className="font-mono text-xs">{process.jobNumber}</span>{process.batchNumber ? <span className="text-muted-foreground">{t("responsibilities.batchBatchnumber", { batchNumber: process.batchNumber })}</span> : null}</h3> : null)}
      <CurrentStageCard process={process} assignHref={href} />
      <ProcessTimeline process={process} assignHref={href} />
    </section>
  );
}

/* ------------------------------------------- customer work cards ------------------------------------------- */
export const workState = (w: WorkItem): StageState | "idle" => (w.currentStage ? stageState({ ...w.currentStage, blocker: w.currentStage.blocker ?? w.blocker }, true) : "idle");

export function WorkCard({ w }: { w: WorkItem }) {
  const { t } = useI18n();
  const cur = w.currentStage;
  const state = workState(w);
  const detailHref = w.referenceType === "ORDER" ? `/orders/${w.referenceId}?tab=production` : `/samples/${w.referenceId}?tab=production`;
  const blocker = cur?.blocker ?? w.blocker;
  return (
    <Card variant={state === "blocked" ? "attention" : state === "current" ? "action" : "default"} className="space-y-3 p-4" data-testid="work-card" data-state={state}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex flex-wrap items-center gap-x-2 text-sm"><Link href={detailHref.split("?")[0]!} className="font-mono text-xs font-semibold text-brand hover:underline">{w.referenceNumber}</Link><span className="text-muted-foreground">{w.referenceType === "ORDER" ? t("responsibilities.bulkOrder") : t("common.sample")}{w.batchNumber ? t("responsibilities.batchBatchnumber2", { batchNumber: w.batchNumber }) : ""} · {w.jobNumber}</span></p>
          {w.productName ? <p className="text-xs text-muted-foreground">{w.productName}</p> : null}
        </div>
        {cur ? <StageChip state={state === "idle" ? "waiting" : state} status={cur.status} hold={cur.isOnHold} /> : null}
      </div>
      {cur ? (
        <div>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">{t("responsibilities.currentStage")}</p>
          <p className="text-xl font-semibold uppercase tracking-[-0.01em]" data-testid="work-stage">{cur.label}</p>
          {cur.responsibleUser ? <p className="text-sm"><span className="font-medium" data-testid="work-owner">{cur.responsibleUser.name}</span>{cur.startedAt ? <span className="text-muted-foreground">{" "}{t("responsibilities.startedStartedat", { startedAt: clock(cur.startedAt) })}</span> : null}</p> : <UnassignedCallout label={cur.label ?? t("responsibilities.thisStage")} assignHref={jobHref(w.jobId)} />}
        </div>
      ) : <p className="text-sm text-muted-foreground">{t("responsibilities.noActiveStage")}</p>}
      <BlockerCallout blocker={blocker} />
      {w.nextStage ? <p className="text-sm text-muted-foreground">{t("responsibilities.next")}{" "}<span className="font-medium text-foreground">{w.nextStage.label}</span> — <Person u={w.nextStage.responsibleUser} /></p> : null}
      <ProgressLine progress={w.progress} />
      <Link href={detailHref} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">{t("responsibilities.viewFullProcess")}{" "}<ArrowRight aria-hidden className="rtl:-scale-x-100 size-3.5" /></Link>
    </Card>
  );
}
