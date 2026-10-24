"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, DetailSkeleton, EmptyState, ErrorState } from "@/components/feedback/states";
import { DetailHeader, InfoGrid, InfoItem } from "@/components/layout/detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage, isApiError } from "@/lib/api/errors";

import * as api from "./api";
import { ProcessPanel } from "@/features/responsibilities/process-panel";
import { ReasonDialog } from "./admin-dialogs";
import { useJob, useJobBlockers, useJobNotes, useJobQc, useJobRework, useProductionInvalidation, useTimeline } from "./hooks";
import { activityLabel } from "./labels";
import { InspectionSummary } from "./qc-panel";
import { StageDrawer, StageOperations } from "./stage-drawer";
import { BlockersSection, NotesSection, RaiseBlockerDialog } from "./stage-parts";
import type { JobDetail, JobStage } from "./types";
import { useI18n } from "@/i18n/provider";

export function findCurrentStage(stages: JobStage[]): JobStage | undefined {
  const active = stages.filter((s) => !s.superseded).sort((a, b) => a.sequence - b.sequence || a.attempt - b.attempt);
  return (
    active.find((s) => s.status === "IN_PROGRESS") ??
    active.find((s) => s.status === "BLOCKED") ??
    active.find((s) => s.status === "READY") ??
    active.find((s) => !["COMPLETED", "SKIPPED", "CANCELLED"].includes(s.status))
  );
}

const TABS = ["overview", "stages", "qc", "rework", "timeline"] as const;
type Tab = (typeof TABS)[number];
const CLOSED = ["COMPLETED", "CANCELLED"];

