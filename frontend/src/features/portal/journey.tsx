"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { customerApi } from "@/lib/customer/client";
import { resolveDownloadUrl } from "@/lib/api/assets";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { ProgressRail } from "@/components/data-display/progress-rail";
import { cn } from "@/lib/utils/cn";

import * as api from "./api";
import { FileDownloadButton } from "./files";
import { formatBytes } from "./format";
import { useFiles, useJourneyInvalidation, usePayments, useProduction, useQuotations } from "./hooks";
import { CHANGE_CATEGORIES, PAYMENT_METHODS, type ChangeCategory, type CommercialKind, type PaymentSummaryStatus, type PortalFile, type PortalPayment, type PortalProduction, type QuotationVersion, type SampleDetail } from "./types";
import { useI18n } from "@/i18n/provider";
import { localizedMap } from "@/i18n/active";

type Err = { message: string; requestId?: string };
const errOf = (e: unknown): Err => ({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined });
/** Only what the backend lists in `allowedActions` is offered (no local state machine). */
export const can = (s: { allowedActions?: readonly string[] }, a: string) => !!s.allowedActions?.includes(a);
/** The commercial UI serves both samples and orders; only the id, allowedActions and the endpoint family differ. */
export type JourneyTarget = { id: string; allowedActions?: readonly string[] };

/* ------------------------------ next action ------------------------------ */
export type PortalTab = "overview" | "specification" | "quotation" | "payment" | "production" | "files" | "activity";
export interface NextAction { label: string; kind: "tab" | "edit"; tab?: PortalTab }
/** The one primary call to action, from the backend's allowedActions (priority: the journey goes quotation → payment → approval). */
export function primaryAction(s: Pick<SampleDetail, "allowedActions">): NextAction | null {
  if (can(s, "ACCEPT_QUOTATION") || can(s, "REJECT_QUOTATION")) return { label: "Review quotation", kind: "tab", tab: "quotation" };
  if (can(s, "UPLOAD_PAYMENT_PROOF")) return { label: "Upload payment proof", kind: "tab", tab: "payment" };
  if (can(s, "APPROVE_SAMPLE") || can(s, "REQUEST_CHANGES")) return { label: "Review sample", kind: "tab", tab: "production" };
  if (can(s, "SUBMIT_REQUEST") || can(s, "EDIT_REQUEST")) return { label: "Continue editing", kind: "edit" };
  return null;
}

