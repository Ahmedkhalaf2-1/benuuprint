"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage, isApiError } from "@/lib/api/errors";

import * as api from "./api";
import { useOrderInvalidation } from "./hooks";
import { VariantsEditor } from "./variants-editor";
import { PRIORITIES, type OrderDetail } from "./types";
import { useI18n } from "@/i18n/provider";

export interface ActionMeta { action: string; route: string; label: string; confirmLabel: string; description: string; reason: "required" | "none"; tone: "primary" | "neutral" | "danger" }
export const ORDER_ACTIONS: Record<string, ActionMeta> = {
  submit: { action: "submit", route: "submit", label: "Submit for confirmation", confirmLabel: "Submit", description: "Sends the draft for confirmation. Variants can only be edited while the order is a draft (request changes to reopen it).", reason: "none", tone: "primary" },
  "request-changes": { action: "request-changes", route: "request-changes", label: "Request changes", confirmLabel: "Return to draft", description: "Returns the order to DRAFT so variants can be edited. A reason is required.", reason: "required", tone: "neutral" },
  ready: { action: "ready", route: "ready", label: "Release for production", confirmLabel: "Release", description: "Marks the order ready for production. The backend checks the commercial release gate (accepted quotation and required payments) and refuses with the reason if it is not met.", reason: "none", tone: "primary" },
  hold: { action: "hold", route: "hold", label: "Put on hold", confirmLabel: "Put on hold", description: "Stops floor work on this order. A reason is required.", reason: "required", tone: "neutral" },
  resume: { action: "resume", route: "resume", label: "Resume", confirmLabel: "Resume", description: "Returns the order to its previous status.", reason: "none", tone: "primary" },
  "force-complete": { action: "force-complete", route: "force-complete", label: "Force complete (override)", confirmLabel: "Force complete", description: "ADMINISTRATIVE OVERRIDE. Completes the order without the normal delivery and payment conditions. The reason is mandatory and audited; the backend only allows it once production is complete.", reason: "required", tone: "danger" },
  cancel: { action: "cancel", route: "cancel", label: "Cancel order", confirmLabel: "Cancel order", description: "Cancels the order, its live jobs and batches. History is kept. This is final. A reason is required.", reason: "required", tone: "danger" },
};