/** Factory-line view of the job: one segment per live stage, coloured by its status. Pure presentation of `stages`; no new data. */
function StageStrip({ stages }: { stages: JobStage[] }) {
  const { t, fmt } = useI18n();
  const list = stages.filter((s) => !s.superseded).sort((a, b) => a.sequence - b.sequence || a.attempt - b.attempt);
  if (list.length === 0) return null;
  const bar = (st: string) => (st === "COMPLETED" ? "bg-brand" : st === "IN_PROGRESS" ? "bg-brand animate-pulse motion-reduce:animate-none" : st === "BLOCKED" ? "bg-tone-warning-dot" : st === "FAILED" ? "bg-tone-danger-dot" : "bg-border");
  return (
    <Card variant="sunken" className="px-4 py-3" data-testid="stage-strip">
      <ol aria-label={t("production.stageProgression")} className="flex gap-1.5">
        {list.map((s, i) => (
          <li key={s.id} className="min-w-0 flex-1" data-status={s.status}>
            <span className={`block h-1.5 ${bar(s.status)}`} />
            <span className="mt-1.5 hidden truncate font-mono text-[0.625rem] uppercase tracking-[0.08em] text-muted-foreground md:block"><span className="text-foreground">{String(i + 1).padStart(2, "0")}</span> {s.stageName}</span>
            <span className="sr-only">{s.stageName}: {fmt.code(s.status)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function JobDetailPage({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = useJob(id);
  const blockers = useJobBlockers(id);
  const notes = useJobNotes(id);
  const invalidate = useProductionInvalidation();
  const [dialog, setDialog] = useState<"hold" | "resume" | "cancel" | "force" | "blocker" | "priority" | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const tab: Tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "overview";
  const stageId = sp.get("stage");
  const nav = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v); }
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && q.error.kind === "forbidden") return <AccessDeniedState />;
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title={t("production.jobNotFound")} error={q.error} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const j = q.data;
  if (!j) return null;

  const manage = can("factory_jobs.manage");
  const open = !CLOSED.includes(j.status);
  const refresh = () => invalidate({ jobId: id, orderId: j.orderId });
  const run = (route: Parameters<typeof api.jobAction>[1]) => async (reason: string) => { await api.jobAction(id, route, reason ? { reason } : undefined); toast.success(t("production.jobUpdated")); refresh(); };
  const stage = stageId ? j.stages.find((s) => s.id === stageId) : undefined;

  const canOperate = can("jobs.read_assigned") && (
    can("stages.start") ||
    can("stages.complete") ||
    can("qc.perform") ||
    can("factory_jobs.manage") ||
    can("stages.override") ||
    can("jobs.assign")
  );
  const currentStage = findCurrentStage(j.stages);
  const operatingStage = (selectedStageId ? j.stages.find((s) => s.id === selectedStageId) : undefined) ?? currentStage;

  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: t("common.production"), href: "/production" }, { label: j.jobNumber }]}
        reference={j.jobNumber}
        title={j.productName}
        status={<><StatusBadge status={j.status} /><PriorityBadge priority={j.priority} /></>}
        meta={
          <span className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span>{t("common.customer")}{" "}<Link href={`/customers/${j.customer.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{j.customer.name}</Link></span>
            <span>{t("common.brand2")}{" "}<Link href={`/brands/${j.brand.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{j.brand.name}</Link></span>
            {j.sampleId && j.sampleNumber ? <span>{t("common.sample")}{" "}<Link href={`/samples/${j.sampleId}`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{j.sampleNumber}</Link></span> : null}
            {j.orderId && j.orderNumber ? <span>{t("common.order")}{" "}<Link href={`/orders/${j.orderId}`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{j.orderNumber}</Link></span> : null}
            {j.orderId && j.batchNumber ? <span>{t("production.batch")}{" "}<Link href={`/orders/${j.orderId}?tab=batches`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{j.batchNumber}</Link></span> : null}
          </span>
        }
        actions={manage && open ? (
          <>
            {j.status === "PLANNED" ? <Button onClick={async () => { try { await run("release")(""); } catch (e) { toast.error(errorMessage(e)); } }}>{t("production.releaseToFactory")}</Button> : null}
            {j.status === "ON_HOLD" ? <Button onClick={() => setDialog("resume")}>{t("production.resumeJob")}</Button> : j.status !== "PLANNED" ? <Button variant="secondary" onClick={() => setDialog("hold")}>{t("production.putOnHold")}</Button> : null}
            <Button variant="secondary" onClick={() => setDialog("priority")}>{t("common.priority")}</Button>
            <Button variant="secondary" onClick={() => setDialog("blocker")}>{t("production.raiseBlocker")}</Button>
            {can("stages.override") ? <Button variant="secondary" className="text-danger" onClick={() => setDialog("force")}>{t("production.forceComplete")}</Button> : null}
            <Button variant="secondary" className="text-danger" onClick={() => setDialog("cancel")}>{t("production.cancelJob")}</Button>
          </>
        ) : null}
      />
      {j.status === "ON_HOLD" && j.holdReason ? <p role="status" className="mb-4 rounded-md bg-tone-warning-bg px-3 py-2 text-sm text-tone-warning-fg"><span className="font-medium">{t("production.onHold")}</span> {j.holdReason}</p> : null}
      {j.status === "CANCELLED" ? <p role="status" className="mb-4 rounded-md bg-tone-neutral-bg px-3 py-2 text-sm text-tone-neutral-fg"><span className="font-medium">{t("production.cancelled")}</span>{j.cancelReason ? `: ${j.cancelReason}` : ""}</p> : null}

      {canOperate && open && operatingStage ? (
        <Card aria-labelledby="cs-panel-title" className="mb-6 border-brand/40 shadow-sm" data-testid="current-stage-card">
          <CardHeader className="bg-surface-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("production.currentStage")}</span>
                <CardTitle className="text-lg"><span id="cs-panel-title">{operatingStage.stageName}</span></CardTitle>
              </div>
              {j.stages.filter((s) => !s.superseded).length > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("production.stage")}</span>
                  <Select
                    aria-label={t("production.selectStageToOperate")}
                    value={operatingStage.id}
                    onValueChange={(sid) => setSelectedStageId(sid === currentStage?.id ? null : sid)}
                    options={[...j.stages]
                      .filter((s) => !s.superseded)
                      .sort((a, b) => a.sequence - b.sequence || a.attempt - b.attempt)
                      .map((s) => ({
                        value: s.id,
                        label: `${s.sequence}. ${s.stageName}${s.attempt > 1 ? t("common.attemptSuffix", { n: s.attempt }) : ""} [${fmt.code(s.status)}]${s.id === currentStage?.id ? t("production.stageCurrent") : ""}`,
                      }))}
                  />
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {j.status === "PLANNED" ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-tone-warning-bg/30 p-3 text-sm text-tone-warning-fg" data-testid="planned-job-banner">
                <span>{t("production.jobIsPlannedReleaseItTo")}</span>
                {manage ? <Button size="sm" onClick={async () => { try { await run("release")(""); } catch (e) { toast.error(errorMessage(e)); } }}>{t("production.releaseToFactory")}</Button> : null}
              </div>
            ) : null}
            <StageOperations
              stage={operatingStage}
              jobId={id}
              orderId={j.orderId}
              jobBlockers={blockers.data}
              jobNotes={notes.data}
              embedded
              staffEnabled={canOperate}
            />
          </CardContent>
        </Card>
      ) : null}

      <StageStrip stages={j.stages} />

      <Tabs value={tab} onValueChange={(t) => nav({ tab: t === "overview" ? null : t })}>
        <TabsList className="mb-4" aria-label={t("production.jobSections")}>
          {TABS.map((t) => <TabsTrigger key={t} value={t}>{{ overview: "Overview", stages: "Stages", qc: "QC", rework: "Rework", timeline: "Timeline" }[t]}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ProcessPanel kind="jobs" id={id} assignHref={`/production/jobs/${id}?tab=stages`} />
          <Card aria-labelledby="jo-t">
            <CardHeader><CardTitle><span id="jo-t">{t("common.overview")}</span></CardTitle></CardHeader>
            <CardContent>
              <InfoGrid>
                <InfoItem label={t("common.source")}>{fmt.code(j.sourceType)}</InfoItem>
                <InfoItem label={t("production.progress")}><span className="tabular-nums">{j.progress.completedStages ?? 0} / {j.progress.totalStages ?? j.stages.filter((s) => !s.superseded).length}{" "}{t("production.stages")}</span></InfoItem>
                <InfoItem label={t("production.targetCompletion")}>{j.targetCompletionDate ? fmt.date(j.targetCompletionDate) : null}</InfoItem>
                {j.plannedQuantity != null ? <InfoItem label={t("production.plannedQuantity")}><span className="tabular-nums">{fmt.number(j.plannedQuantity)}</span></InfoItem> : null}
                {j.plannedQuantity != null ? <InfoItem label={t("production.completedRejected")}><span className="tabular-nums">{fmt.number(j.completedQuantity)} / {fmt.number(j.rejectedQuantity)}</span></InfoItem> : null}
                <InfoItem label={t("production.delayedStages")}>{j.delayedStages ? <span className="font-medium text-danger">{j.delayedStages}</span> : "0"}</InfoItem>
                <InfoItem label={t("production.openBlockers")}>{j.openBlockers}</InfoItem>
                <InfoItem label={t("production.workflow")}>{j.workflowCode} v{j.workflowVersion}</InfoItem>
                <InfoItem label={t("common.created")}>{fmt.dateTime(j.createdAt)}</InfoItem>
                <InfoItem label={t("production.started")}>{j.startedAt ? fmt.dateTime(j.startedAt) : null}</InfoItem>
                <InfoItem label={t("common.internalNotes")} className="sm:col-span-2 lg:col-span-3">{j.internalNotes ? <span className="whitespace-pre-wrap">{j.internalNotes}</span> : null}</InfoItem>
              </InfoGrid>
            </CardContent>
          </Card>
          <Card aria-labelledby="js-t" data-testid="frozen-spec">
            <CardHeader><CardTitle><span id="js-t">{t("production.frozenSpecification")}</span></CardTitle></CardHeader>
            <CardContent className="text-sm">
              <p>{t("production.productionRunsOnSpecification")}{" "}<strong>{t("production.revisionSpecrevision", { specRevision: j.specRevision })}</strong>{t("production.fingerprint")}{" "}<span className="font-mono text-xs">{j.specHash.slice(0, 16)}…</span>{t("production.specFrozenNote")}</p>
            </CardContent>
          </Card>
          <Card aria-labelledby="jb-t"><CardHeader><CardTitle><span id="jb-t">{t("production.blockers")}</span></CardTitle></CardHeader><CardContent>
            {blockers.isLoading ? <Skeleton className="h-16" /> : blockers.data && blockers.data.length ? <BlockersSection blockers={blockers.data} canResolve={manage} onResolve={async (b, note) => { await api.resolveBlockerAdmin(b.id, "resolve", note ? { note } : {}); refresh(); }} /> : <p className="text-sm text-muted-foreground">{t("production.noBlockers")}</p>}
          </CardContent></Card>
          <Card aria-labelledby="jn-t"><CardHeader><CardTitle><span id="jn-t">{t("common.notes")}</span></CardTitle></CardHeader><CardContent>
            <NotesSection notes={(notes.data ?? []).filter((n) => !n.jobStageId)} canAdd={can("production_notes.create")} onAdd={async (content) => { await api.addJobNote(id, { content }); refresh(); }} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="stages"><StagesTab job={j} onOpen={(s) => nav({ stage: s.id })} /></TabsContent>
        <TabsContent value="qc"><QcTab id={id} /></TabsContent>
        <TabsContent value="rework"><ReworkTab id={id} /></TabsContent>
        <TabsContent value="timeline"><TimelineTab id={id} /></TabsContent>
      </Tabs>

      {stage ? <StageDrawer stage={stage} jobId={id} orderId={j.orderId} jobBlockers={blockers.data} jobNotes={notes.data} onClose={() => nav({ stage: null })} /> : null}

      {dialog === "hold" ? <ReasonDialog title={t("production.putJobOnHold")} description={t("production.stopsAllStagesOfThisJob")} confirmLabel={t("production.putOnHold")} onSubmit={run("hold")} onClose={() => setDialog(null)} /> : null}
      {dialog === "resume" ? <ReasonDialog title={t("production.resumeJob")} description={t("production.letsWorkContinue")} confirmLabel={t("production.resumeJob")} onSubmit={run("resume")} onClose={() => setDialog(null)} /> : null}
      {dialog === "cancel" ? <ReasonDialog title={t("production.cancelJob")} description={t("production.cancelsAllRemainingStagesThisCannot")} confirmLabel={t("production.cancelJob")} destructive onSubmit={run("cancel")} onClose={() => setDialog(null)} /> : null}
      {dialog === "force" ? <ReasonDialog title={t("production.forceCompleteJob")} description={t("production.adminOverrideMarksTheJobComplete")} confirmLabel={t("production.forceComplete2")} destructive onSubmit={run("force-complete")} onClose={() => setDialog(null)} /> : null}
      {dialog === "blocker" ? <RaiseBlockerDialog target="Whole job" onRaise={async (b) => { await api.raiseJobBlocker(id, b); refresh(); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "priority" ? <PriorityDialog job={j} onClose={() => setDialog(null)} onDone={refresh} /> : null}
    </>
  );
}

function PriorityDialog({ job, onClose, onDone }: { job: JobDetail; onClose: () => void; onDone: () => void }) {
  const { t, fmt } = useI18n();
  const [p, setP] = useState<string>(job.priority);
  return (
    <ReasonDialog title={t("production.changePriority")} description={t("production.reordersThisJobOnTheBoard")} confirmLabel={t("production.changePriority")} minLength={0}
      extra={<Select aria-label={t("common.priority")} value={p} onValueChange={setP} options={["LOW", "NORMAL", "HIGH", "URGENT"].map((v) => ({ value: v, label: fmt.code(v) }))} />}
      onSubmit={async (reason) => { await api.changeJobPriority(job.id, p, reason || undefined); toast.success(t("production.priorityChanged")); onDone(); }} onClose={onClose} />
  );
}

function StagesTab({ job, onOpen }: { job: JobDetail; onOpen: (s: JobStage) => void }) {
  const { t, fmt } = useI18n();
  const stages = [...job.stages].sort((a, b) => a.sequence - b.sequence || a.attempt - b.attempt);
  return (
    <ol className="divide-y rounded-md border bg-surface" aria-label={t("production.stages2")} data-testid="stages-list">
      {stages.map((s) => (
        <li key={s.id} data-superseded={s.superseded} className={s.superseded ? "opacity-60" : ""}>
          <button type="button" onClick={() => onOpen(s)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3 text-start hover:bg-surface-muted">
            <span className="w-6 text-xs tabular-nums text-muted-foreground">{s.sequence}</span>
            <span className="min-w-0 flex-1"><span className="font-medium">{s.stageName}</span>{s.attempt > 1 ? <span className="ms-2 rounded-sm bg-tone-warning-bg px-1.5 text-xs text-tone-warning-fg">{t("production.attemptAttempt", { attempt: s.attempt })}</span> : null}{s.superseded ? <span className="ms-2 text-xs text-muted-foreground">{t("production.historyWord")}</span> : null}
              <span className="block text-xs text-muted-foreground">{s.assignees.length ? s.assignees.map((a) => a.name).join(", ") : t("common.unassigned")}{s.dueAt ? t("production.dueDueat", { dueAt: fmt.date(s.dueAt) }) : ""}{s.completedAt ? t("production.doneCompletedat", { completedAt: fmt.dateTime(s.completedAt) }) : ""}</span></span>
            {s.isDelayed ? <span className="text-xs font-medium text-danger">{t("production.overdue")}</span> : null}
            {s.isOnHold ? <StatusBadge status="ON_HOLD" label={t("common.onHold")} /> : null}
            <StatusBadge status={s.status} />
          </button>
        </li>
      ))}
    </ol>
  );
}

function Loading() { return <Skeleton className="h-40" />; }

function QcTab({ id }: { id: string }) {
  const { t } = useI18n();
  const q = useJobQc(id);
  if (q.isLoading) return <Loading />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title={t("production.qcDetailsAreNotAvailableTo")} className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState title={t("production.noInspectionsYet")} description={t("production.inspectionsAppearHereOnceQcStaff")} />;
  return <div className="space-y-4">{q.data.map((i) => <Card key={i.id}><CardContent className="pt-4"><InspectionSummary inspection={i} /></CardContent></Card>)}</div>;
}

function ReworkTab({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const q = useJobRework(id);
  if (q.isLoading) return <Loading />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title={t("production.reworkHistoryIsNotAvailableTo")} className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState title={t("production.noRework")} description={t("production.thisJobHasHadNoFailed")} />;
  return (
    <ul className="space-y-3" data-testid="rework-list">
      {q.data.map((r) => (
        <li key={r.id} className="rounded-md border bg-surface p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2"><span className="font-medium">{t("production.backToTargetstagename", { targetStageName: r.targetStageName })}</span><StatusBadge status={r.status === "RESOLVED" ? "COMPLETED" : r.status === "CANCELLED" ? "CANCELLED" : "IN_PROGRESS"} label={fmt.code(r.status)} />{r.affectedQuantity != null ? <span className="text-xs">{t("production.affectedquantityUnits", { affectedQuantity: r.affectedQuantity })}</span> : null}</p>
          <p className="mt-1">{r.reason}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("production.raisedCreatedat", { createdAt: fmt.dateTime(r.createdAt) })}{r.resolvedAt ? t("production.resolvedResolvedat", { resolvedAt: fmt.dateTime(r.resolvedAt) }) : ""}</p>
        </li>
      ))}
    </ul>
  );
}

/** JobActivity is the operational timeline of this job. It is NOT the security audit log (that lives under Team / Settings). */
function TimelineTab({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const q = useTimeline(id);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.data.length) return <EmptyState title={t("production.noActivityYet")} />;
  // The backend lists oldest first; the floor wants what just happened at the top.
  const list = q.data.data;
  const ordered = list[0]!.createdAt <= list[list.length - 1]!.createdAt ? [...list].reverse() : list;
  return (
    <ol className="space-y-0 rounded-md border bg-surface" aria-label={t("production.jobActivity")} data-testid="timeline">
      {ordered.map((a) => (
        <li key={a.id} data-type={a.type} className={`flex gap-3 border-b px-3 py-2.5 text-sm last:border-b-0 ${a.type === "ADMIN_OVERRIDE" ? "bg-tone-danger-bg/40" : ""}`}>
          <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${a.type === "ADMIN_OVERRIDE" ? "bg-danger" : "bg-brand"}`} />
          <span className="min-w-0 flex-1"><span className="font-medium">{activityLabel(a.type)}</span><span className="block text-muted-foreground">{a.message}</span></span>
          <span className="shrink-0 text-end text-xs text-muted-foreground">{a.actorName ?? t("production.system")}<br />{fmt.dateTime(a.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}