/* -------------------------------- quotation ------------------------------- */
function QuotationCard({ v, number, current, canDecide, sampleId, kind }: { v: QuotationVersion; number: string; current: boolean; canDecide: { accept: boolean; reject: boolean }; sampleId: string; kind: CommercialKind }) {
  const { t, fmt } = useI18n();
  const done = useJourneyInvalidation(kind);
  const [dlg, setDlg] = useState<"accept" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err | null>(null);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); setError(null); try { await fn(); toast.success(t.text(ok)); setDlg(null); done(sampleId); } catch (e) { setError(errOf(e)); done(sampleId); } finally { setBusy(false); } };
  const money = (x: string) => fmt.money(x, v.currency);
  return (
    <Card data-testid="quotation-version" data-current={current} data-actionable={v.actionable} data-status={v.status} className={cn(!current && "opacity-80")}>
      <CardHeader><CardTitle>{current ? t("customer.currentQuotation") : t("customer.previousQuotation")} · {number} <span className="font-normal text-muted-foreground">{t("customer.versionVersionnumber", { versionNumber: v.versionNumber })}</span></CardTitle><span className="text-xs font-medium">{fmt.code(v.status)}</span></CardHeader>
      <CardContent className="space-y-4">
        <div className="relative overflow-x-auto"><table className="w-full min-w-[28rem] text-sm"><caption className="sr-only">{t("customer.quotationLines")}</caption>
          <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1.5 text-start font-medium">{t("customer.item")}</th><th scope="col" className="text-end font-medium">{t("customer.qty")}</th><th scope="col" className="text-end font-medium">{t("customer.unitPrice")}</th><th scope="col" className="text-end font-medium">{t("customer.amount")}</th></tr></thead>
          <tbody>{v.lineItems.map((l, i) => <tr key={i} className="border-t"><td className="py-1.5">{l.description}</td><td className="text-end tabular-nums">{l.quantity}</td><td className="text-end tabular-nums">{money(l.unitPrice)}</td><td className="text-end tabular-nums">{money(l.amount)}</td></tr>)}</tbody></table></div>
        <dl className="ms-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">{t("customer.subtotal")}</dt><dd className="tabular-nums">{money(v.subtotal)}</dd></div>
          {Number(v.discount) ? <div className="flex justify-between"><dt className="text-muted-foreground">{t("customer.discount")}</dt><dd className="tabular-nums">−{money(v.discount)}</dd></div> : null}
          {Number(v.tax) ? <div className="flex justify-between"><dt className="text-muted-foreground">{t("customer.taxTaxpercent", { taxPercent: Number(v.taxPercent) })}</dt><dd className="tabular-nums">{money(v.tax)}</dd></div> : null}
          <div className="flex justify-between border-t pt-1 font-semibold"><dt>{t("customer.total")}</dt><dd className="tabular-nums" data-testid="quotation-total">{money(v.total)}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">{v.validUntil ? t("customer.validUntilValiduntil", { validUntil: fmt.date(v.validUntil) }) : t("customer.noExpiryDate")}{v.sentAt ? t("customer.sentSentat", { sentAt: fmt.date(v.sentAt) }) : ""}{v.acceptedAt ? t("customer.acceptedAcceptedat", { acceptedAt: fmt.dateTime(v.acceptedAt) }) : ""}{v.rejectedAt ? t("customer.declinedRejectedat", { rejectedAt: fmt.dateTime(v.rejectedAt) }) : ""}{v.supersededAt ? t("customer.replacedByANewerVersion") : ""}</p>
        {v.notes ? <p className="rounded-md bg-surface-muted px-3 py-2 text-sm">{v.notes}</p> : null}
        {error ? <FormError {...error} /> : null}
        {v.actionable && (canDecide.accept || canDecide.reject) ? (
          <div className="flex flex-wrap gap-2">
            {canDecide.accept ? <Button size="lg" onClick={() => { setError(null); setDlg("accept"); }}>{t("customer.acceptQuotation")}</Button> : null}
            {canDecide.reject ? <Button size="lg" variant="secondary" onClick={() => { setError(null); setDlg("reject"); }}>{t("customer.rejectQuotation")}</Button> : null}
          </div>
        ) : null}
      </CardContent>
      <ConfirmDialog open={dlg === "accept"} onOpenChange={(o) => !o && !busy && setDlg(null)} title={t("customer.acceptThisQuotation")} description={t("customer.youAgreeToTotalForThis", { total: money(v.total) })} confirmLabel={t("customer.acceptQuotation")} loading={busy} onConfirm={() => void run(() => api.acceptQuotation(v.id, kind), "Quotation accepted")} />
      <Dialog open={dlg === "reject"} onOpenChange={(o) => !o && !busy && setDlg(null)}>
        <DialogContent title={t("customer.rejectThisQuotation")} description={t("customer.tellUsWhyIfYouLike")}>
          <div className="space-y-3">
            {error ? <FormError {...error} /> : null}
            <FormField id="rq-reason" label={t("customer.reasonOptional")}><Textarea id="rq-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDlg(null)}>{t("common.back")}</Button><Button variant="danger" loading={busy} onClick={() => void run(() => api.rejectQuotation(v.id, reason.trim() || undefined, kind), "Quotation rejected")}>{t("customer.rejectQuotation")}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function QuotationTab({ sample, kind = "sample" }: { sample: JourneyTarget; kind?: CommercialKind }) {
  const { t } = useI18n();
  const q = useQuotations(sample.id, kind);
  if (q.isLoading) return <p className="text-sm text-muted-foreground" role="status">{t("common.loading")}</p>;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" />;
  const d = q.data;
  if (!d || d.quotations.length === 0) return <p className="text-sm text-muted-foreground" data-testid="no-quotation">{t("customer.yourQuotationIsBeingPreparedWe")}</p>;
  // Newest version first; only the open offer is actionable (the backend decides which: `actionable` / `actionableVersionId`).
  const versions = d.quotations.flatMap((qt) => qt.versions.map((v) => ({ v, qt }))).sort((a, b) => b.v.versionNumber - a.v.versionNumber);
  const currentId = versions.find((x) => x.v.isCurrent)?.v.id;
  return (
    <div className="space-y-4">
      {d.requiresReview ? <p role="status" data-testid="re-review" className="rounded-lg border-s-4 border-brand bg-surface px-4 py-3 text-sm font-medium">{d.notice || (kind === "order" ? t("customer.yourOrderChangedAndANew") : t("customer.aNewQuotationIsReadyFor"))} <span className="font-normal text-muted-foreground">{t("customer.anyEarlierAcceptance")}{kind === "order" ? t("customer.orPaymentDecision") : ""}{" "}{t("customer.noLongerAppliesToIt")}</span></p> : null}
      {versions.map(({ v, qt }) => <QuotationCard key={v.id} v={v} kind={kind} number={qt.quotationNumber} sampleId={sample.id} current={v.id === currentId} canDecide={{ accept: can(sample, "ACCEPT_QUOTATION") && v.id === d.actionableVersionId, reject: can(sample, "REJECT_QUOTATION") && v.id === d.actionableVersionId }} />)}
    </div>
  );
}

