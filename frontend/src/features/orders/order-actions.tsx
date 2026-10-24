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
import { formatDate, formatNumber, humanizeCode } from "@/lib/utils/format";
import * as api from "./api";
import { useOrderInvalidation } from "./hooks";
import { VariantsEditor } from "./variants-editor";
import { PRIORITIES, type OrderDetail } from "./types";

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
  const inv = useOrderInvalidation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.orderAction(order.id, meta.route, meta.reason === "required" ? { reason: reason.trim() } : undefined), onSuccess: () => inv.order(order.id) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`${meta.label} — ${order.orderNumber}`} description={meta.description}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(`${order.orderNumber}: ${meta.label.toLowerCase()} done`); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          {meta.reason === "required" ? <FormField id="oa-reason" label="Reason" required><Textarea id="oa-reason" autoFocus rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Back</Button><Button type="submit" variant={meta.tone === "danger" ? "danger" : "primary"} loading={run.isPending} disabled={meta.reason === "required" && reason.trim().length < 3}>{meta.confirmLabel}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Short review before confirmation. The server re-validates everything (quantities, reference, party status). */
export function ConfirmOrderDialog({ order, onClose }: { order: OrderDetail; onClose: () => void }) {
  const inv = useOrderInvalidation();
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.orderAction(order.id, "confirm"), onSuccess: () => inv.order(order.id) });
  const mismatched = order.items.filter((i) => i.quantity !== i.variantTotal);
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`Confirm ${order.orderNumber}`} description="Confirming freezes the order specification. After that, changes go through a revision." className="max-w-lg">
        <div className="space-y-3 text-sm" data-testid="confirm-review">
          {error ? <FormError {...error} /> : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">Product</dt><dd>{order.items.map((i) => i.productName).join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">Total quantity</dt><dd className="tabular-nums">{formatNumber(order.items.reduce((n, i) => n + i.quantity, 0))}</dd>
            <dt className="text-muted-foreground">Variants</dt><dd>{order.items.flatMap((i) => i.variants).map((v) => `${v.label} × ${v.quantity}`).join(" · ") || "—"}</dd>
            <dt className="text-muted-foreground">Target delivery</dt><dd>{order.targetDeliveryDate ? formatDate(order.targetDeliveryDate) : "Not set"}</dd>
            <dt className="text-muted-foreground">Approved reference</dt><dd>Revision {order.approvedReference.revision} of {order.sampleNumber} (read-only)</dd>
          </dl>
          {mismatched.length ? <p role="alert" className="rounded-md bg-tone-warning-bg px-3 py-2 text-tone-warning-fg">The variants of {mismatched.map((i) => i.productName).join(", ")} do not add up to the item quantity ({mismatched[0]!.variantTotal} vs {mismatched[0]!.quantity}). The server will refuse until they match.</p> : null}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Back</Button>
            <Button loading={run.isPending} onClick={async () => { setError(null); try { await run.mutateAsync(); toast.success("Order confirmed"); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>Confirm order</Button></div>
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
    try { const r = await run.mutateAsync(items); toast.success(r.revisionNumber ? `Revision ${r.revisionNumber} recorded` : "Revision recorded"); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`Revise ${order.orderNumber}`} description="Changes to a confirmed order are recorded as a revision with your reason. Changing commercially relevant data can end the accepted quotation." className="max-w-3xl">
        <div className="space-y-3">
          {error ? <FormError {...error} /> : null}
          <FormField id="rv-reason" label="Reason for the revision" required><Textarea id="rv-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="rv-date" label="Target delivery date"><DatePicker id="rv-date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
            <FormField id="rv-notes" label="Internal notes"><Input id="rv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          </div>
          <div className="flex items-start gap-2"><Checkbox id="rv-items" checked={withItems} onCheckedChange={(c) => setWithItems(c === true)} className="mt-0.5" /><Label htmlFor="rv-items" className="font-normal">Also change quantities / variants <span className="text-muted-foreground">(only before production starts, with no batches or jobs)</span></Label></div>
          {withItems ? <VariantsEditor order={order} fabricColors={fabricColors} saveLabel="Revise with these variants" disabledExtra={reason.trim().length < 3} onSave={(items) => run.mutateAsync(items).then((r) => { toast.success(`Revision ${r.revisionNumber} recorded`); onClose(); })} /> : (
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={run.isPending} disabled={reason.trim().length < 3} onClick={() => void go()}>Record revision</Button></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PriorityDialog({ order, onClose }: { order: OrderDetail; onClose: () => void }) {
  const inv = useOrderInvalidation();
  const [priority, setPriority] = useState<string>(order.priority);
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({ mutationFn: () => api.changePriority(order.id, priority), onSuccess: () => inv.order(order.id) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Change priority" description="The new priority is also applied to this order's live jobs.">
        <div className="space-y-3">
          {error ? <FormError message={error} /> : null}
          <FormField id="pr" label="Priority"><Select id="pr" value={priority} onValueChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: humanizeCode(p) }))} /></FormField>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={run.isPending} disabled={priority === order.priority} onClick={async () => { setError(null); try { await run.mutateAsync(); toast.success("Priority changed"); onClose(); } catch (e) { setError(errorMessage(e)); } }}>Change priority</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Creates a NEW draft from this order; the original is never modified. Major changes need a new sample (the server says so). */
export function ReorderDialog({ order, onClose }: { order: Pick<OrderDetail, "id" | "orderNumber">; onClose: () => void }) {
  const router = useRouter();
  const inv = useOrderInvalidation();
  const [clone, setClone] = useState(true);
  const [date, setDate] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.reorder(order.id, { cloneItems: clone, ...(date ? { targetDeliveryDate: new Date(date).toISOString() } : {}) }), onSuccess: () => inv.lists() });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`Reorder ${order.orderNumber}`} description="Creates a new draft order with the same approved product reference. It does not copy payments, quotations, jobs, batches or shipments.">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { const o = await run.mutateAsync(); toast.success(`${o.orderNumber} created as a draft`); onClose(); router.push(`/orders/${o.id}`); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <p className="text-sm text-muted-foreground">Fabric, construction, fit, pattern, print method and artwork cannot change on a reorder: those need a new sample and approval.</p>
          <div className="flex items-start gap-2"><Checkbox id="ro-clone" checked={clone} onCheckedChange={(c) => setClone(c === true)} className="mt-0.5" /><Label htmlFor="ro-clone" className="font-normal">Copy quantities and the size / colour breakdown</Label></div>
          <FormField id="ro-date" label="Target delivery date"><DatePicker id="ro-date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={run.isPending}>Create reorder</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
