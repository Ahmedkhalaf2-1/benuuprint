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
import { formatDate, formatDateTime, formatMoney, humanizeCode } from "@/lib/utils/format";
import * as api from "./api";
import { FileDownloadButton } from "./files";
import { formatBytes } from "./format";
import { useFiles, useJourneyInvalidation, usePayments, useProduction, useQuotations } from "./hooks";
import { CHANGE_CATEGORIES, PAYMENT_METHODS, type ChangeCategory, type CommercialKind, type PaymentSummaryStatus, type PortalFile, type PortalPayment, type PortalProduction, type QuotationVersion, type SampleDetail } from "./types";

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
  const done = useJourneyInvalidation(kind);
  const [dlg, setDlg] = useState<"accept" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err | null>(null);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); setError(null); try { await fn(); toast.success(ok); setDlg(null); done(sampleId); } catch (e) { setError(errOf(e)); done(sampleId); } finally { setBusy(false); } };
  const money = (x: string) => formatMoney(x, v.currency);
  return (
    <Card data-testid="quotation-version" data-current={current} data-actionable={v.actionable} data-status={v.status} className={cn(!current && "opacity-80")}>
      <CardHeader><CardTitle>{current ? "Current quotation" : "Previous quotation"} · {number} <span className="font-normal text-muted-foreground">version {v.versionNumber}</span></CardTitle><span className="text-xs font-medium">{humanizeCode(v.status)}</span></CardHeader>
      <CardContent className="space-y-4">
        <div className="relative overflow-x-auto"><table className="w-full min-w-[28rem] text-sm"><caption className="sr-only">Quotation lines</caption>
          <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1.5 text-start font-medium">Item</th><th scope="col" className="text-end font-medium">Qty</th><th scope="col" className="text-end font-medium">Unit price</th><th scope="col" className="text-end font-medium">Amount</th></tr></thead>
          <tbody>{v.lineItems.map((l, i) => <tr key={i} className="border-t"><td className="py-1.5">{l.description}</td><td className="text-end tabular-nums">{l.quantity}</td><td className="text-end tabular-nums">{money(l.unitPrice)}</td><td className="text-end tabular-nums">{money(l.amount)}</td></tr>)}</tbody></table></div>
        <dl className="ms-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{money(v.subtotal)}</dd></div>
          {Number(v.discount) ? <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="tabular-nums">−{money(v.discount)}</dd></div> : null}
          {Number(v.tax) ? <div className="flex justify-between"><dt className="text-muted-foreground">Tax ({Number(v.taxPercent)}%)</dt><dd className="tabular-nums">{money(v.tax)}</dd></div> : null}
          <div className="flex justify-between border-t pt-1 font-semibold"><dt>Total</dt><dd className="tabular-nums" data-testid="quotation-total">{money(v.total)}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">{v.validUntil ? `Valid until ${formatDate(v.validUntil)}` : "No expiry date"}{v.sentAt ? ` · sent ${formatDate(v.sentAt)}` : ""}{v.acceptedAt ? ` · accepted ${formatDateTime(v.acceptedAt)}` : ""}{v.rejectedAt ? ` · declined ${formatDateTime(v.rejectedAt)}` : ""}{v.supersededAt ? ` · replaced by a newer version` : ""}</p>
        {v.notes ? <p className="rounded-md bg-surface-muted px-3 py-2 text-sm">{v.notes}</p> : null}
        {error ? <FormError {...error} /> : null}
        {v.actionable && (canDecide.accept || canDecide.reject) ? (
          <div className="flex flex-wrap gap-2">
            {canDecide.accept ? <Button size="lg" onClick={() => { setError(null); setDlg("accept"); }}>Accept quotation</Button> : null}
            {canDecide.reject ? <Button size="lg" variant="secondary" onClick={() => { setError(null); setDlg("reject"); }}>Reject quotation</Button> : null}
          </div>
        ) : null}
      </CardContent>
      <ConfirmDialog open={dlg === "accept"} onOpenChange={(o) => !o && !busy && setDlg(null)} title="Accept this quotation?" description={`You agree to ${money(v.total)} for this sample. Next, you will be asked to pay.`} confirmLabel="Accept quotation" loading={busy} onConfirm={() => void run(() => api.acceptQuotation(v.id, kind), "Quotation accepted")} />
      <Dialog open={dlg === "reject"} onOpenChange={(o) => !o && !busy && setDlg(null)}>
        <DialogContent title="Reject this quotation?" description="Tell us why if you like — we may send you a new quotation.">
          <div className="space-y-3">
            {error ? <FormError {...error} /> : null}
            <FormField id="rq-reason" label="Reason (optional)"><Textarea id="rq-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDlg(null)}>Back</Button><Button variant="danger" loading={busy} onClick={() => void run(() => api.rejectQuotation(v.id, reason.trim() || undefined, kind), "Quotation rejected")}>Reject quotation</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function QuotationTab({ sample, kind = "sample" }: { sample: JourneyTarget; kind?: CommercialKind }) {
  const q = useQuotations(sample.id, kind);
  if (q.isLoading) return <p className="text-sm text-muted-foreground" role="status">Loading…</p>;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" />;
  const d = q.data;
  if (!d || d.quotations.length === 0) return <p className="text-sm text-muted-foreground" data-testid="no-quotation">Your quotation is being prepared. We will let you know when it is ready.</p>;
  // Newest version first; only the open offer is actionable (the backend decides which: `actionable` / `actionableVersionId`).
  const versions = d.quotations.flatMap((qt) => qt.versions.map((v) => ({ v, qt }))).sort((a, b) => b.v.versionNumber - a.v.versionNumber);
  const currentId = versions.find((x) => x.v.isCurrent)?.v.id;
  return (
    <div className="space-y-4">
      {d.requiresReview ? <p role="status" data-testid="re-review" className="rounded-lg border-s-4 border-brand bg-surface px-4 py-3 text-sm font-medium">{d.notice || (kind === "order" ? "Your order changed and a new quotation requires your review." : "A new quotation is ready for your review.")} <span className="font-normal text-muted-foreground">Any earlier acceptance{kind === "order" ? " or payment decision" : ""} no longer applies to it.</span></p> : null}
      {versions.map(({ v, qt }) => <QuotationCard key={v.id} v={v} kind={kind} number={qt.quotationNumber} sampleId={sample.id} current={v.id === currentId} canDecide={{ accept: can(sample, "ACCEPT_QUOTATION") && v.id === d.actionableVersionId, reject: can(sample, "REJECT_QUOTATION") && v.id === d.actionableVersionId }} />)}
    </div>
  );
}