/* --------------------------------- payment -------------------------------- */
export const PAYMENT_STATUS_LABEL: Record<PaymentSummaryStatus, string> = localizedMap({ NOT_REQUIRED_YET: "No payment needed yet", PAYMENT_REQUIRED: "Payment required", PAYMENT_UNDER_REVIEW: "Payment under review", PAID: "Payment verified" });
export const PAYMENT_ENTRY_LABEL: Record<PortalPayment["status"], string> = localizedMap({ PENDING_VERIFICATION: "Under review", VERIFIED: "Verified", REJECTED: "Could not be verified", CANCELLED: "Cancelled" });
const METHOD_LABELS: Record<string, string> = localizedMap({ INSTAPAY: "InstaPay", VODAFONE_CASH: "Vodafone Cash", TELDA: "Telda", BANK_TRANSFER: "Bank transfer", CASH: "Cash", OTHER: "Other" });

function ProofButton({ paymentId, name }: { paymentId: string; name: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return <Button size="sm" variant="secondary" loading={busy} aria-label={t("customer.viewProofName", { name })} onClick={async () => { setBusy(true); try { const r = await customerApi.get<{ url: string }>(api.proofUrlPath(paymentId)); window.open(resolveDownloadUrl(r.url), "_blank", "noopener,noreferrer"); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } }}>{t("customer.viewProof")}</Button>;
}

function ReplaceProof({ payment, sampleId, kind }: { payment: PortalPayment; sampleId: string; kind: CommercialKind }) {
  const { t } = useI18n();
  const done = useJourneyInvalidation(kind);
  const [busy, setBusy] = useState(false);
  return (
    <label className="inline-flex cursor-pointer items-center">
      <span className="sr-only">{t("customer.replaceProofForPaymentnumber", { paymentNumber: payment.paymentNumber })}</span>
      <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" className="sr-only" aria-label={t("customer.replaceProofForPaymentnumber", { paymentNumber: payment.paymentNumber })} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { await api.replaceProof(payment.id, f); toast.success(t("customer.proofReplaced")); done(sampleId); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); e.target.value = ""; } }} />
      <span className="rounded-md border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">{busy ? t("customer.uploading") : t("customer.replaceProof")}</span>
    </label>
  );
}

function ProofForm({ sample, remaining, currency, kind }: { sample: JourneyTarget; remaining: string | null; currency: string | null; kind: CommercialKind }) {
  const { t, fmt } = useI18n();
  const done = useJourneyInvalidation(kind);
  const [f, setF] = useState({ amount: remaining && Number(remaining) > 0 ? remaining : "", method: "BANK_TRANSFER", reference: "", receivedAt: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <form className="space-y-4" noValidate aria-label={t("customer.uploadPaymentProof")} onSubmit={async (e) => {
      e.preventDefault(); setError(null);
      const amount = Number(f.amount);
      if (!(amount > 0)) return setError({ message: t("customer.enterTheAmountYouPaid") });
      if (remaining !== null && amount > Number(remaining)) return setError({ message: t("customer.theAmountCannotBeMoreThan", { remaining: fmt.money(remaining, currency ?? "") }) });
      if (!file) return setError({ message: t("customer.chooseAPhotoOrPdfOf") });
      setBusy(true);
      try { await api.submitPayment(sample.id, { file, amount, method: f.method, ...(f.reference.trim() ? { transactionReference: f.reference.trim() } : {}), ...(f.receivedAt ? { receivedAt: new Date(f.receivedAt).toISOString() } : {}) }, kind); toast.success(t("customer.paymentProofSent")); setFile(null); setF({ ...f, amount: "", reference: "" }); done(sample.id); } catch (err) { setError(errOf(err)); } finally { setBusy(false); }
    }}>
      {error ? <FormError {...error} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="pp-amount" label={t("customer.amountPaidV1", { v1: currency ? ` (${currency})` : "" })} required><Input id="pp-amount" inputMode="decimal" value={f.amount} onChange={(e) => set({ amount: e.target.value })} /></FormField>
        <FormField id="pp-method" label={t("customer.howDidYouPay")} required><Select id="pp-method" value={f.method} onValueChange={(v) => set({ method: v })} options={PAYMENT_METHODS.map((m) => ({ value: m, label: t.text(METHOD_LABELS[m]!) }))} /></FormField>
        <FormField id="pp-ref" label={t("customer.transactionReferenceOptional")}><Input id="pp-ref" value={f.reference} onChange={(e) => set({ reference: e.target.value })} /></FormField>
        <FormField id="pp-date" label={t("customer.datePaidOptional")}><Input id="pp-date" type="date" value={f.receivedAt} onChange={(e) => set({ receivedAt: e.target.value })} /></FormField>
      </div>
      <div className="space-y-1.5"><Label htmlFor="pp-file">{t("customer.paymentReceipt")}{" "}<span aria-hidden className="text-danger">*</span></Label><Input id="pp-file" type="file" accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">{t("customer.pngJpegGifWebpOrPdf")}</p></div>
      <Button type="submit" size="lg" loading={busy}>{t("customer.sendPaymentProof")}</Button>
    </form>
  );
}

export function PaymentTab({ sample, kind = "sample" }: { sample: JourneyTarget; kind?: CommercialKind }) {
  const { t, fmt } = useI18n();
  const q = usePayments(sample.id, kind);
  if (q.isLoading) return <p className="text-sm text-muted-foreground" role="status">{t("common.loading")}</p>;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" />;
  if (!q.data) return null;
  const { summary: s, payments } = q.data;
  const cur = s.currency ?? "";
  const money = (x: string | null) => (x === null ? "—" : cur ? fmt.money(x, cur) : x);
  return (
    <div className="space-y-4">
      <Card data-testid="payment-summary" data-status={s.status}>
        <CardHeader><CardTitle>{t("common.payment")}</CardTitle><span className="text-sm font-medium" data-testid="payment-status">{PAYMENT_STATUS_LABEL[s.status] ? t.text(PAYMENT_STATUS_LABEL[s.status]) : fmt.code(s.status)}</span></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            {([["Required", s.requiredAmount], [t.text("Verified"), s.verifiedAmount], [t.text("Waiting for review"), s.pendingAmount], [t.text("Still to pay"), s.remainingAmount]] as const).map(([l, v]) => <div key={l} className="rounded-md border p-3"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{money(v)}</dd></div>)}
          </dl>
          {s.currency ? <p className="mt-2 text-xs text-muted-foreground">{t("customer.allAmountsAreInCurrency", { currency: s.currency })}</p> : null}
        </CardContent>
      </Card>
      {can(sample, "UPLOAD_PAYMENT_PROOF") ? <Card><CardHeader><CardTitle>{t("customer.sendYourPaymentProof")}</CardTitle></CardHeader><CardContent><ProofForm sample={sample} kind={kind} remaining={s.remainingAmount} currency={s.currency} /></CardContent></Card> : null}
      <Card><CardHeader><CardTitle>{t("customer.yourPayments")}</CardTitle></CardHeader><CardContent>
        {payments.length === 0 ? <p className="text-sm text-muted-foreground">{t("customer.noPaymentsSentYet")}</p> : (
          <ul className="divide-y rounded-md border" data-testid="payments">{payments.map((p) => (
            <li key={p.id} data-status={p.status} className="space-y-1 px-3 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-mono text-xs font-semibold">{p.paymentNumber}</span><span className="font-semibold tabular-nums">{fmt.money(p.amount, p.currency)}</span><span className="text-muted-foreground">{METHOD_LABELS[p.method] ?? fmt.code(p.method)}</span>
                <span className={cn("ms-auto font-medium", p.status === "VERIFIED" && "text-tone-success-fg", p.status === "REJECTED" && "text-tone-danger-fg")} data-testid="payment-entry-status">{PAYMENT_ENTRY_LABEL[p.status]}</span></p>
              <p className="text-xs text-muted-foreground">{t("customer.sentSubmittedat", { submittedAt: fmt.dateTime(p.submittedAt) })}{p.verifiedAt ? t("customer.verifiedVerifiedat", { verifiedAt: fmt.dateTime(p.verifiedAt) }) : ""}{p.transactionReference ? t("customer.refTransactionreference", { transactionReference: p.transactionReference }) : ""}</p>
              {p.message ? <p role="note" data-testid="payment-message" className="rounded-md bg-tone-warning-bg px-3 py-2 text-tone-warning-fg">{p.message}</p> : null}
              <div className="flex flex-wrap gap-2 pt-1">{p.hasProof ? <ProofButton paymentId={p.id} name={p.proofFileName ?? p.paymentNumber} /> : null}{p.canReplaceProof ? <ReplaceProof payment={p} sampleId={sample.id} kind={kind} /> : null}</div>
            </li>))}</ul>
        )}
      </CardContent></Card>
    </div>
  );
}

/* -------------------------------- production ------------------------------- */
/** The six coarse steps exactly as the backend returns them (no stage names, staff, checklists or quantities exist in this payload). */
export function ProductionTracker({ production, compact }: { production: PortalProduction; compact?: boolean }) {
  const { t } = useI18n();
  return <ProgressRail steps={production.steps} label={t("customer.sampleProductionProgress")} testId="production-tracker" phase={production.phase} compact={compact} />;
}

export function ProductionTab({ sample }: { sample: SampleDetail }) {
  const { t } = useI18n();
  const q = useProduction(sample.id);
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>{t("customer.sampleProduction")}</CardTitle></CardHeader><CardContent className="space-y-4">
        {q.isLoading ? <p className="text-sm text-muted-foreground" role="status">{t("common.loading")}</p> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-4" /> : q.data ? (q.data.phase === "NOT_STARTED" ? <p className="text-sm text-muted-foreground">{t("customer.productionHasNotStartedYet")}</p> : <ProductionTracker production={q.data} />) : null}
        <p className="rounded-md bg-surface-muted px-3 py-2 text-sm"><span className="font-medium">{t("customer.nextStep2")}{" "}</span>{t.text(sample.nextStep)}</p>
      </CardContent></Card>
      <ApprovalCard sample={sample} />
    </div>
  );
}

/* --------------------------- approval / request changes --------------------------- */
const CATEGORY_LABELS: Record<ChangeCategory, string> = localizedMap({ FIT: "Fit", FABRIC: "Fabric", COLOUR: "Colour", ARTWORK: "Artwork", DECORATION: "Decoration", CONSTRUCTION: "Construction", OTHER: "Something else" });

export function ApprovalCard({ sample }: { sample: SampleDetail }) {
  const { t } = useI18n();
  const done = useJourneyInvalidation();
  const files = useFiles(sample.id);
  const [dlg, setDlg] = useState<"approve" | "changes" | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [cats, setCats] = useState<ChangeCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err | null>(null);
  const approve = can(sample, "APPROVE_SAMPLE"), changes = can(sample, "REQUEST_CHANGES");
  if (!approve && !changes) return null;
  const shared = (files.data ?? []).filter((f) => f.source === "BENUE_PRINT");
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); setError(null); try { await fn(); toast.success(t.text(ok)); setDlg(null); done(sample.id); } catch (e) { setError(errOf(e)); done(sample.id); } finally { setBusy(false); } };
  return (
    <Card data-testid="approval-card" className="border-brand/40">
      <CardHeader><CardTitle>{t("customer.yourSampleIsReadyForReview")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("customer.productionIsCompleteLookAtThe")}</p>
        {shared.length ? <ul className="divide-y rounded-md border" data-testid="review-files">{shared.map((f) => <li key={f.attachmentId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate font-medium">{f.originalName}</span><span className="text-xs text-muted-foreground">{formatBytes(f.sizeBytes)}</span><FileDownloadButton sampleId={sample.id} attachmentId={f.attachmentId} name={f.originalName} /></li>)}</ul> : null}
        {error ? <FormError {...error} /> : null}
        <div className="flex flex-wrap gap-2">
          {approve ? <Button size="lg" onClick={() => { setError(null); setDlg("approve"); }}>{t("customer.approveSample")}</Button> : null}
          {changes ? <Button size="lg" variant="secondary" onClick={() => { setError(null); setDlg("changes"); }}>{t("customer.requestChanges")}</Button> : null}
        </div>
      </CardContent>
      <Dialog open={dlg === "approve"} onOpenChange={(o) => !o && !busy && setDlg(null)}>
        <DialogContent title={t("customer.approveThisSample")} description={t("customer.approveThisSampleAsTheReference")}>
          <div className="space-y-3">
            {error ? <FormError {...error} /> : null}
            <FormField id="ap-note" label={t("customer.commentOptional")}><Textarea id="ap-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDlg(null)}>{t("common.back")}</Button><Button loading={busy} onClick={() => void run(() => api.approveSample(sample.id, note.trim() || undefined), "Sample approved")}>{t("customer.approveSample")}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={dlg === "changes"} onOpenChange={(o) => !o && !busy && setDlg(null)}>
        <DialogContent title={t("customer.whatWouldYouLikeChanged")} description={t("customer.tellUsWhatIsNotRight")}>
          <div className="space-y-3">
            {error ? <FormError {...error} /> : null}
            <fieldset className="space-y-2"><legend className="text-[0.8125rem] font-medium">{t("customer.whatIsItAboutOptional")}</legend>
              <div className="grid grid-cols-2 gap-2">{CHANGE_CATEGORIES.map((c) => <div key={c} className="flex items-center gap-2"><Checkbox id={`cat-${c}`} checked={cats.includes(c)} onCheckedChange={(on) => setCats((x) => (on === true ? [...x, c] : x.filter((y) => y !== c)))} /><Label htmlFor={`cat-${c}`} className="font-normal">{CATEGORY_LABELS[c]}</Label></div>)}</div></fieldset>
            <FormField id="rc-reason" label={t("customer.whatWouldYouLikeChanged")} required hint={t("customer.atLeast3Characters")}><Textarea id="rc-reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDlg(null)}>{t("common.back")}</Button><Button loading={busy} disabled={reason.trim().length < 3} onClick={() => void run(() => api.requestChanges(sample.id, { reason: reason.trim(), ...(cats.length ? { categories: cats } : {}) }), "Changes requested")}>{t("customer.sendChangeRequest")}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------------------------- files ---------------------------------- */
function FileList({ sampleId, files, title, testId }: { sampleId: string; files: PortalFile[]; title: string; testId: string }) {
  const { t, fmt } = useI18n();
  return (
    <div className="space-y-2"><h3 className="text-sm font-semibold">{title}</h3>{files.length === 0 ? <p className="text-sm text-muted-foreground">{t("customer.none")}</p> : <ul className="divide-y rounded-md border" data-testid={testId}>{files.map((f) => <li key={f.attachmentId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"><span className="min-w-0 flex-1 truncate font-medium">{f.originalName}</span><span className="text-xs text-muted-foreground">{fmt.code(f.type)} · {formatBytes(f.sizeBytes)} · {fmt.date(f.uploadedAt)}</span><FileDownloadButton sampleId={sampleId} attachmentId={f.attachmentId} name={f.originalName} /></li>)}</ul>}</div>
  );
}

export function JourneyFiles({ sample }: { sample: SampleDetail }): ReactNode {
  const { t } = useI18n();
  const q = useFiles(sample.id);
  const rows = q.data ?? sample.files;
  const mine = rows.filter((f) => f.source !== "BENUE_PRINT");
  const shared = rows.filter((f) => f.source === "BENUE_PRINT");
  return <Card><CardHeader><CardTitle>{t("common.files")}</CardTitle></CardHeader><CardContent className="space-y-5">{shared.length ? <FileList sampleId={sample.id} files={shared} title={t("customer.providedByBenuuPrint")} testId="files-staff" /> : null}<FileList sampleId={sample.id} files={mine} title={t("customer.uploadedByYou")} testId="files" /></CardContent></Card>;
}