/** Explicit lifecycle action (reason when the backend requires one). Status is never set directly. */
export function OrderActionDialog({ order, meta, onClose }: { order: Pick<OrderDetail, "id" | "orderNumber">; meta: ActionMeta; onClose: () => void }) {
  const { t, locale } = useI18n();
  const inv = useOrderInvalidation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.orderAction(order.id, meta.route, meta.reason === "required" ? { reason: reason.trim() } : undefined), onSuccess: () => inv.order(order.id) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`${t.text(meta.label)} — ${order.orderNumber}`} description={meta.description}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(t("orders.ordernumberV2Done", { orderNumber: order.orderNumber, v2: locale === "en" ? meta.label.toLowerCase() : t.text(meta.label) })); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          {meta.reason === "required" ? <FormField id="oa-reason" label={t("common.reason")} required><Textarea id="oa-reason" autoFocus rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.back")}</Button><Button type="submit" variant={meta.tone === "danger" ? "danger" : "primary"} loading={run.isPending} disabled={meta.reason === "required" && reason.trim().length < 3}>{t.text(meta.confirmLabel)}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Short review before confirmation. The server re-validates everything (quantities, reference, party status). */
export function ConfirmOrderDialog({ order, onClose }: { order: OrderDetail; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const inv = useOrderInvalidation();
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.orderAction(order.id, "confirm"), onSuccess: () => inv.order(order.id) });
  const mismatched = order.items.filter((i) => i.quantity !== i.variantTotal);
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={t("orders.confirmOrdernumber", { orderNumber: order.orderNumber })} description={t("orders.confirmingFreezesTheOrderSpecificationAfter")} className="max-w-lg">
        <div className="space-y-3 text-sm" data-testid="confirm-review">
          {error ? <FormError {...error} /> : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">{t("common.product")}</dt><dd>{order.items.map((i) => i.productName).join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">{t("orders.totalQuantity")}</dt><dd className="tabular-nums">{fmt.number(order.items.reduce((n, i) => n + i.quantity, 0))}</dd>
            <dt className="text-muted-foreground">{t("orders.variants")}</dt><dd>{order.items.flatMap((i) => i.variants).map((v) => `${v.label} × ${v.quantity}`).join(" · ") || "—"}</dd>
            <dt className="text-muted-foreground">{t("orders.targetDelivery")}</dt><dd>{order.targetDeliveryDate ? fmt.date(order.targetDeliveryDate) : t("orders.notSet")}</dd>
            <dt className="text-muted-foreground">{t("orders.approvedReference")}</dt><dd>{t("orders.revisionRevisionOfSamplenumberReadOnly", { revision: order.approvedReference.revision, sampleNumber: order.sampleNumber })}</dd>
          </dl>
          {mismatched.length ? <p role="alert" className="rounded-md bg-tone-warning-bg px-3 py-2 text-tone-warning-fg">{t("orders.theVariantsOfV1DoNot", { v1: mismatched.map((i) => i.productName).join(", "), variantTotal: mismatched[0]!.variantTotal, quantity: mismatched[0]!.quantity })}</p> : null}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t("common.back")}</Button>
            <Button loading={run.isPending} onClick={async () => { setError(null); try { await run.mutateAsync(); toast.success(t("orders.orderConfirmed")); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>{t("orders.confirmOrder")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Controlled revision of a confirmed order. A reason is required. Quantities/variants only before production starts and with no
 * batches/jobs; otherwise only date and notes (the server refuses anything else and its message is shown). The backend reports
 * the commercial impact: the UI does not predict it, it shows it afterwards.
 */
export function ReviseDialog({ order, fabricColors, onClose }: { order: OrderDetail; fabricColors: Array<{ id: string; name: string; hex: string | null }>; onClose: () => void }) {
  const { t } = useI18n();
  const inv = useOrderInvalidation();
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(order.targetDeliveryDate?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(order.internalNotes ?? "");
  const [withItems, setWithItems] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const body = () => ({ reason: reason.trim(), ...(date && date !== order.targetDeliveryDate?.slice(0, 10) ? { targetDeliveryDate: new Date(date).toISOString() } : {}), ...(notes !== (order.internalNotes ?? "") ? { internalNotes: notes.trim() || null } : {}) });
  const run = useMutation({ mutationFn: (items?: Parameters<typeof api.reviseOrder>[1]["items"]) => api.reviseOrder(order.id, { ...body(), ...(items ? { items } : {}) }), onSuccess: (o) => { inv.order(order.id); return o; } });
  const go = async (items?: Parameters<typeof api.reviseOrder>[1]["items"]) => {
    setError(null);
    try { const r = await run.mutateAsync(items); toast.success(r.revisionNumber ? t("orders.revisionRevisionnumberRecorded", { revisionNumber: r.revisionNumber }) : t("orders.revisionRecorded")); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={t("orders.reviseOrdernumber", { orderNumber: order.orderNumber })} description={t("orders.changesToAConfirmedOrderAre2")} className="max-w-3xl">
        <div className="space-y-3">
          {error ? <FormError {...error} /> : null}
          <FormField id="rv-reason" label={t("orders.reasonForTheRevision")} required><Textarea id="rv-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="rv-date" label={t("orders.targetDeliveryDate")}><DatePicker id="rv-date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
            <FormField id="rv-notes" label={t("common.internalNotes")}><Input id="rv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          </div>
          <div className="flex items-start gap-2"><Checkbox id="rv-items" checked={withItems} onCheckedChange={(c) => setWithItems(c === true)} className="mt-0.5" /><Label htmlFor="rv-items" className="font-normal">{t("orders.alsoChangeQuantitiesVariants")}{" "}<span className="text-muted-foreground">{t("orders.onlyBeforeProductionStartsWithNo")}</span></Label></div>
          {withItems ? <VariantsEditor order={order} fabricColors={fabricColors} saveLabel={t("orders.reviseWithTheseVariants")} disabledExtra={reason.trim().length < 3} onSave={(items) => run.mutateAsync(items).then((r) => { toast.success(t("orders.revisionRevisionnumberRecorded", { revisionNumber: r.revisionNumber })); onClose(); })} /> : (
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button loading={run.isPending} disabled={reason.trim().length < 3} onClick={() => void go()}>{t("orders.recordRevision")}</Button></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PriorityDialog({ order, onClose }: { order: OrderDetail; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const inv = useOrderInvalidation();
  const [priority, setPriority] = useState<string>(order.priority);
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({ mutationFn: () => api.changePriority(order.id, priority), onSuccess: () => inv.order(order.id) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t("orders.changePriority")} description={t("orders.theNewPriorityIsAlsoApplied")}>
        <div className="space-y-3">
          {error ? <FormError message={error} /> : null}
          <FormField id="pr" label={t("common.priority")}><Select id="pr" value={priority} onValueChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: fmt.code(p) }))} /></FormField>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button loading={run.isPending} disabled={priority === order.priority} onClick={async () => { setError(null); try { await run.mutateAsync(); toast.success(t("orders.priorityChanged")); onClose(); } catch (e) { setError(errorMessage(e)); } }}>{t("orders.changePriority")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Creates a NEW draft from this order; the original is never modified. Major changes need a new sample (the server says so). */
export function ReorderDialog({ order, onClose }: { order: Pick<OrderDetail, "id" | "orderNumber">; onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const inv = useOrderInvalidation();
  const [clone, setClone] = useState(true);
  const [date, setDate] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.reorder(order.id, { cloneItems: clone, ...(date ? { targetDeliveryDate: new Date(date).toISOString() } : {}) }), onSuccess: () => inv.lists() });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={t("orders.reorderOrdernumber", { orderNumber: order.orderNumber })} description={t("orders.createsANewDraftOrderWith")}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { const o = await run.mutateAsync(); toast.success(t("orders.ordernumberCreatedAsADraft", { orderNumber: o.orderNumber })); onClose(); router.push(`/orders/${o.id}`); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <p className="text-sm text-muted-foreground">{t("orders.fabricConstructionFitPatternPrintMethod")}</p>
          <div className="flex items-start gap-2"><Checkbox id="ro-clone" checked={clone} onCheckedChange={(c) => setClone(c === true)} className="mt-0.5" /><Label htmlFor="ro-clone" className="font-normal">{t("orders.copyQuantitiesAndTheSizeColour")}</Label></div>
          <FormField id="ro-date" label={t("orders.targetDeliveryDate")}><DatePicker id="ro-date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" loading={run.isPending}>{t("orders.createReorder")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