/* --------------------------------- payment -------------------------------- */
export const PAYMENT_STATUS_LABEL: Record<PaymentSummaryStatus, string> = { NOT_REQUIRED_YET: "No payment needed yet", PAYMENT_REQUIRED: "Payment required", PAYMENT_UNDER_REVIEW: "Payment under review", PAID: "Payment verified" };
export const PAYMENT_ENTRY_LABEL: Record<PortalPayment["status"], string> = { PENDING_VERIFICATION: "Under review", VERIFIED: "Verified", REJECTED: "Could not be verified", CANCELLED: "Cancelled" };
const METHOD_LABELS: Record<string, string> = { INSTAPAY: "InstaPay", VODAFONE_CASH: "Vodafone Cash", TELDA: "Telda", BANK_TRANSFER: "Bank transfer", CASH: "Cash", OTHER: "Other" };

function ProofButton({ paymentId, name }: { paymentId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  return <Button size="sm" variant="secondary" loading={busy} aria-label={`View proof ${name}`} onClick={async () => { setBusy(true); try { const r = await customerApi.get<{ url: string }>(api.proofUrlPath(paymentId)); window.open(resolveDownloadUrl(r.url), "_blank", "noopener,noreferrer"); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } }}>View proof</Button>;
}

function ReplaceProof({ payment, sampleId, kind }: { payment: PortalPayment; sampleId: string; kind: CommercialKind }) {
  const done = useJourneyInvalidation(kind);
  const [busy, setBusy] = useState(false);
  return (
    <label className="inline-flex cursor-pointer items-center">
      <span className="sr-only">Replace proof for {payment.paymentNumber}</span>
      <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" className="sr-only" aria-label={`Replace proof for ${payment.paymentNumber}`} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { await api.replaceProof(payment.id, f); toast.success("Proof replaced"); done(sampleId); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); e.target.value = ""; } }} />
      <span className="rounded-md border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">{busy ? "Uploading…" : "Replace proof"}</span>
    </label>
  );
}

function ProofForm({ sample, remaining, currency, kind }: { sample: JourneyTarget; remaining: string | null; currency: string | null; kind: CommercialKind }) {
  const done = useJourneyInvalidation(kind);
  const [f, setF] = useState({ amount: remaining && Number(remaining) > 0 ? remaining : "", method: "BANK_TRANSFER", reference: "", receivedAt: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <form className="space-y-4" noValidate aria-label="Upload payment proof" onSubmit={async (e) => {
      e.preventDefault(); setError(null);
      const amount = Number(f.amount);
      if (!(amount > 0)) return setError({ message: "Enter the amount you paid." });
      if (remaining !== null && amount > Number(remaining)) return setError({ message: `The amount cannot be more than what is still due (${formatMoney(remaining, currency ?? "")}).` });
      if (!file) return setError({ message: "Choose a photo or PDF of your payment receipt." });
      setBusy(true);
      try { await api.submitPayment(sample.id, { file, amount, method: f.method, ...(f.reference.trim() ? { transactionReference: f.reference.trim() } : {}), ...(f.receivedAt ? { receivedAt: new Date(f.receivedAt).toISOString() } : {}) }, kind); toast.success("Payment proof sent"); setFile(null); setF({ ...f, amount: "", reference: "" }); done(sample.id); } catch (err) { setError(errOf(err)); } finally { setBusy(false); }
    }}>
      {error ? <FormError {...error} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="pp-amount" label={`Amount paid${currency ? ` (${currency})` : ""}`} required><Input id="pp-amount" inputMode="decimal" value={f.amount} onChange={(e) => set({ amount: e.target.value })} /></FormField>
        <FormField id="pp-method" label="How did you pay?" required><Select id="pp-method" value={f.method} onValueChange={(v) => set({ method: v })} options={PAYMENT_METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m]! }))} /></FormField>
        <FormField id="pp-ref" label="Transaction reference (optional)"><Input id="pp-ref" value={f.reference} onChange={(e) => set({ reference: e.target.value })} /></FormField>
        <FormField id="pp-date" label="Date paid (optional)"><Input id="pp-date" type="date" value={f.receivedAt} onChange={(e) => set({ receivedAt: e.target.value })} /></FormField>
      </div>
      <div className="space-y-1.5"><Label htmlFor="pp-file">Payment receipt <span aria-hidden className="text-danger">*</span></Label><Input id="pp-file" type="file" accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">PNG, JPEG, GIF, WebP or PDF. Stored privately; only you and Benuu Print can open it.</p></div>
      <Button type="submit" size="lg" loading={busy}>Send payment proof</Button>
    </form>
  );
}

