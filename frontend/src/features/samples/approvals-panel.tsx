"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { ChoiceGroup } from "@/components/forms/choice-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/errors";

import * as api from "./api";
import { useSampleApprovals, useSampleInvalidation } from "./hooks";
import { APPROVAL_MODE_LABELS, APPROVAL_TYPE_LABELS, label } from "./labels";
import type { Approval, SampleDetail } from "./types";
import { useI18n } from "@/i18n/provider";

/**
 * Approvals of this sample (artwork, physical sample, production spec; quotation approvals are handled with quotations in
 * Phase 2C). Decisions are RECORDED by staff, either on behalf of the customer (with evidence) or as an internal decision:
 * the wording never says "approve as customer".
 */
export function ApprovalsPanel({ sample, canManage }: { sample: SampleDetail; canManage: boolean }) {
  const { t, fmt } = useI18n();
  const q = useSampleApprovals(sample.id);
  const inv = useSampleInvalidation();
  const [deciding, setDeciding] = useState<{ approval: Approval; decision: "approve" | "reject" } | null>(null);
  const [cancelling, setCancelling] = useState<Approval | null>(null);
  const cancel = useMutation({ mutationFn: (a: Approval) => api.cancelApproval(a.id), onSuccess: () => { void inv.approvals(sample.id); void inv.artwork(sample.id); } });
  const request = useMutation({ mutationFn: () => api.requestApproval(sample.id, { type: "SAMPLE" }), onSuccess: () => { void inv.approvals(sample.id); toast.success(t("samples.sampleApprovalRequested")); }, onError: (e) => toast.error(errorMessage(e)) });
  const pendingSample = q.data?.some((a) => a.type === "SAMPLE" && a.status === "PENDING");

  const target = (a: Approval) => (a.type === "ARTWORK" ? "Artwork version" : a.type === "QUOTATION" ? "Quotation version" : a.type === "PRODUCTION_SPEC" ? "Production spec" : "Physical sample");
  return (
    <Card aria-labelledby="appr-title">
      <CardHeader>
        <CardTitle><span id="appr-title">{t("samples.approvals")}</span></CardTitle>
        {canManage && sample.status === "AWAITING_APPROVAL" && !pendingSample ? <Button size="sm" variant="secondary" loading={request.isPending} onClick={() => request.mutate()}>{t("samples.requestSampleApproval")}</Button> : null}
      </CardHeader>
      {q.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" /> : q.data && q.data.length === 0 ? (
        <EmptyState title={t("samples.noApprovalRequests")} description={t("samples.artworkPhysicalSampleAndSpecificationApprova")} className="py-8" />
      ) : (
        <ul className="divide-y" data-testid="approvals">
          {q.data?.map((a) => (
            <li key={a.id} data-status={a.status} className="space-y-1.5 px-4 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{APPROVAL_TYPE_LABELS[a.type] ?? a.type}</span>
                <StatusBadge status={a.status} />
                <span className="text-xs text-muted-foreground">{target(a)}</span>
                {a.type === "QUOTATION" ? <Badge variant="outline">{t("samples.handledInQuotations")}</Badge> : null}
              </p>
              <p className="text-xs text-muted-foreground">{t("samples.requestedRequestedat", { requestedAt: fmt.dateTime(a.requestedAt) })}{a.expiresAt ? t("samples.expiresExpiresat", { expiresAt: fmt.dateTime(a.expiresAt) }) : ""}
                {a.respondedAt ? t("samples.decidedRespondedatV2", { respondedAt: fmt.dateTime(a.respondedAt), v2: a.mode ? ` · ${label(APPROVAL_MODE_LABELS, a.mode)}` : "" }) : ""}
              </p>
              {a.sourceNote ? <p className="text-xs"><span className="text-muted-foreground">{t("samples.source")}</span> {a.sourceNote}</p> : null}
              {a.responseNote ? <p className="text-xs"><span className="text-muted-foreground">{t("samples.note")}</span> {a.responseNote}</p> : null}
              {canManage && a.status === "PENDING" && a.type !== "QUOTATION" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => setDeciding({ approval: a, decision: "approve" })}>{t("samples.recordApproval")}</Button>
                  <Button size="sm" variant="secondary" onClick={() => setDeciding({ approval: a, decision: "reject" })}>{t("samples.recordRejection")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCancelling(a)}>{t("samples.cancelRequest")}</Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {deciding ? <DecisionDialog sampleId={sample.id} approval={deciding.approval} decision={deciding.decision} onClose={() => setDeciding(null)} /> : null}
      <ConfirmDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)} title={t("samples.cancelThisApprovalRequest")} description={t("samples.noDecisionIsRecordedANew")} confirmLabel={t("samples.cancelRequest")} destructive loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling, { onSuccess: () => { toast.success(t("samples.requestCancelled")); setCancelling(null); }, onError: (e) => { toast.error(errorMessage(e)); setCancelling(null); } })} />
    </Card>
  );
}

