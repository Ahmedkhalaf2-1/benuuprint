"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage, isApiError } from "@/lib/api/errors";

import * as api from "./api";
import { AssignStageDialog, ReasonDialog, ReworkDialog } from "./admin-dialogs";
import { useProductionInvalidation, useStageDefinitions, useStageReports, useStaffStage } from "./hooks";
import { InspectionSummary, QcExecution } from "./qc-panel";
import { BlockersSection, FilesSection, NotesSection, QuantitySection, RaiseBlockerDialog } from "./stage-parts";
import { TaskViewPanel } from "./task-view";
import { reportPackaging } from "@/features/fulfillment/api";
import { PackagingReportForm } from "@/features/fulfillment/packaging-report-form";
import { variantLabel, type Blocker, type JobNote, type JobStage, type StaffAction, type StaffStageDetail } from "./types";
import { useI18n } from "@/i18n/provider";
import { localizedMap } from "@/i18n/active";

/**
 * Stage work panel. Two layers:
 *  - the OPERATIONAL layer (/staff/job-stages/:id): what the caller may do is exactly the backend's `allowedActions` (the state
 *    machine is never re-implemented here). Floor staff only get it for stages assigned to them; holders of the administrative
 *    operational permissions get it for any eligible stage (the backend decides) — without being assigned and without the
 *    assignment changing;
 *  - the ADMIN layer (assignment / hold / override / rework / blocker admin) is shown by permission and needs no assignment.
 * A 404/403 on the staff layer means "not assigned to you": the admin layer and read-only facts are still shown.
 */
export function StageDrawer({ stage, jobId, orderId, jobBlockers, jobNotes, onClose }: { stage: JobStage; jobId: string; orderId?: string | null; jobBlockers?: Blocker[]; jobNotes?: JobNote[]; onClose: () => void }) {
  const { t } = useI18n();
  const staff = useStaffStage(stage.id);
  const live = staff.data?.stage ?? stage;
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} title={`${live.stageName}${live.attempt > 1 ? t("common.attemptDotSuffix", { n: live.attempt }) : ""}`} className="w-[min(32rem,100vw)]">
      <div className="p-4" data-testid="stage-drawer">
        <StageOperations stage={stage} jobId={jobId} orderId={orderId} jobBlockers={jobBlockers} jobNotes={jobNotes} />
      </div>
    </Drawer>
  );
}

const OPERATIONAL: StaffAction[] = ["START", "COMPLETE", "START_QC", "RAISE_BLOCKER", "ADD_NOTE", "ATTACH_FILE"];

/**
 * Everything one can see and do on a stage: status facts, the operational layer and the manager layer. Shared by the stage drawer
 * (board / My Work) and the job page's "Current stage" panel, so both behave identically.
 *
 * `staffEnabled` = whether to ask for the staff work view at all (read-only roles have no `jobs.read_assigned`).
 * `embedded` = rendered inline on the job page (the long specification is collapsed).
 */
