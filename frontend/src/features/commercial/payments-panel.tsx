"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AssetDownloadButton, formatFileSize } from "@/components/data-display/asset-download-button";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, EmptyState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { FileUploader } from "@/features/samples/file-uploader";
import { errorMessage, isApiError } from "@/lib/api/errors";

import { isMoneyInput } from "@/lib/utils/money";
import * as api from "./api";
import { useCommercialInvalidation, usePayments } from "./hooks";
import { PAYMENT_METHODS, type CommercialTarget, type Payment } from "./types";
import { useI18n } from "@/i18n/provider";

const OPEN = ["SUBMITTED", "UNDER_REVIEW"];

export function PaymentsPanel({ target, currency, hasAcceptedQuotation }: { target: CommercialTarget; currency: string | null; hasAcceptedQuotation: boolean }) {
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const q = usePayments(target);
  const inv = useCommercialInvalidation(target);
  const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [cancelling, setCancelling] = useState<Payment | null>(null);
  const act = useMutation({ mutationFn: ({ p, action }: { p: Payment; action: "review" | "verify" | "cancel" }) => api.paymentAction(p.id, action), onSuccess: () => inv.all() });
  const canVerify = can("payments.verify");
  const canManage = can("payments.manage");

  const run = (p: Payment, action: "review" | "verify" | "cancel", done: string) =>
    act.mutate({ p, action }, { onSuccess: () => toast.success(t.text(done)), onError: (e) => toast.error(errorMessage(e)) });

  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title={t("payments.paymentsAreNotAvailableToYour")} description={t("payments.paymentDetailsAreRestricted")} className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const payments = q.data ?? [];

  return (
    <Card aria-labelledby="pay-title">
      <CardHeader>
        <CardTitle><span id="pay-title">{t("common.payments")}</span></CardTitle>
        {canManage ? <Button size="sm" variant="secondary" disabled={!hasAcceptedQuotation} title={hasAcceptedQuotation ? undefined : t("payments.aPaymentNeedsAnAcceptedQuotation")} onClick={() => setAdding(true)}><Plus />{" "}{t("payments.addPayment")}</Button> : null}
      </CardHeader>
      {!hasAcceptedQuotation && canManage ? <p className="border-b px-4 py-2 text-xs text-muted-foreground">{t("payments.paymentsAreRecordedAgainstTheAccepted")}</p> : null}
      {payments.length === 0 ? <EmptyState title={t("payments.noPaymentsYet")} description={hasAcceptedQuotation ? t("payments.recordThePaymentsReceivedForThis") : undefined} className="py-8" /> : (
        <ul className="divide-y" data-testid="payments">
          {payments.map((p) => (
            <li key={p.id} data-status={p.status} className="space-y-1.5 px-4 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs font-semibold">{p.paymentNumber}</span>
                <StatusBadge status={p.status} />
                <span className="font-semibold tabular-nums">{fmt.money(p.amount, p.currency)}</span>
                <span className="text-muted-foreground">{fmt.code(p.method)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {p.transactionReference ? t("payments.refTransactionreference", { transactionReference: p.transactionReference }) : ""}{t("payments.submittedCreatedat", { createdAt: fmt.dateTime(p.createdAt) })}{p.receivedAt ? t("payments.receivedReceivedat", { receivedAt: fmt.dateTime(p.receivedAt) }) : ""}{p.verifiedAt ? t("payments.verifiedVerifiedat", { verifiedAt: fmt.dateTime(p.verifiedAt) }) : ""}
              </p>
              {p.rejectionReason ? <p className="text-xs text-tone-danger-fg">{t("payments.rejectedRejectionreason", { rejectionReason: p.rejectionReason })}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                {p.proof ? <><span className="text-xs">{t("payments.proofOriginalnameSizebytes", { originalName: p.proof.originalName, sizeBytes: formatFileSize(p.proof.sizeBytes) })}</span><AssetDownloadButton assetId={p.proof.assetId} fileName={p.proof.originalName} /></> : <span className="text-xs text-muted-foreground">{t("payments.noProofFile")}</span>}
                {canVerify && p.status === "SUBMITTED" ? <Button size="sm" variant="ghost" onClick={() => run(p, "review", "Payment under review")}>{t("payments.startReview")}</Button> : null}
                {canVerify && OPEN.includes(p.status) ? <><Button size="sm" onClick={() => run(p, "verify", "Payment verified")} loading={act.isPending && act.variables?.p.id === p.id && act.variables.action === "verify"}>{t("payments.verifyPayment")}</Button><Button size="sm" variant="secondary" onClick={() => setRejecting(p)}>{t("payments.rejectPayment")}</Button></> : null}
                {canManage && OPEN.includes(p.status) ? <Button size="sm" variant="ghost" onClick={() => setCancelling(p)}>{t("common.cancel")}</Button> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding ? <AddPaymentDialog target={target} currency={currency} onClose={() => setAdding(false)} /> : null}
      {rejecting ? <RejectDialog target={target} payment={rejecting} onClose={() => setRejecting(null)} /> : null}
      <ConfirmDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)} title={t("payments.cancelV1", { v1: cancelling?.paymentNumber ?? "payment" })} description={t("payments.thePaymentIsWithdrawnAndNot")} confirmLabel={t("payments.cancelPayment")} destructive loading={act.isPending}
        onConfirm={() => cancelling && act.mutate({ p: cancelling, action: "cancel" }, { onSuccess: () => { toast.success(t("payments.paymentCancelled")); setCancelling(null); }, onError: (e) => { toast.error(errorMessage(e)); setCancelling(null); } })} />
    </Card>
  );
}

function AddPaymentDialog({ target, currency, onClose }: { target: CommercialTarget; currency: string | null; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const inv = useCommercialInvalidation(target);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("");
  const [reference, setReference] = useState("");
  const [received, setReceived] = useState("");
  const [proof, setProof] = useState<{ id: string; name: string } | null>(null);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const amountOk = isMoneyInput(amount) && Number(amount) > 0;
  const create = useMutation({
    mutationFn: () => api.createPayment(target, { amount: Number(amount), method, ...(currency ? { currency } : {}), ...(reference.trim() ? { transactionReference: reference.trim() } : {}), ...(proof ? { proofAssetId: proof.id } : {}), ...(received ? { receivedAt: new Date(received).toISOString() } : {}) }),
    onSuccess: () => inv.all(),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent title={t("payments.addPayment")} description={t("payments.recordsMoneyReceivedItIsNot")} className="max-w-lg">
        <form noValidate className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setShow(true); setError(null); if (!amountOk || !method) return; try { await create.mutateAsync(); toast.success(t("payments.paymentRecordedAwaitingVerification")); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="p-amount" label={t("payments.amountV1", { v1: currency ? ` (${currency})` : "" })} required error={show && !amountOk ? "Amount above 0 with up to 2 decimals" : undefined} hint={t("payments.cannotExceedTheRemainingBalance")}><Input id="p-amount" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
            <FormField id="p-method" label={t("payments.method")} required error={show && !method ? "Choose a method" : undefined}><Select id="p-method" value={method} onValueChange={setMethod} placeholder={t("common.choose")} options={PAYMENT_METHODS.map((x) => ({ value: x, label: fmt.code(x) }))} /></FormField>
            <FormField id="p-ref" label={t("payments.transactionReference")} hint={t("payments.neverEnterCardNumbers")}><Input id="p-ref" value={reference} onChange={(e) => setReference(e.target.value)} /></FormField>
            <FormField id="p-received" label={t("payments.receivedOn")}><DatePicker id="p-received" value={received} onChange={(e) => setReceived(e.target.value)} /></FormField>
          </div>
          <FormField id="p-proof" label={t("payments.proofOfPayment")} hint={t("payments.storedPrivatelyOnlyAuthorisedStaffCan")}>
            {proof ? <p className="text-sm">{t("payments.nameUploaded", { name: proof.name })}{" "}<Button type="button" variant="link" onClick={() => setProof(null)}>{t("payments.replace")}</Button></p> : <FileUploader assetType="PAYMENT_PROOF" hint={t("payments.pngJpegGifWebpOrPdf")} onUploaded={(a, f) => setProof({ id: a.id, name: f.name })} />}
          </FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={create.isPending}>{t("common.cancel")}</Button><Button type="submit" loading={create.isPending}>{t("payments.recordPayment")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ target, payment, onClose }: { target: CommercialTarget; payment: Payment; onClose: () => void }) {
  const { t } = useI18n();
  const inv = useCommercialInvalidation(target);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<{ message: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.rejectPayment(payment.id, reason.trim()), onSuccess: () => inv.all() });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={t("payments.rejectPaymentnumber", { paymentNumber: payment.paymentNumber })} description={t("payments.explainWhyThisPaymentCouldNot")}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(t("payments.paymentRejected")); onClose(); } catch (err) { setError({ message: errorMessage(err) }); } }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="rej-reason" label={t("common.reason")} required hint={t("payments.n3500Characters")}><Textarea id="rej-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.back")}</Button><Button type="submit" variant="danger" loading={run.isPending} disabled={reason.trim().length < 3}>{t("payments.rejectPayment")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
