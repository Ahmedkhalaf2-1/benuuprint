"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, EmptyState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime, formatMoney, humanizeCode } from "@/lib/utils/format";
import * as api from "./api";
import { useCommercialInvalidation, useQuotations } from "./hooks";
import { QuotationEditor, type EditorMode } from "./quotation-editor";
import type { CommercialTarget, QuotationVersion } from "./types";

const m = (v: string, c: string) => formatMoney(v, c);

/** A version that was ACCEPTED and later ended by a revision is history, never "current". */
export const wasInvalidated = (v: QuotationVersion) => !!v.invalidatedAt;

function VersionCard({ v, currency, current, children }: { v: QuotationVersion; currency: string; current: boolean; children?: React.ReactNode }) {
  const when = v.acceptedAt ? `Accepted ${formatDate(v.acceptedAt)}` : v.rejectedAt ? `Rejected ${formatDate(v.rejectedAt)}` : v.expiredAt ? `Expired ${formatDate(v.expiredAt)}` : v.supersededAt ? `Superseded ${formatDate(v.supersededAt)}` : v.sentAt ? `Sent ${formatDate(v.sentAt)}` : `Created ${formatDate(v.createdAt)}`;
  return (
    <li data-testid="quotation-version" data-status={v.status} data-current={current ? "true" : "false"} className={`rounded-md border p-3 ${current ? "border-brand bg-brand-soft/30" : "opacity-90"}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">Version {v.versionNumber}</span>
        <StatusBadge status={v.status} />
        {current ? <Badge variant="brand">Current</Badge> : null}
        {wasInvalidated(v) ? <Badge variant="danger">Ended by revision{v.invalidatedByRevision != null ? ` ${v.invalidatedByRevision}` : ""}</Badge> : null}
        <span className="text-xs text-muted-foreground">{when}</span>
        <span className="ms-auto text-sm font-semibold tabular-nums">{m(v.total, currency)}</span>
      </div>
      {wasInvalidated(v) ? <p className="mt-1 text-xs text-tone-danger-fg">{v.invalidationReason ?? "This quotation was ended by a later change."} It is no longer the quotation in force.</p> : null}
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-5">
        <div><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{m(v.subtotal, currency)}</dd></div>
        <div><dt className="text-muted-foreground">Discount</dt><dd className="tabular-nums">{m(v.discount, currency)}</dd></div>
        <div><dt className="text-muted-foreground">Tax ({Number(v.taxPercent)}%)</dt><dd className="tabular-nums">{m(v.tax, currency)}</dd></div>
        <div><dt className="text-muted-foreground">Valid until</dt><dd>{v.validUntil ? formatDateTime(v.validUntil) : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Created</dt><dd>{formatDate(v.createdAt)}</dd></div>
      </dl>
      <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-brand">Line items ({v.lineItems.length})</summary>
        <div className="relative mt-2 overflow-x-auto"><table className="w-full min-w-[28rem] text-xs"><caption className="sr-only">Line items of version {v.versionNumber}</caption>
          <thead className="text-muted-foreground"><tr><th scope="col" className="py-1 text-start font-medium">Type</th><th scope="col" className="text-start font-medium">Description</th><th scope="col" className="text-end font-medium">Qty</th><th scope="col" className="text-end font-medium">Unit price</th><th scope="col" className="text-end font-medium">Amount</th></tr></thead>
          <tbody>{v.lineItems.map((l) => <tr key={l.id} className="border-t"><td className="py-1">{humanizeCode(l.type)}</td><td>{l.description}</td><td className="text-end tabular-nums">{Number(l.quantity)}</td><td className="text-end tabular-nums">{l.unitPrice}</td><td className="text-end tabular-nums">{l.amount}</td></tr>)}</tbody></table></div>
        {v.notes ? <p className="mt-2 text-xs text-muted-foreground">Notes: {v.notes}</p> : null}
      </details>
      {children}
    </li>
  );
}

/** `canStart` = the owner can take a new quotation now (sample UNDER_REVIEW; order not yet released); `startHint` explains otherwise. */
export function QuotationPanel({ target, canStart, startHint }: { target: CommercialTarget; canStart: boolean; startHint: string }) {
  const { can } = useAuth();
  const q = useQuotations(target);
  const inv = useCommercialInvalidation(target);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [sending, setSending] = useState<QuotationVersion | null>(null);
  const [deciding, setDeciding] = useState<{ v: QuotationVersion; decision: "accept" | "reject" } | null>(null);
  const canCreate = can("quotations.create");
  const canDecide = can("approvals.manage");
  const send = useMutation({ mutationFn: (v: QuotationVersion) => api.sendQuotationVersion(v.id), onSuccess: () => inv.all() });

  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title="Quotations are not available to your role" description="Quotation details are restricted." className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const quotations = q.data ?? [];
  if (quotations.length === 0) {
    return (
      <Card><EmptyState title="No quotation yet" description={canStart ? (canCreate ? "Create a quotation." : "A quotation has not been created yet.") : startHint}
        action={canCreate ? <Button size="sm" onClick={() => setEditor({ kind: "create", target })}><Plus /> New quotation</Button> : undefined} />
        {editor ? <QuotationEditor mode={editor} onClose={() => setEditor(null)} /> : null}
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {quotations.map((qt) => {
        const versions = [...qt.versions].sort((a, b) => b.versionNumber - a.versionNumber);
        const cur = qt.currentVersion;
        const hasAccepted = versions.some((v) => v.status === "ACCEPTED" && !v.invalidatedAt);
        const lostAccepted = versions.find((v) => v.acceptedAt && v.invalidatedAt);
        return (
          <Card key={qt.id} aria-labelledby={`q-${qt.id}`}>
            <CardHeader>
              <CardTitle><span id={`q-${qt.id}`}>{qt.quotationNumber}</span> <span className="ms-2"><StatusBadge status={qt.status} /></span></CardTitle>
              <span className="text-xs text-muted-foreground">{qt.currency} · {versions.length} version{versions.length === 1 ? "" : "s"}</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {lostAccepted && !hasAccepted ? (
                <div role="alert" data-testid="reapproval" className="flex gap-2 rounded-md bg-tone-danger-bg p-3 text-sm text-tone-danger-fg">
                  <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <div><p className="font-semibold">Commercial reapproval required</p>
                    <p>The quotation accepted earlier (version {lostAccepted.versionNumber}, {m(lostAccepted.total, qt.currency)}) is no longer in force{lostAccepted.invalidationReason ? `: ${lostAccepted.invalidationReason}` : "."} Create or send a new version and record the customer&apos;s acceptance again.</p></div>
                </div>
              ) : null}
              <ul className="space-y-2" aria-label={`Versions of ${qt.quotationNumber}`}>
                {versions.map((v) => {
                  const isCurrent = cur?.id === v.id && !v.invalidatedAt && v.status !== "SUPERSEDED";
                  return (
                    <VersionCard key={v.id} v={v} currency={qt.currency} current={isCurrent}>
                      {isCurrent ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {v.status === "DRAFT" && canCreate ? <><Button size="sm" variant="secondary" onClick={() => setEditor({ kind: "edit", target, version: v })}>Edit draft</Button><Button size="sm" onClick={() => setSending(v)}>Send quotation</Button></> : null}
                          {v.status === "SENT" && canDecide ? <><Button size="sm" onClick={() => setDeciding({ v, decision: "accept" })}>Record customer acceptance</Button><Button size="sm" variant="secondary" onClick={() => setDeciding({ v, decision: "reject" })}>Record customer rejection</Button></> : null}
                          {(v.status === "SENT" || v.status === "REJECTED" || v.status === "EXPIRED") && canCreate ? <Button size="sm" variant="ghost" onClick={() => setEditor({ kind: "version", target, quotationId: qt.id, from: v })}><Plus /> New version</Button> : null}
                        </div>
                      ) : null}
                    </VersionCard>
                  );
                })}
              </ul>
              {cur && !cur.invalidatedAt && (cur.status === "SUPERSEDED") && canCreate ? <Button size="sm" variant="ghost" onClick={() => setEditor({ kind: "version", target, quotationId: qt.id, from: cur })}><Plus /> New version</Button> : null}
            </CardContent>
          </Card>
        );
      })}
      {editor ? <QuotationEditor mode={editor} onClose={() => setEditor(null)} /> : null}
      <ConfirmDialog
        open={!!sending}
        onOpenChange={(o) => !o && setSending(null)}
        title={`Send version ${sending?.versionNumber ?? ""}?`}
        description={`Once sent the version is frozen: changes need a new version.${target.kind === "sample" ? " The sample moves to QUOTED." : ""}`}
        confirmLabel="Send quotation"
        loading={send.isPending}
        onConfirm={() => sending && send.mutate(sending, { onSuccess: () => { toast.success("Quotation sent"); setSending(null); }, onError: (e) => { toast.error(errorMessage(e)); setSending(null); } })}
      />
      {deciding ? <DecisionDialog target={target} version={deciding.v} decision={deciding.decision} onClose={() => setDeciding(null)} /> : null}
    </div>
  );
}

/** Staff record what the customer decided outside the system; the evidence note is mandatory. */
function DecisionDialog({ target, version, decision, onClose }: { target: CommercialTarget; version: QuotationVersion; decision: "accept" | "reject"; onClose: () => void }) {
  const inv = useCommercialInvalidation(target);
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.decideQuotationVersion(target, version.id, decision, { sourceNote: source.trim(), responseNote: note.trim() || undefined }), onSuccess: () => inv.all() });
  const word = decision === "accept" ? "acceptance" : "rejection";
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`Record customer ${word} — version ${version.versionNumber}`} description="You are recording a decision the customer communicated. The customer does not sign in or confirm in the app.">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(`Customer ${word} recorded`); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="qd-source" label="Source / evidence" required hint="e.g. “WhatsApp confirmation, 21 Oct 16:10” (3–500 characters)"><Textarea id="qd-source" rows={2} maxLength={500} value={source} onChange={(e) => setSource(e.target.value)} /></FormField>
          <FormField id="qd-note" label={decision === "reject" ? "Customer's reason" : "Customer's comment"} hint={decision === "reject" ? "Recommended" : undefined}><Textarea id="qd-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Back</Button><Button type="submit" variant={decision === "reject" ? "danger" : "primary"} loading={run.isPending} disabled={source.trim().length < 3}>Record {word}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
