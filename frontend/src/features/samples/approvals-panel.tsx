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
import { formatDateTime } from "@/lib/utils/format";
import * as api from "./api";
import { useSampleApprovals, useSampleInvalidation } from "./hooks";
import { APPROVAL_MODE_LABELS, APPROVAL_TYPE_LABELS, label } from "./labels";
import type { Approval, SampleDetail } from "./types";

/**
 * Approvals of this sample (artwork, physical sample, production spec; quotation approvals are handled with quotations in
 * Phase 2C). Decisions are RECORDED by staff, either on behalf of the customer (with evidence) or as an internal decision:
 * the wording never says "approve as customer".
 */
export function ApprovalsPanel({ sample, canManage }: { sample: SampleDetail; canManage: boolean }) {
  const q = useSampleApprovals(sample.id);
  const inv = useSampleInvalidation();
  const [deciding, setDeciding] = useState<{ approval: Approval; decision: "approve" | "reject" } | null>(null);
  const [cancelling, setCancelling] = useState<Approval | null>(null);
  const cancel = useMutation({ mutationFn: (a: Approval) => api.cancelApproval(a.id), onSuccess: () => { void inv.approvals(sample.id); void inv.artwork(sample.id); } });
  const request = useMutation({ mutationFn: () => api.requestApproval(sample.id, { type: "SAMPLE" }), onSuccess: () => { void inv.approvals(sample.id); toast.success("Sample approval requested"); }, onError: (e) => toast.error(errorMessage(e)) });
  const pendingSample = q.data?.some((a) => a.type === "SAMPLE" && a.status === "PENDING");

  const target = (a: Approval) => (a.type === "ARTWORK" ? "Artwork version" : a.type === "QUOTATION" ? "Quotation version" : a.type === "PRODUCTION_SPEC" ? "Production spec" : "Physical sample");
  return (
    <Card aria-labelledby="appr-title">
      <CardHeader>
        <CardTitle><span id="appr-title">Approvals</span></CardTitle>
        {canManage && sample.status === "AWAITING_APPROVAL" && !pendingSample ? <Button size="sm" variant="secondary" loading={request.isPending} onClick={() => request.mutate()}>Request sample approval</Button> : null}
      </CardHeader>
      {q.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" /> : q.data && q.data.length === 0 ? (
        <EmptyState title="No approval requests" description="Artwork, physical-sample and specification approvals appear here." className="py-8" />
      ) : (
        <ul className="divide-y" data-testid="approvals">
          {q.data?.map((a) => (
            <li key={a.id} data-status={a.status} className="space-y-1.5 px-4 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{APPROVAL_TYPE_LABELS[a.type] ?? a.type}</span>
                <StatusBadge status={a.status} />
                <span className="text-xs text-muted-foreground">{target(a)}</span>
                {a.type === "QUOTATION" ? <Badge variant="outline">Handled in quotations</Badge> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                Requested {formatDateTime(a.requestedAt)}{a.expiresAt ? ` · expires ${formatDateTime(a.expiresAt)}` : ""}
                {a.respondedAt ? ` · Decided ${formatDateTime(a.respondedAt)}${a.mode ? ` · ${label(APPROVAL_MODE_LABELS, a.mode)}` : ""}` : ""}
              </p>
              {a.sourceNote ? <p className="text-xs"><span className="text-muted-foreground">Source:</span> {a.sourceNote}</p> : null}
              {a.responseNote ? <p className="text-xs"><span className="text-muted-foreground">Note:</span> {a.responseNote}</p> : null}
              {canManage && a.status === "PENDING" && a.type !== "QUOTATION" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => setDeciding({ approval: a, decision: "approve" })}>Record approval</Button>
                  <Button size="sm" variant="secondary" onClick={() => setDeciding({ approval: a, decision: "reject" })}>Record rejection</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCancelling(a)}>Cancel request</Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {deciding ? <DecisionDialog sampleId={sample.id} approval={deciding.approval} decision={deciding.decision} onClose={() => setDeciding(null)} /> : null}
      <ConfirmDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)} title="Cancel this approval request?" description="No decision is recorded. A new request can be made later." confirmLabel="Cancel request" destructive loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling, { onSuccess: () => { toast.success("Request cancelled"); setCancelling(null); }, onError: (e) => { toast.error(errorMessage(e)); setCancelling(null); } })} />
    </Card>
  );
}

function DecisionDialog({ sampleId, approval, decision, onClose }: { sampleId: string; approval: Approval; decision: "approve" | "reject"; onClose: () => void }) {
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
      <DialogContent title={decision === "approve" ? `Record approval — ${what}` : `Record rejection — ${what}`} description="You are recording a decision. The customer is not signing in." className="max-w-lg">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(decision === "approve" ? "Approval recorded" : "Rejection recorded"); onClose(); } catch (err) { setError({ message: errorMessage(err) }); } }}>
          {error ? <FormError {...error} /> : null}
          <ChoiceGroup name="recorded-as" aria-label="How was the decision made" columns={1} value={recordedAs} onValueChange={setRecordedAs}
            options={[{ value: "ON_BEHALF_OF_CUSTOMER", label: `Record the customer's ${decision === "approve" ? "approval" : "rejection"}`, description: "The customer told us their decision (message, call…). Evidence is required." }, { value: "INTERNAL", label: "Internal staff decision", description: "A decision made by the team, not communicated by the customer." }]} />
          {onBehalf ? <FormField id="d-source" label="Source / evidence" required hint="e.g. “WhatsApp, 21 Oct 14:05”"><Textarea id="d-source" rows={2} value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} /></FormField> : null}
          <FormField id="d-resp" label={rejectingSample ? "Reason" : "Comment"} required={rejectingSample}><Textarea id="d-resp" rows={2} value={responseNote} onChange={(e) => setResponseNote(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Back</Button><Button type="submit" variant={decision === "reject" ? "danger" : "primary"} loading={run.isPending} disabled={invalid}>{decision === "approve" ? "Record approval" : "Record rejection"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
