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
import { formatDate, formatDateTime, formatNumber, humanizeCode } from "@/lib/utils/format";
import * as api from "./api";
import { ProcessPanel } from "@/features/responsibilities/process-panel";
import { ReasonDialog } from "./admin-dialogs";
import { useJob, useJobBlockers, useJobNotes, useJobQc, useJobRework, useProductionInvalidation, useTimeline } from "./hooks";
import { activityLabel } from "./labels";
import { InspectionSummary } from "./qc-panel";
import { StageDrawer, StageOperations } from "./stage-drawer";
import { BlockersSection, NotesSection, RaiseBlockerDialog } from "./stage-parts";
import type { JobDetail, JobStage } from "./types";

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
  const list = stages.filter((s) => !s.superseded).sort((a, b) => a.sequence - b.sequence || a.attempt - b.attempt);
  if (list.length === 0) return null;
  const bar = (st: string) => (st === "COMPLETED" ? "bg-brand" : st === "IN_PROGRESS" ? "bg-brand animate-pulse motion-reduce:animate-none" : st === "BLOCKED" ? "bg-tone-warning-dot" : st === "FAILED" ? "bg-tone-danger-dot" : "bg-border");
  return (
    <Card variant="sunken" className="px-4 py-3" data-testid="stage-strip">
      <ol aria-label="Stage progression" className="flex gap-1.5">
        {list.map((s, i) => (
          <li key={s.id} className="min-w-0 flex-1" data-status={s.status}>
            <span className={`block h-1.5 ${bar(s.status)}`} />
            <span className="mt-1.5 hidden truncate font-mono text-[0.625rem] uppercase tracking-[0.08em] text-muted-foreground md:block"><span className="text-foreground">{String(i + 1).padStart(2, "0")}</span> {s.stageName}</span>
            <span className="sr-only">{s.stageName}: {humanizeCode(s.status)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function JobDetailPage({ id }: { id: string }) {
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
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title="Job not found" error={q.error} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const j = q.data;
  if (!j) return null;

  const manage = can("factory_jobs.manage");
  const open = !CLOSED.includes(j.status);
  const refresh = () => invalidate({ jobId: id, orderId: j.orderId });
  const run = (route: Parameters<typeof api.jobAction>[1]) => async (reason: string) => { await api.jobAction(id, route, reason ? { reason } : undefined); toast.success("Job updated"); refresh(); };
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
        breadcrumbs={[{ label: "Production", href: "/production" }, { label: j.jobNumber }]}
        reference={j.jobNumber}
        title={j.productName}
        status={<><StatusBadge status={j.status} /><PriorityBadge priority={j.priority} /></>}
        meta={
          <span className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span>Customer <Link href={`/customers/${j.customer.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{j.customer.name}</Link></span>
            <span>Brand <Link href={`/brands/${j.brand.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{j.brand.name}</Link></span>
            {j.sampleId && j.sampleNumber ? <span>Sample <Link href={`/samples/${j.sampleId}`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{j.sampleNumber}</Link></span> : null}
            {j.orderId && j.orderNumber ? <span>Order <Link href={`/orders/${j.orderId}`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{j.orderNumber}</Link></span> : null}
            {j.orderId && j.batchNumber ? <span>Batch <Link href={`/orders/${j.orderId}?tab=batches`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{j.batchNumber}</Link></span> : null}
          </span>
        }
        actions={manage && open ? (
          <>
            {j.status === "PLANNED" ? <Button onClick={async () => { try { await run("release")(""); } catch (e) { toast.error(errorMessage(e)); } }}>Release to factory</Button> : null}
            {j.status === "ON_HOLD" ? <Button onClick={() => setDialog("resume")}>Resume job</Button> : j.status !== "PLANNED" ? <Button variant="secondary" onClick={() => setDialog("hold")}>Put on hold</Button> : null}
            <Button variant="secondary" onClick={() => setDialog("priority")}>Priority</Button>
            <Button variant="secondary" onClick={() => setDialog("blocker")}>Raise blocker</Button>
            {can("stages.override") ? <Button variant="secondary" className="text-danger" onClick={() => setDialog("force")}>Force complete…</Button> : null}
            <Button variant="secondary" className="text-danger" onClick={() => setDialog("cancel")}>Cancel job</Button>
          </>
        ) : null}
      />
      {j.status === "ON_HOLD" && j.holdReason ? <p role="status" className="mb-4 rounded-md bg-tone-warning-bg px-3 py-2 text-sm text-tone-warning-fg"><span className="font-medium">On hold:</span> {j.holdReason}</p> : null}
      {j.status === "CANCELLED" ? <p role="status" className="mb-4 rounded-md bg-tone-neutral-bg px-3 py-2 text-sm text-tone-neutral-fg"><span className="font-medium">Cancelled</span>{j.cancelReason ? `: ${j.cancelReason}` : ""}</p> : null}

      {canOperate && open && operatingStage ? (
        <Card aria-labelledby="cs-panel-title" className="mb-6 border-brand/40 shadow-sm" data-testid="current-stage-card">
          <CardHeader className="bg-surface-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Stage</span>
                <CardTitle className="text-lg"><span id="cs-panel-title">{operatingStage.stageName}</span></CardTitle>
              </div>
              {j.stages.filter((s) => !s.superseded).length > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Stage:</span>
                  <Select
                    aria-label="Select stage to operate"
                    value={operatingStage.id}
                    onValueChange={(sid) => setSelectedStageId(sid === currentStage?.id ? null : sid)}
                    options={[...j.stages]
                      .filter((s) => !s.superseded)
                      .sort((a, b) => a.sequence - b.sequence || a.attempt - b.attempt)
                      .map((s) => ({
                        value: s.id,
                        label: `${s.sequence}. ${s.stageName}${s.attempt > 1 ? ` (attempt ${s.attempt})` : ""} [${humanizeCode(s.status)}]${s.id === currentStage?.id ? " — Current" : ""}`,
                      }))}
                  />
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {j.status === "PLANNED" ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-tone-warning-bg/30 p-3 text-sm text-tone-warning-fg" data-testid="planned-job-banner">
                <span>Job is planned. Release it to the factory floor to begin production.</span>
                {manage ? <Button size="sm" onClick={async () => { try { await run("release")(""); } catch (e) { toast.error(errorMessage(e)); } }}>Release to factory</Button> : null}
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
        <TabsList className="mb-4" aria-label="Job sections">
          {TABS.map((t) => <TabsTrigger key={t} value={t}>{{ overview: "Overview", stages: "Stages", qc: "QC", rework: "Rework", timeline: "Timeline" }[t]}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ProcessPanel kind="jobs" id={id} assignHref={`/production/jobs/${id}?tab=stages`} />
          <Card aria-labelledby="jo-t">
            <CardHeader><CardTitle><span id="jo-t">Overview</span></CardTitle></CardHeader>
            <CardContent>
              <InfoGrid>
                <InfoItem label="Source">{humanizeCode(j.sourceType)}</InfoItem>
                <InfoItem label="Progress"><span className="tabular-nums">{j.progress.completedStages ?? 0} / {j.progress.totalStages ?? j.stages.filter((s) => !s.superseded).length} stages</span></InfoItem>
                <InfoItem label="Target completion">{j.targetCompletionDate ? formatDate(j.targetCompletionDate) : null}</InfoItem>
                {j.plannedQuantity != null ? <InfoItem label="Planned quantity"><span className="tabular-nums">{formatNumber(j.plannedQuantity)}</span></InfoItem> : null}
                {j.plannedQuantity != null ? <InfoItem label="Completed / rejected"><span className="tabular-nums">{formatNumber(j.completedQuantity)} / {formatNumber(j.rejectedQuantity)}</span></InfoItem> : null}
                <InfoItem label="Delayed stages">{j.delayedStages ? <span className="font-medium text-danger">{j.delayedStages}</span> : "0"}</InfoItem>
                <InfoItem label="Open blockers">{j.openBlockers}</InfoItem>
                <InfoItem label="Workflow">{j.workflowCode} v{j.workflowVersion}</InfoItem>
                <InfoItem label="Created">{formatDateTime(j.createdAt)}</InfoItem>
                <InfoItem label="Started">{j.startedAt ? formatDateTime(j.startedAt) : null}</InfoItem>
                <InfoItem label="Internal notes" className="sm:col-span-2 lg:col-span-3">{j.internalNotes ? <span className="whitespace-pre-wrap">{j.internalNotes}</span> : null}</InfoItem>
              </InfoGrid>
            </CardContent>
          </Card>
          <Card aria-labelledby="js-t" data-testid="frozen-spec">
            <CardHeader><CardTitle><span id="js-t">Frozen specification</span></CardTitle></CardHeader>
            <CardContent className="text-sm">
              <p>Production runs on specification <strong>revision {j.specRevision}</strong>, fingerprint <span className="font-mono text-xs">{j.specHash.slice(0, 16)}…</span>. It cannot be edited from the factory; each stage&apos;s own task view (open a stage) shows the part that matters to that department.</p>
            </CardContent>
          </Card>
          <Card aria-labelledby="jb-t"><CardHeader><CardTitle><span id="jb-t">Blockers</span></CardTitle></CardHeader><CardContent>
            {blockers.isLoading ? <Skeleton className="h-16" /> : blockers.data && blockers.data.length ? <BlockersSection blockers={blockers.data} canResolve={manage} onResolve={async (b, note) => { await api.resolveBlockerAdmin(b.id, "resolve", note ? { note } : {}); refresh(); }} /> : <p className="text-sm text-muted-foreground">No blockers.</p>}
          </CardContent></Card>
          <Card aria-labelledby="jn-t"><CardHeader><CardTitle><span id="jn-t">Notes</span></CardTitle></CardHeader><CardContent>
            <NotesSection notes={(notes.data ?? []).filter((n) => !n.jobStageId)} canAdd={can("production_notes.create")} onAdd={async (content) => { await api.addJobNote(id, { content }); refresh(); }} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="stages"><StagesTab job={j} onOpen={(s) => nav({ stage: s.id })} /></TabsContent>
        <TabsContent value="qc"><QcTab id={id} /></TabsContent>
        <TabsContent value="rework"><ReworkTab id={id} /></TabsContent>
        <TabsContent value="timeline"><TimelineTab id={id} /></TabsContent>
      </Tabs>

      {stage ? <StageDrawer stage={stage} jobId={id} orderId={j.orderId} jobBlockers={blockers.data} jobNotes={notes.data} onClose={() => nav({ stage: null })} /> : null}

      {dialog === "hold" ? <ReasonDialog title="Put job on hold" description="Stops all stages of this job until it is resumed." confirmLabel="Put on hold" onSubmit={run("hold")} onClose={() => setDialog(null)} /> : null}
      {dialog === "resume" ? <ReasonDialog title="Resume job" description="Lets work continue." confirmLabel="Resume job" onSubmit={run("resume")} onClose={() => setDialog(null)} /> : null}
      {dialog === "cancel" ? <ReasonDialog title="Cancel job" description="Cancels all remaining stages. This cannot be undone." confirmLabel="Cancel job" destructive onSubmit={run("cancel")} onClose={() => setDialog(null)} /> : null}
      {dialog === "force" ? <ReasonDialog title="Force-complete job" description="Admin override: marks the job complete without every stage finishing. A reason is mandatory and recorded as an override." confirmLabel="Force complete" destructive onSubmit={run("force-complete")} onClose={() => setDialog(null)} /> : null}
      {dialog === "blocker" ? <RaiseBlockerDialog target="Whole job" onRaise={async (b) => { await api.raiseJobBlocker(id, b); refresh(); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "priority" ? <PriorityDialog job={j} onClose={() => setDialog(null)} onDone={refresh} /> : null}
    </>
  );
}

function PriorityDialog({ job, onClose, onDone }: { job: JobDetail; onClose: () => void; onDone: () => void }) {
  const [p, setP] = useState<string>(job.priority);
  return (
    <ReasonDialog title="Change priority" description="Reorders this job on the board." confirmLabel="Change priority" minLength={0}
      extra={<Select aria-label="Priority" value={p} onValueChange={setP} options={["LOW", "NORMAL", "HIGH", "URGENT"].map((v) => ({ value: v, label: humanizeCode(v) }))} />}
      onSubmit={async (reason) => { await api.changeJobPriority(job.id, p, reason || undefined); toast.success("Priority changed"); onDone(); }} onClose={onClose} />
  );
}

function StagesTab({ job, onOpen }: { job: JobDetail; onOpen: (s: JobStage) => void }) {
  const stages = [...job.stages].sort((a, b) => a.sequence - b.sequence || a.attempt - b.attempt);
  return (
    <ol className="divide-y rounded-md border bg-surface" aria-label="Stages" data-testid="stages-list">
      {stages.map((s) => (
        <li key={s.id} data-superseded={s.superseded} className={s.superseded ? "opacity-60" : ""}>
          <button type="button" onClick={() => onOpen(s)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3 text-start hover:bg-surface-muted">
            <span className="w-6 text-xs tabular-nums text-muted-foreground">{s.sequence}</span>
            <span className="min-w-0 flex-1"><span className="font-medium">{s.stageName}</span>{s.attempt > 1 ? <span className="ms-2 rounded-sm bg-tone-warning-bg px-1.5 text-xs text-tone-warning-fg">attempt {s.attempt}</span> : null}{s.superseded ? <span className="ms-2 text-xs text-muted-foreground">history</span> : null}
              <span className="block text-xs text-muted-foreground">{s.assignees.length ? s.assignees.map((a) => a.name).join(", ") : "Unassigned"}{s.dueAt ? ` · due ${formatDate(s.dueAt)}` : ""}{s.completedAt ? ` · done ${formatDateTime(s.completedAt)}` : ""}</span></span>
            {s.isDelayed ? <span className="text-xs font-medium text-danger">Overdue</span> : null}
            {s.isOnHold ? <StatusBadge status="ON_HOLD" label="On hold" /> : null}
            <StatusBadge status={s.status} />
          </button>
        </li>
      ))}
    </ol>
  );
}

function Loading() { return <Skeleton className="h-40" />; }

function QcTab({ id }: { id: string }) {
  const q = useJobQc(id);
  if (q.isLoading) return <Loading />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title="QC details are not available to your role" className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState title="No inspections yet" description="Inspections appear here once QC staff open a gate." />;
  return <div className="space-y-4">{q.data.map((i) => <Card key={i.id}><CardContent className="pt-4"><InspectionSummary inspection={i} /></CardContent></Card>)}</div>;
}

function ReworkTab({ id }: { id: string }) {
  const q = useJobRework(id);
  if (q.isLoading) return <Loading />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title="Rework history is not available to your role" className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState title="No rework" description="This job has had no failed inspections or rework." />;
  return (
    <ul className="space-y-3" data-testid="rework-list">
      {q.data.map((r) => (
        <li key={r.id} className="rounded-md border bg-surface p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2"><span className="font-medium">Back to {r.targetStageName}</span><StatusBadge status={r.status === "RESOLVED" ? "COMPLETED" : r.status === "CANCELLED" ? "CANCELLED" : "IN_PROGRESS"} label={humanizeCode(r.status)} />{r.affectedQuantity != null ? <span className="text-xs">{r.affectedQuantity} units</span> : null}</p>
          <p className="mt-1">{r.reason}</p>
          <p className="mt-1 text-xs text-muted-foreground">Raised {formatDateTime(r.createdAt)}{r.resolvedAt ? ` · resolved ${formatDateTime(r.resolvedAt)}` : ""}</p>
        </li>
      ))}
    </ul>
  );
}

/** JobActivity is the operational timeline of this job. It is NOT the security audit log (that lives under Team / Settings). */
function TimelineTab({ id }: { id: string }) {
  const q = useTimeline(id);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.data.length) return <EmptyState title="No activity yet" />;
  // The backend lists oldest first; the floor wants what just happened at the top.
  const list = q.data.data;
  const ordered = list[0]!.createdAt <= list[list.length - 1]!.createdAt ? [...list].reverse() : list;
  return (
    <ol className="space-y-0 rounded-md border bg-surface" aria-label="Job activity" data-testid="timeline">
      {ordered.map((a) => (
        <li key={a.id} data-type={a.type} className={`flex gap-3 border-b px-3 py-2.5 text-sm last:border-b-0 ${a.type === "ADMIN_OVERRIDE" ? "bg-tone-danger-bg/40" : ""}`}>
          <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${a.type === "ADMIN_OVERRIDE" ? "bg-danger" : "bg-brand"}`} />
          <span className="min-w-0 flex-1"><span className="font-medium">{activityLabel(a.type)}</span><span className="block text-muted-foreground">{a.message}</span></span>
          <span className="shrink-0 text-end text-xs text-muted-foreground">{a.actorName ?? "System"}<br />{formatDateTime(a.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}
