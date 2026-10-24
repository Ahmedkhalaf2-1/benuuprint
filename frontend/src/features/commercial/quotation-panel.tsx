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
import { formatMoney } from "@/lib/utils/format";
import * as api from "./api";
import { useCommercialInvalidation, useQuotations } from "./hooks";
import { QuotationEditor, type EditorMode } from "./quotation-editor";
import type { CommercialTarget, QuotationVersion } from "./types";
import { useI18n } from "@/i18n/provider";

const m = (v: string, c: string) => formatMoney(v, c);

/** A version that was ACCEPTED and later ended by a revision is history, never "current". */
export const wasInvalidated = (v: QuotationVersion) => !!v.invalidatedAt;

function VersionCard({ v, currency, current, children }: { v: QuotationVersion; currency: string; current: boolean; children?: React.ReactNode }) {
  const { t, fmt } = useI18n();
  const when = v.acceptedAt ? t("quotations.whenAccepted", { date: fmt.date(v.acceptedAt) }) : v.rejectedAt ? t("quotations.whenRejected", { date: fmt.date(v.rejectedAt) }) : v.expiredAt ? t("quotations.whenExpired", { date: fmt.date(v.expiredAt) }) : v.supersededAt ? t("quotations.whenSuperseded", { date: fmt.date(v.supersededAt) }) : v.sentAt ? t("quotations.whenSent", { date: fmt.date(v.sentAt) }) : t("quotations.whenCreated", { date: fmt.date(v.createdAt) });
  return (
    <li data-testid="quotation-version" data-status={v.status} data-current={current ? "true" : "false"} className={`rounded-md border p-3 ${current ? "border-brand bg-brand-soft/30" : "opacity-90"}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{t("quotations.versionVersionnumber2", { versionNumber: v.versionNumber })}</span>
        <StatusBadge status={v.status} />
        {current ? <Badge variant="brand">{t("quotations.current")}</Badge> : null}
        {wasInvalidated(v) ? <Badge variant="danger">{t("quotations.endedByRevision")}{v.invalidatedByRevision != null ? ` ${v.invalidatedByRevision}` : ""}</Badge> : null}
        <span className="text-xs text-muted-foreground">{when}</span>
        <span className="ms-auto text-sm font-semibold tabular-nums">{m(v.total, currency)}</span>
      </div>
      {wasInvalidated(v) ? <p className="mt-1 text-xs text-tone-danger-fg">{v.invalidationReason ?? t("quotations.thisQuotationWasEndedByA")}{" "}{t("quotations.itIsNoLongerTheQuotation")}</p> : null}
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-5">
        <div><dt className="text-muted-foreground">{t("quotations.subtotal")}</dt><dd className="tabular-nums">{m(v.subtotal, currency)}</dd></div>
        <div><dt className="text-muted-foreground">{t("quotations.discount")}</dt><dd className="tabular-nums">{m(v.discount, currency)}</dd></div>
        <div><dt className="text-muted-foreground">{t("quotations.taxTaxpercent", { taxPercent: Number(v.taxPercent) })}</dt><dd className="tabular-nums">{m(v.tax, currency)}</dd></div>
        <div><dt className="text-muted-foreground">{t("quotations.validUntil")}</dt><dd>{v.validUntil ? fmt.dateTime(v.validUntil) : "—"}</dd></div>
        <div><dt className="text-muted-foreground">{t("common.created")}</dt><dd>{fmt.date(v.createdAt)}</dd></div>
      </dl>
      <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-brand">{t("quotations.lineItemsLength", { length: v.lineItems.length })}</summary>
        <div className="relative mt-2 overflow-x-auto"><table className="w-full min-w-[28rem] text-xs"><caption className="sr-only">{t("quotations.lineItemsOfVersionVersionnumber", { versionNumber: v.versionNumber })}</caption>
          <thead className="text-muted-foreground"><tr><th scope="col" className="py-1 text-start font-medium">{t("common.type")}</th><th scope="col" className="text-start font-medium">{t("common.description")}</th><th scope="col" className="text-end font-medium">{t("quotations.qty")}</th><th scope="col" className="text-end font-medium">{t("quotations.unitPrice")}</th><th scope="col" className="text-end font-medium">{t("quotations.amount")}</th></tr></thead>
          <tbody>{v.lineItems.map((l) => <tr key={l.id} className="border-t"><td className="py-1">{fmt.code(l.type)}</td><td>{l.description}</td><td className="text-end tabular-nums">{Number(l.quantity)}</td><td className="text-end tabular-nums">{l.unitPrice}</td><td className="text-end tabular-nums">{l.amount}</td></tr>)}</tbody></table></div>
        {v.notes ? <p className="mt-2 text-xs text-muted-foreground">{t("quotations.notesNotes", { notes: v.notes })}</p> : null}
      </details>
      {children}
    </li>
  );
}

/** `canStart` = the owner can take a new quotation now (sample UNDER_REVIEW; order not yet released); `startHint` explains otherwise. */
export function QuotationPanel({ target, canStart, startHint }: { target: CommercialTarget; canStart: boolean; startHint: string }) {
  const { t } = useI18n();
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
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title={t("quotations.quotationsAreNotAvailableToYour")} description={t("quotations.quotationDetailsAreRestricted")} className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const quotations = q.data ?? [];
  if (quotations.length === 0) {
    return (
      <Card><EmptyState title={t("quotations.noQuotationYet2")} description={canStart ? (canCreate ? t("quotations.createAQuotation") : t("quotations.aQuotationHasNotBeenCreated")) : startHint}
        action={canCreate ? <Button size="sm" onClick={() => setEditor({ kind: "create", target })}><Plus />{" "}{t("quotations.newQuotation")}</Button> : undefined} />
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
              <span className="text-xs text-muted-foreground">{t("quotations.currencyLengthVersion", { currency: qt.currency, length: versions.length })}{versions.length === 1 ? "" : "s"}</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {lostAccepted && !hasAccepted ? (
                <div role="alert" data-testid="reapproval" className="flex gap-2 rounded-md bg-tone-danger-bg p-3 text-sm text-tone-danger-fg">
                  <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <div><p className="font-semibold">{t("quotations.commercialReapprovalRequired")}</p>
                    <p>{t("quotations.theQuotationAcceptedEarlierVersionVersionnum", { versionNumber: lostAccepted.versionNumber, total: m(lostAccepted.total, qt.currency) })}{lostAccepted.invalidationReason ? `: ${lostAccepted.invalidationReason}` : "."}{" "}{t("quotations.createOrSendANewVersion")}</p></div>
                </div>
              ) : null}
              <ul className="space-y-2" aria-label={t("quotations.versionsOfQuotationnumber", { quotationNumber: qt.quotationNumber })}>
                {versions.map((v) => {
                  const isCurrent = cur?.id === v.id && !v.invalidatedAt && v.status !== "SUPERSEDED";
                  return (
                    <VersionCard key={v.id} v={v} currency={qt.currency} current={isCurrent}>
                      {isCurrent ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {v.status === "DRAFT" && canCreate ? <><Button size="sm" variant="secondary" onClick={() => setEditor({ kind: "edit", target, version: v })}>{t("quotations.editDraft")}</Button><Button size="sm" onClick={() => setSending(v)}>{t("quotations.sendQuotation")}</Button></> : null}
                          {v.status === "SENT" && canDecide ? <><Button size="sm" onClick={() => setDeciding({ v, decision: "accept" })}>{t("quotations.recordCustomerAcceptance")}</Button><Button size="sm" variant="secondary" onClick={() => setDeciding({ v, decision: "reject" })}>{t("quotations.recordCustomerRejection")}</Button></> : null}
                          {(v.status === "SENT" || v.status === "REJECTED" || v.status === "EXPIRED") && canCreate ? <Button size="sm" variant="ghost" onClick={() => setEditor({ kind: "version", target, quotationId: qt.id, from: v })}><Plus />{" "}{t("quotations.newVersion")}</Button> : null}
                        </div>
                      ) : null}
                    </VersionCard>
                  );
                })}
              </ul>
              {cur && !cur.invalidatedAt && (cur.status === "SUPERSEDED") && canCreate ? <Button size="sm" variant="ghost" onClick={() => setEditor({ kind: "version", target, quotationId: qt.id, from: cur })}><Plus />{" "}{t("quotations.newVersion")}</Button> : null}
            </CardContent>
          </Card>
        );
      })}
      {editor ? <QuotationEditor mode={editor} onClose={() => setEditor(null)} /> : null}
      <ConfirmDialog
        open={!!sending}
        onOpenChange={(o) => !o && setSending(null)}
        title={t("quotations.sendVersionV1", { v1: sending?.versionNumber ?? "" })}
        description={t("quotations.onceSentTheVersionIsFrozen", { v1: target.kind === "sample" ? " The sample moves to QUOTED." : "" })}
        confirmLabel={t("quotations.sendQuotation")}
        loading={send.isPending}
        onConfirm={() => sending && send.mutate(sending, { onSuccess: () => { toast.success(t("quotations.quotationSent")); setSending(null); }, onError: (e) => { toast.error(errorMessage(e)); setSending(null); } })}
      />
      {deciding ? <DecisionDialog target={target} version={deciding.v} decision={deciding.decision} onClose={() => setDeciding(null)} /> : null}
    </div>
  );
}

/** Staff record what the customer decided outside the system; the evidence note is mandatory. */
function DecisionDialog({ target, version, decision, onClose }: { target: CommercialTarget; version: QuotationVersion; decision: "accept" | "reject"; onClose: () => void }) {
  const { t } = useI18n();
  const inv = useCommercialInvalidation(target);
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.decideQuotationVersion(target, version.id, decision, { sourceNote: source.trim(), responseNote: note.trim() || undefined }), onSuccess: () => inv.all() });
  const word = decision === "accept" ? "acceptance" : "rejection";
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={t("quotations.recordCustomerWordVersionVersionnumber", { word, versionNumber: version.versionNumber })} description={t("quotations.youAreRecordingADecisionThe")}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(t("quotations.customerWordRecorded", { word })); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="qd-source" label={t("quotations.sourceEvidence")} required hint={t("quotations.eGWhatsappConfirmation21Oct")}><Textarea id="qd-source" rows={2} maxLength={500} value={source} onChange={(e) => setSource(e.target.value)} /></FormField>
          <FormField id="qd-note" label={decision === "reject" ? t("quotations.customerSReason") : t("quotations.customerSComment")} hint={decision === "reject" ? t("quotations.recommended") : undefined}><Textarea id="qd-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.back")}</Button><Button type="submit" variant={decision === "reject" ? "danger" : "primary"} loading={run.isPending} disabled={source.trim().length < 3}>{t("quotations.recordWord", { word })}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