export function StageOperations({ stage, jobId, orderId, jobBlockers, jobNotes, staffEnabled = true, embedded = false }: { stage: JobStage; jobId: string; orderId?: string | null; jobBlockers?: Blocker[]; jobNotes?: JobNote[]; staffEnabled?: boolean; embedded?: boolean }) {
  const { t, fmt } = useI18n();
  const { can, user } = useAuth();
  const staff = useStaffStage(stage.id, staffEnabled);
  const detail = staff.data;
  const live = detail?.stage ?? stage;
  // Neutral marker: the caller is operating a stage that is not assigned to them (allowed by the backend through permissions).
  const administrative = !!detail && !live.assignees.some((a) => a.userId === user?.id) && detail.allowedActions.some((a) => OPERATIONAL.includes(a));
  const quantity = detail?.quantity;
  return (
    <div className="space-y-5" data-testid="stage-operations">
      <header className="space-y-1">
        <p className="flex flex-wrap items-center gap-2"><StatusBadge status={live.status} />{live.isOnHold ? <StatusBadge status="ON_HOLD" label={t("common.onHold")} /> : null}{live.isDelayed ? <span className="text-xs font-medium text-danger">{t("production.overdue")}</span> : null}{live.superseded ? <span className="text-xs text-muted-foreground">{t("production.supersededByRework")}</span> : null}
          {administrative ? <span className="rounded-sm border bg-surface-muted px-1.5 py-0.5 text-xs text-muted-foreground" data-testid="administrative-operation" title={t("production.youAreNotAssignedToThis")}>{t("production.administrativeOperation")}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground" data-testid="stage-assignees">{live.assignees.length ? t("production.assignedV1", { v1: live.assignees.map((a) => a.name).join(", ") }) : t("common.unassigned")}{live.dueAt ? t("production.dueDueat", { dueAt: fmt.dateTime(live.dueAt) }) : ""}</p>
        {quantity ? <p className="text-xs text-muted-foreground tabular-nums" data-testid="stage-progress">{t("production.accountedForV1RequiredUnitsRemaining", { v1: quantity.produced + quantity.rejected, required: quantity.required, remaining: quantity.remaining })}</p> : null}
        {live.holdReason ? <p className="text-sm">{t("production.onHoldHoldreason", { holdReason: live.holdReason })}</p> : null}
        {live.blockReason ? <p className="text-sm text-tone-blocked-fg">{t("production.blockedBlockreason", { blockReason: live.blockReason })}</p> : null}
        {live.completionNote ? <p className="text-sm"><span className="text-muted-foreground">{t("production.completionNote")}</span> {live.completionNote}</p> : null}
      </header>
      {staff.isLoading ? <p className="text-sm text-muted-foreground" role="status">{t("production.loadingTheWorkView")}</p> : null}
      {detail ? <StaffLayer key={stage.id} detail={detail} orderId={orderId} jobId={jobId} embedded={embedded} /> : staff.isError ? (
        <>
          <p className="rounded-md border bg-surface-muted/50 px-3 py-2 text-sm text-muted-foreground" data-testid="not-assigned">{t("production.thisStageIsNotAssignedTo")}{" "}{can("jobs.assign") ? t("production.youCanStillManageItBelow") : ""}</p>
          {jobBlockers ? <BlockersSection blockers={jobBlockers.filter((b) => b.jobStageId === stage.id)} canResolve={false} onResolve={async () => undefined} /> : null}
          {jobNotes ? <ReadOnlyNotes notes={jobNotes.filter((n) => n.jobStageId === stage.id)} /> : null}
        </>
      ) : null}
      <AdminLayer stage={live} jobId={jobId} orderId={orderId} jobBlockers={jobBlockers} staff={detail} />
    </div>
  );
}

function ReadOnlyNotes({ notes }: { notes: JobNote[] }) {
  if (!notes.length) return null;
  return <NotesSection notes={notes} canAdd={false} onAdd={async () => undefined} />;
}

const ACTION_COPY: Record<string, string> = localizedMap({ START: "Start stage", COMPLETE: "Complete stage", RAISE_BLOCKER: "Raise blocker", START_QC: "Start inspection" });

/** Pure: a one-line "what to do next" derived only from the backend's allowedActions and the stage's own state (no transition logic). */
export function nextStepHint(detail: Pick<StaffStageDetail, "allowedActions" | "blockers" | "qcInspection"> & { stage: Pick<JobStage, "status"> }): string | null {
  const a = detail.allowedActions;
  const qc = detail.qcInspection;
  if (detail.stage.status === "BLOCKED" || detail.blockers.some((b) => b.status === "OPEN")) return "Resolve the open blocker to continue.";
  if (a.includes("START")) return "Next: start the stage.";
  if (a.includes("START_QC") && !qc) return "Next: start the inspection.";
  if (a.includes("START_QC") && qc?.status === "IN_PROGRESS") return "Next: fill in the checklist and complete the inspection.";
  if (a.includes("COMPLETE")) return "Next: complete the stage when the work is done.";
  return null;
}

function StaffLayer({ detail, jobId, orderId, embedded }: { detail: StaffStageDetail; jobId: string; orderId?: string | null; embedded: boolean }) {
  const { t } = useI18n();
  const { stage, allowedActions: allowed } = detail;
  const invalidate = useProductionInvalidation();
  const { can: hasPerm } = useAuth();
  // Stage definitions (rework target choices) are an admin read; floor QC simply uses the workflow default target.
  const defs = useStageDefinitions(stage.isQcStage && (hasPerm("jobs.assign") || hasPerm("rework.manage")));
  const done = () => invalidate({ stageId: stage.id, jobId, orderId });
  const [dialog, setDialog] = useState<"complete" | "blocker" | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const can = (a: StaffAction) => allowed.includes(a);
  const reportsEnabled = detail.quantity != null && stage.status !== "WAITING";
  const reports = useStageReports(stage.id, reportsEnabled);
  const fail = (e: unknown) => setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined });
  const start = useMutation({ mutationFn: () => api.staffStart(stage.id), onSuccess: () => { toast.success(t("production.stageStarted")); done(); }, onError: fail });
  const openQc = useMutation({ mutationFn: () => api.qcStart(stage.id), onSuccess: () => { done(); }, onError: fail });
  const quantity = reports.data?.quantity ?? detail.quantity;
  const qc = detail.qcInspection;
  const stageCodes = (defs.data ?? []).filter((d) => !d.isQcStage).map((d) => ({ code: d.code, name: d.name }));
  const hint = nextStepHint(detail);
  const taskView = <TaskViewPanel view={detail.taskView} />;

  return (
    <div className="space-y-5">
      {error ? <FormError {...error} /> : null}
      {hint ? <p className="text-sm font-medium" data-testid="next-step">{hint}</p> : null}
      {!allowed.some((a) => ["START", "COMPLETE", "START_QC", "RAISE_BLOCKER"].includes(a)) ? <p className="text-sm text-muted-foreground" data-testid="no-actions">{stage.status === "COMPLETED" ? t("production.thisStageIsComplete") : stage.status === "WAITING" ? t("production.waitingForThePreviousStageTo") : stage.status === "BLOCKED" ? t("production.blockedResolveTheBlockerBelowTo") : t("production.noActionsAreAvailableRightNow")}</p> : (
        <div className="flex flex-wrap gap-2" data-testid="stage-actions">
          {can("START") ? <Button loading={start.isPending} onClick={() => { setError(null); start.mutate(); }}>{ACTION_COPY.START}</Button> : null}
          {can("COMPLETE") ? <Button onClick={() => { setError(null); setDialog("complete"); }}>{ACTION_COPY.COMPLETE}</Button> : null}
          {can("START_QC") && !qc ? <Button loading={openQc.isPending} onClick={() => { setError(null); openQc.mutate(); }}>{ACTION_COPY.START_QC}</Button> : null}
          {can("RAISE_BLOCKER") ? <Button variant="secondary" onClick={() => setDialog("blocker")}>{ACTION_COPY.RAISE_BLOCKER}</Button> : null}
        </div>
      )}
      {embedded ? <details className="rounded-md border px-3 py-2" data-testid="task-view-toggle"><summary className="cursor-pointer text-sm font-medium">{t("production.workSpecification")}</summary><div className="pt-3">{taskView}</div></details> : taskView}
      {detail.orderView ? (
        <section aria-label={t("common.order")} data-testid="order-view" className="rounded-md border p-3 text-sm">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{detail.orderView.batch ? t("production.batchOfOrder") : t("common.order")}{" "}{t("production.ordernumberPlannedquantityUnits", { orderNumber: detail.orderView.orderNumber, plannedQuantity: detail.orderView.plannedQuantity })}</p>
          <ul className="grid gap-x-4 sm:grid-cols-2">{detail.orderView.items.flatMap((i) => i.variants).map((v) => <li key={v.variantId} className="flex justify-between"><span>{variantLabel(v)}</span><span className="tabular-nums">{v.quantity}</span></li>)}</ul>
        </section>
      ) : null}
      {stage.requiresCompletionNote || stage.requiresAttachment ? <p className="text-xs text-muted-foreground">{t("production.toCompleteV1", { v1: [stage.requiresCompletionNote && "a completion note", stage.requiresAttachment && "an attached file"].filter(Boolean).join(" and ") })}</p> : null}
      {quantity ? <QuantitySection quantity={quantity} reports={reports.data?.reports} canReport={stage.status === "IN_PROGRESS" && !stage.isQcStage && hasPerm("production_quantity.report")} orderVariants={(detail.orderView?.items ?? []).flatMap((i) => i.variants).map((v) => ({ id: v.variantId, label: `${variantLabel(v)} (${v.quantity})` }))} onReport={async (b) => { await api.staffReport(stage.id, b); done(); }} /> : null}
      {stage.stageCode === "PACKAGING" && stage.status === "IN_PROGRESS" ? (
        <section aria-label={t("production.packagingReport")} className="space-y-2" data-testid="packaging-section">
          <h4 className="text-sm font-semibold">{t("production.reportPackaging")}</h4>
          <p className="text-xs text-muted-foreground">{t("production.packedDamagedAndCartonsAreRecorded")}</p>
          <PackagingReportForm variants={(detail.orderView?.items ?? []).flatMap((i) => i.variants).map((v) => ({ id: v.variantId, label: `${variantLabel(v)} (${v.quantity})` }))} onReport={async (b) => { await reportPackaging(stage.id, b); done(); }} />
        </section>
      ) : null}
      {qc ? (qc.status === "IN_PROGRESS" && can("START_QC") ? <QcExecution key={qc.id + qc.photoCount} inspection={qc} quantity={detail.quantity} stageCodes={stageCodes} onChanged={done} /> : <InspectionSummary inspection={qc} />) : null}
      <BlockersSection blockers={detail.blockers} canResolve={hasPerm("stages.block") && (stage.status === "BLOCKED" || detail.blockers.some((b) => b.status === "OPEN"))} onResolve={async (b, note) => { await api.staffResolveBlocker(b.id, { note }); done(); }} />
      <NotesSection notes={detail.notes} canAdd={can("ADD_NOTE")} onAdd={async (content) => { await api.staffNote(stage.id, { content }); done(); }} />
      <FilesSection stageId={stage.id} files={detail.files} canAttach={can("ATTACH_FILE")} onUpload={async (f, type) => { await api.staffUploadStageFile(stage.id, f, type); done(); }} />
      {dialog === "complete" ? <CompleteStageDialog stageName={stage.stageName} requiresNote={stage.requiresCompletionNote} onSubmit={async (note) => { await api.staffComplete(stage.id, note ? { note } : {}); done(); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "blocker" ? <RaiseBlockerDialog target={stage.stageName} onRaise={async (b) => { await api.staffBlocker(stage.id, b); done(); }} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

export function CompleteStageDialog({ stageName, requiresNote, onSubmit, onClose }: { stageName: string; requiresNote: boolean; onSubmit: (note: string) => Promise<unknown>; onClose: () => void }) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => onSubmit(note.trim()) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={t("production.completeStagename", { stageName })} description={t("production.thisTellsTheNextStageIt")}>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setError(null);
          if (requiresNote && note.trim().length === 0) { setError({ message: t("production.stagenameRequiresACompletionNote", { stageName }) }); return; }
          try { await run.mutateAsync(); toast.success(t("production.stageCompleted")); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); }
        }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="cs-note" label={t("production.completionNote2")} required={requiresNote}><Textarea id="cs-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.back")}</Button><Button type="submit" loading={run.isPending}>{t("production.completeStage")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type AdminDialog = "assign" | "hold" | "resume" | "skip" | "complete" | "rework" | "blocker" | null;

/**
 * Manager layer. Each control is gated by the permission the backend route actually requires:
 * assignment `jobs.assign`, stage hold/resume and admin blockers `factory_jobs.manage`, rework `rework.manage`, overrides
 * `stages.override` (+ `qc.manage` on a QC gate). Overrides stay visually separate from the normal flow and always need a reason.
 */
function AdminLayer({ stage, jobId, orderId, jobBlockers, staff }: { stage: JobStage; jobId: string; orderId?: string | null; jobBlockers?: Blocker[]; staff?: StaffStageDetail }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const invalidate = useProductionInvalidation();
  const defs = useStageDefinitions(can("jobs.assign") || can("rework.manage"));
  const [dialog, setDialog] = useState<AdminDialog>(null);
  const done = () => invalidate({ stageId: stage.id, jobId, orderId });
  const canAssign = can("jobs.assign"), canManage = can("factory_jobs.manage"), canRework = can("rework.manage");
  const canOverride = can("stages.override") && (!stage.isQcStage || can("qc.manage"));
  if (!canAssign && !canManage && !canOverride && !canRework) return null;
  const def = defs.data?.find((d) => d.code === stage.stageCode);
  const open = !stage.superseded && !["COMPLETED", "SKIPPED", "CANCELLED", "FAILED"].includes(stage.status);
  const openBlockers = (jobBlockers ?? []).filter((b) => b.jobStageId === stage.id && b.status === "OPEN");
  // When the operational layer already offers these (backend allowedActions / staff blocker list), don't repeat them here.
  const staffRaises = !!staff?.allowedActions.includes("RAISE_BLOCKER");
  const staffResolves = !!staff && can("stages.block");
  return (
    <section aria-label={t("production.adminActions")} className="space-y-3 rounded-md border border-dashed p-3" data-testid="admin-actions">
      <h4 className="text-sm font-semibold">{t("production.managerActions")}</h4>
      {canAssign && !stage.superseded ? (
        <div className="space-y-1.5">
          {stage.assignees.length ? <ul className="space-y-1 text-sm">{stage.assignees.map((a) => <li key={a.assignmentId} className="flex items-center justify-between gap-2"><span>{a.name}{a.isPrimary ? t("production.primary") : ""}</span><Button size="sm" variant="ghost" onClick={async () => { try { await api.unassignStage(stage.id, a.assignmentId); toast.success(t("common.unassigned")); done(); } catch (e) { toast.error(errorMessage(e)); } }}>{t("production.remove")}</Button></li>)}</ul> : null}
          <Button size="sm" variant="secondary" onClick={() => setDialog("assign")}>{stage.assignees.length ? t("production.assignMoreReassign") : t("production.assignStaff")}</Button>
          <p className="text-xs text-muted-foreground">{t("production.assignmentIsOptionalForAdministrativeOperati")}</p>
        </div>
      ) : null}
      {open && canManage ? (
        <div className="flex flex-wrap gap-2">
          {stage.isOnHold ? <Button size="sm" variant="secondary" onClick={() => setDialog("resume")}>{t("production.resumeStage")}</Button> : <Button size="sm" variant="secondary" onClick={() => setDialog("hold")}>{t("production.holdStage")}</Button>}
          {!staffRaises ? <Button size="sm" variant="secondary" onClick={() => setDialog("blocker")}>{t("production.raiseBlocker")}</Button> : null}
        </div>
      ) : null}
      {canManage && openBlockers.length && !staffResolves ? (
        <BlockersSection blockers={openBlockers} canResolve onResolve={async (b, note) => { await api.resolveBlockerAdmin(b.id, "resolve", note ? { note } : {}); done(); }} />
      ) : null}
      {canRework && !stage.superseded && ["COMPLETED", "FAILED", "IN_PROGRESS"].includes(stage.status) ? <div><Button size="sm" variant="secondary" onClick={() => setDialog("rework")}>{t("production.sendBackForRework2")}</Button></div> : null}
      {canOverride && open ? (
        <div className="space-y-1.5 rounded-md border border-danger/30 bg-tone-danger-bg/30 p-2.5" data-testid="administrative-override">
          <p className="text-xs font-semibold uppercase tracking-wide text-danger">{t("production.administrativeOverride")}</p>
          <p className="text-xs text-muted-foreground">{t("production.bypassesTheNormalFlowUseStart")}</p>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="danger" onClick={() => setDialog("complete")}>{t("production.overrideMarkComplete")}</Button><Button size="sm" variant="danger" onClick={() => setDialog("skip")}>{t("production.overrideSkip")}</Button></div>
        </div>
      ) : null}

      {dialog === "assign" ? <AssignStageDialog stageName={stage.stageName} eligibleRoleCodes={def?.eligibleRoleCodes ?? []} canSearch={can("users.read")} assignedIds={stage.assignees.map((a) => a.userId)} onAssign={async (userId, isPrimary) => { await api.assignStage(stage.id, { userId, isPrimary }); done(); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "hold" ? <ReasonDialog title={t("production.holdStage")} description={t("production.pausesThisStageStaffCannotProgress")} confirmLabel={t("production.holdStage")} onSubmit={async (reason) => { await api.stageHold(stage.id, "hold", { reason }); toast.success(t("production.stageOnHold")); done(); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "resume" ? <ReasonDialog title={t("production.resumeStage")} description={t("production.letsStaffContinueThisStage")} confirmLabel={t("production.resumeStage")} onSubmit={async (reason) => { await api.stageHold(stage.id, "resume", { reason }); toast.success(t("production.stageResumed")); done(); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "complete" || dialog === "skip" ? <ReasonDialog title={dialog === "complete" ? t("production.overrideCompleteStage") : t("production.overrideSkipStage")} description={t("production.administrativeOverrideV1TheReasonIs", { v1: dialog === "complete" ? "Marks the stage complete without the normal requirements." : "Skips this stage entirely." })} confirmLabel={dialog === "complete" ? t("production.completeOverride") : t("production.skipOverride")} destructive onSubmit={async (reason) => { await api.stageOverride(stage.id, { action: dialog === "complete" ? "complete" : "skip", reason }); toast.success(t("production.overrideApplied")); done(); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "rework" ? <ReworkDialog stageName={stage.stageName} defs={(defs.data ?? []).filter((d) => !d.isQcStage)} bulk={false} onSubmit={async (b) => { await api.manualRework(stage.id, b); toast.success(t("production.reworkCreated")); done(); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "blocker" ? <RaiseBlockerDialog target={stage.stageName} onRaise={async (b) => { await api.raiseStageBlockerAdmin(stage.id, b); done(); }} onClose={() => setDialog(null)} /> : null}
    </section>
  );
}