export function PaymentTab({ sample, kind = "sample" }: { sample: JourneyTarget; kind?: CommercialKind }) {
  const q = usePayments(sample.id, kind);
  if (q.isLoading) return <p className="text-sm text-muted-foreground" role="status">Loading…</p>;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" />;
  if (!q.data) return null;
  const { summary: s, payments } = q.data;
  const cur = s.currency ?? "";
  const money = (x: string | null) => (x === null ? "—" : cur ? formatMoney(x, cur) : x);
  return (
    <div className="space-y-4">
      <Card data-testid="payment-summary" data-status={s.status}>
        <CardHeader><CardTitle>Payment</CardTitle><span className="text-sm font-medium" data-testid="payment-status">{PAYMENT_STATUS_LABEL[s.status] ?? humanizeCode(s.status)}</span></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            {([["Required", s.requiredAmount], ["Verified", s.verifiedAmount], ["Waiting for review", s.pendingAmount], ["Still to pay", s.remainingAmount]] as const).map(([l, v]) => <div key={l} className="rounded-md border p-3"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{money(v)}</dd></div>)}
          </dl>
          {s.currency ? <p className="mt-2 text-xs text-muted-foreground">All amounts are in {s.currency}.</p> : null}
        </CardContent>
      </Card>
      {can(sample, "UPLOAD_PAYMENT_PROOF") ? <Card><CardHeader><CardTitle>Send your payment proof</CardTitle></CardHeader><CardContent><ProofForm sample={sample} kind={kind} remaining={s.remainingAmount} currency={s.currency} /></CardContent></Card> : null}
      <Card><CardHeader><CardTitle>Your payments</CardTitle></CardHeader><CardContent>
        {payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments sent yet.</p> : (
          <ul className="divide-y rounded-md border" data-testid="payments">{payments.map((p) => (
            <li key={p.id} data-status={p.status} className="space-y-1 px-3 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-mono text-xs font-semibold">{p.paymentNumber}</span><span className="font-semibold tabular-nums">{formatMoney(p.amount, p.currency)}</span><span className="text-muted-foreground">{METHOD_LABELS[p.method] ?? humanizeCode(p.method)}</span>
                <span className={cn("ms-auto font-medium", p.status === "VERIFIED" && "text-tone-success-fg", p.status === "REJECTED" && "text-tone-danger-fg")} data-testid="payment-entry-status">{PAYMENT_ENTRY_LABEL[p.status]}</span></p>
              <p className="text-xs text-muted-foreground">Sent {formatDateTime(p.submittedAt)}{p.verifiedAt ? ` · verified ${formatDateTime(p.verifiedAt)}` : ""}{p.transactionReference ? ` · ref ${p.transactionReference}` : ""}</p>
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
  return <ProgressRail steps={production.steps} label="Sample production progress" testId="production-tracker" phase={production.phase} compact={compact} />;
}

export function ProductionTab({ sample }: { sample: SampleDetail }) {
  const q = useProduction(sample.id);
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Sample production</CardTitle></CardHeader><CardContent className="space-y-4">
        {q.isLoading ? <p className="text-sm text-muted-foreground" role="status">Loading…</p> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-4" /> : q.data ? (q.data.phase === "NOT_STARTED" ? <p className="text-sm text-muted-foreground">Production has not started yet.</p> : <ProductionTracker production={q.data} />) : null}
        <p className="rounded-md bg-surface-muted px-3 py-2 text-sm"><span className="font-medium">Next step: </span>{sample.nextStep}</p>
      </CardContent></Card>
      <ApprovalCard sample={sample} />
    </div>
  );
}

/* --------------------------- approval / request changes --------------------------- */
const CATEGORY_LABELS: Record<ChangeCategory, string> = { FIT: "Fit", FABRIC: "Fabric", COLOUR: "Colour", ARTWORK: "Artwork", DECORATION: "Decoration", CONSTRUCTION: "Construction", OTHER: "Something else" };

export function ApprovalCard({ sample }: { sample: SampleDetail }) {
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
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); setError(null); try { await fn(); toast.success(ok); setDlg(null); done(sample.id); } catch (e) { setError(errOf(e)); done(sample.id); } finally { setBusy(false); } };
  return (
    <Card data-testid="approval-card" className="border-brand/40">
      <CardHeader><CardTitle>Your sample is ready for review</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Production is complete. Look at the photos and files we shared, then approve the sample or tell us what to change.</p>
        {shared.length ? <ul className="divide-y rounded-md border" data-testid="review-files">{shared.map((f) => <li key={f.attachmentId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate font-medium">{f.originalName}</span><span className="text-xs text-muted-foreground">{formatBytes(f.sizeBytes)}</span><FileDownloadButton sampleId={sample.id} attachmentId={f.attachmentId} name={f.originalName} /></li>)}</ul> : null}
        {error ? <FormError {...error} /> : null}
        <div className="flex flex-wrap gap-2">
          {approve ? <Button size="lg" onClick={() => { setError(null); setDlg("approve"); }}>Approve sample</Button> : null}
          {changes ? <Button size="lg" variant="secondary" onClick={() => { setError(null); setDlg("changes"); }}>Request changes</Button> : null}
        </div>
      </CardContent>
      <Dialog open={dlg === "approve"} onOpenChange={(o) => !o && !busy && setDlg(null)}>
        <DialogContent title="Approve this sample?" description="Approve this sample as the reference for future bulk production? This cannot be undone.">
          <div className="space-y-3">
            {error ? <FormError {...error} /> : null}
            <FormField id="ap-note" label="Comment (optional)"><Textarea id="ap-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDlg(null)}>Back</Button><Button loading={busy} onClick={() => void run(() => api.approveSample(sample.id, note.trim() || undefined), "Sample approved")}>Approve sample</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={dlg === "changes"} onOpenChange={(o) => !o && !busy && setDlg(null)}>
        <DialogContent title="What would you like changed?" description="Tell us what is not right. Our team will review your note and build the sample again.">
          <div className="space-y-3">
            {error ? <FormError {...error} /> : null}
            <fieldset className="space-y-2"><legend className="text-[0.8125rem] font-medium">What is it about? (optional)</legend>
              <div className="grid grid-cols-2 gap-2">{CHANGE_CATEGORIES.map((c) => <div key={c} className="flex items-center gap-2"><Checkbox id={`cat-${c}`} checked={cats.includes(c)} onCheckedChange={(on) => setCats((x) => (on === true ? [...x, c] : x.filter((y) => y !== c)))} /><Label htmlFor={`cat-${c}`} className="font-normal">{CATEGORY_LABELS[c]}</Label></div>)}</div></fieldset>
            <FormField id="rc-reason" label="What would you like changed?" required hint="At least 3 characters."><Textarea id="rc-reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDlg(null)}>Back</Button><Button loading={busy} disabled={reason.trim().length < 3} onClick={() => void run(() => api.requestChanges(sample.id, { reason: reason.trim(), ...(cats.length ? { categories: cats } : {}) }), "Changes requested")}>Send change request</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------------------------- files ---------------------------------- */
function FileList({ sampleId, files, title, testId }: { sampleId: string; files: PortalFile[]; title: string; testId: string }) {
  return (
    <div className="space-y-2"><h3 className="text-sm font-semibold">{title}</h3>{files.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : <ul className="divide-y rounded-md border" data-testid={testId}>{files.map((f) => <li key={f.attachmentId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"><span className="min-w-0 flex-1 truncate font-medium">{f.originalName}</span><span className="text-xs text-muted-foreground">{humanizeCode(f.type)} · {formatBytes(f.sizeBytes)} · {formatDate(f.uploadedAt)}</span><FileDownloadButton sampleId={sampleId} attachmentId={f.attachmentId} name={f.originalName} /></li>)}</ul>}</div>
  );
}

export function JourneyFiles({ sample }: { sample: SampleDetail }): ReactNode {
  const q = useFiles(sample.id);
  const rows = q.data ?? sample.files;
  const mine = rows.filter((f) => f.source !== "BENUE_PRINT");
  const shared = rows.filter((f) => f.source === "BENUE_PRINT");
  return <Card><CardHeader><CardTitle>Files</CardTitle></CardHeader><CardContent className="space-y-5">{shared.length ? <FileList sampleId={sample.id} files={shared} title="Provided by Benuu Print" testId="files-staff" /> : null}<FileList sampleId={sample.id} files={mine} title="Uploaded by you" testId="files" /></CardContent></Card>;
}