function DecisionDialog({ sampleId, approval, decision, onClose }: { sampleId: string; approval: Approval; decision: "approve" | "reject"; onClose: () => void }) {
  const { t } = useI18n();
  const inv = useSampleInvalidation();
  const [recordedAs, setRecordedAs] = useState<"ON_BEHALF_OF_CUSTOMER" | "INTERNAL">("ON_BEHALF_OF_CUSTOMER");
  const [sourceNote, setSourceNote] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [error, setError] = useState<{ message: string } | null>(null);
  const onBehalf = recordedAs === "ON_BEHALF_OF_CUSTOMER";
  const rejectingSample = decision === "reject" && approval.type === "SAMPLE";
  const invalid = (onBehalf && sourceNote.trim().length < 3) || (rejectingSample && responseNote.trim().length < 3);
  const what = APPROVAL_TYPE_LABELS[approval.type] ?? approval.type;
  const run = useMutation({
    mutationFn: () => api.respondApproval(approval.id, decision, { recordedAs, sourceNote: onBehalf ? sourceNote.trim() : undefined, responseNote: responseNote.trim() || undefined }),
    onSuccess: () => { inv.approvals(sampleId); inv.artwork(sampleId); inv.afterAction(sampleId); },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={decision === "approve" ? t("samples.recordApprovalWhat", { what }) : t("samples.recordRejectionWhat", { what })} description={t("samples.youAreRecordingADecisionThe")} className="max-w-lg">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(decision === "approve" ? t("samples.approvalRecorded") : t("samples.rejectionRecorded")); onClose(); } catch (err) { setError({ message: errorMessage(err) }); } }}>
          {error ? <FormError {...error} /> : null}
          <ChoiceGroup name="recorded-as" aria-label={t("samples.howWasTheDecisionMade")} columns={1} value={recordedAs} onValueChange={setRecordedAs}
            options={[{ value: "ON_BEHALF_OF_CUSTOMER", label: t("samples.recordTheCustomerSV1", { v1: decision === "approve" ? "approval" : "rejection" }), description: t("samples.theCustomerToldUsTheirDecision") }, { value: "INTERNAL", label: t("samples.internalStaffDecision"), description: t("samples.aDecisionMadeByTheTeam") }]} />
          {onBehalf ? <FormField id="d-source" label={t("samples.sourceEvidence")} required hint={t("samples.eGWhatsapp21Oct14")}><Textarea id="d-source" rows={2} value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} /></FormField> : null}
          <FormField id="d-resp" label={rejectingSample ? t("common.reason") : t("samples.comment")} required={rejectingSample}><Textarea id="d-resp" rows={2} value={responseNote} onChange={(e) => setResponseNote(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.back")}</Button><Button type="submit" variant={decision === "reject" ? "danger" : "primary"} loading={run.isPending} disabled={invalid}>{decision === "approve" ? t("samples.recordApproval") : t("samples.recordRejection")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
