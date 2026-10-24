"use client";

import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { ReasonDialog } from "@/features/production/admin-dialogs";
import { useAuth } from "@/features/auth/auth-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormError, FormField } from "@/components/forms/field";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import { formatDateTime } from "@/lib/utils/format";
import * as api from "./api";
import { useFulfillmentInvalidation } from "./hooks";
import { AddressBlock, DeliverDialog, ProofSection, methodLabel } from "./parts";
import type { Shipment, ShipmentStatus } from "./types";

type Dlg = "dispatch" | "deliver" | "fail" | "return" | "cancel" | null;
const ON_ITS_WAY: ShipmentStatus[] = ["DISPATCHED", "IN_TRANSIT"];

const TIMES: Array<[keyof Shipment, string]> = [["readyAt", "Ready"], ["dispatchedAt", "Dispatched"], ["inTransitAt", "In transit"], ["deliveredAt", "Delivered"], ["failedAt", "Failed"], ["returnedAt", "Returned"], ["cancelledAt", "Cancelled"]];

/**
 * Admin shipment detail with the lifecycle actions. What is offered = permission + the shipment's backend status; the backend
 * remains the authority and its refusal is shown. Address is the immutable snapshot.
 */
export function ShipmentDrawer({ shipmentId, orderId, onClose, onEdit }: { shipmentId: string; orderId: string; onClose: () => void; onEdit?: (s: Shipment) => void }) {
  const { can } = useAuth();
  const inv = useFulfillmentInvalidation();
  const q = useQuery({ queryKey: queryKeys.fulfillment.shipment(shipmentId), queryFn: ({ signal }) => api.getShipment(shipmentId, signal) });
  const [dlg, setDlg] = useState<Dlg>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const s = q.data;
  const done = () => inv.shipment(orderId, shipmentId);
  const act = async (verb: api.ShipmentVerb, body?: Record<string, unknown>, ok?: string) => {
    setError(null); setBusy(true);
    try { await api.shipmentAction(shipmentId, verb, body); if (ok) toast.success(ok); done(); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); done(); } finally { setBusy(false); }
  };
  const manage = can("shipments.manage"), dispatch = can("shipments.dispatch"), complete = can("shipments.complete");

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} title={s?.shipmentNumber ?? "Shipment"} className="w-[min(32rem,100vw)]">
      <div className="space-y-5 p-4" data-testid="shipment-drawer">
        {q.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading…</p> : q.error ? (isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState className="py-8" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />) : s ? (
          <>
            <header className="space-y-1">
              <p className="flex flex-wrap items-center gap-2"><StatusBadge status={s.status} /><span className="text-sm">{methodLabel(s.deliveryMethod)}</span><span className="text-sm tabular-nums">{s.totalQuantity} units</span></p>
              <p className="text-sm">{s.recipientName} · {s.recipientPhone}</p>
              <p className="text-xs text-muted-foreground">{s.assignedDeliveryName ? `Delivery: ${s.assignedDeliveryName}` : "No delivery person assigned"}{s.courierName ? ` · ${s.courierName}` : ""}{s.trackingNumber ? ` · ${s.trackingNumber}` : ""}</p>
            </header>
            {error ? <FormError {...error} /> : null}
            <div className="flex flex-wrap gap-2" data-testid="shipment-actions">
              {s.status === "DRAFT" && manage ? <><Button size="sm" loading={busy} onClick={() => void act("ready", undefined, "Shipment is ready")}>Mark ready</Button>{onEdit ? <Button size="sm" variant="secondary" onClick={() => onEdit(s)}>Edit quantities</Button> : null}</> : null}
              {(s.status === "READY" || s.status === "FAILED") && dispatch ? <Button size="sm" onClick={() => setDlg("dispatch")}>{s.status === "FAILED" ? "Retry dispatch" : "Dispatch"}</Button> : null}
              {s.status === "DISPATCHED" && dispatch ? <Button size="sm" variant="secondary" loading={busy} onClick={() => void act("in-transit", undefined, "Marked in transit")}>Mark in transit</Button> : null}
              {ON_ITS_WAY.includes(s.status) && complete ? <><Button size="sm" onClick={() => setDlg("deliver")}>Mark delivered</Button><Button size="sm" variant="secondary" onClick={() => setDlg("fail")}>Delivery failed</Button></> : null}
              {(s.status === "FAILED" || s.status === "DELIVERED") && complete ? <Button size="sm" variant="secondary" onClick={() => setDlg("return")}>Record return</Button> : null}
              {(s.status === "DRAFT" || s.status === "READY") && manage ? <Button size="sm" variant="secondary" className="text-danger" onClick={() => setDlg("cancel")}>Cancel shipment</Button> : null}
            </div>
            <section aria-label="Quantities"><h4 className="mb-1 text-sm font-semibold">Quantities</h4>
              <ul className="divide-y rounded-md border text-sm" data-testid="shipment-lines">{s.lines.map((l) => <li key={l.orderVariantId} className="flex justify-between px-3 py-1.5"><span>{l.label}</span><span className="tabular-nums">{l.quantity}</span></li>)}</ul>
            </section>
            <AddressBlock snapshot={s.addressSnapshot} />
            {s.deliveryNotes ? <p className="text-sm"><span className="text-muted-foreground">Delivery notes:</span> {s.deliveryNotes}</p> : null}
            {s.notes ? <p className="text-sm"><span className="text-muted-foreground">Notes:</span> {s.notes}</p> : null}
            {s.failureReason ? <p className="text-sm text-tone-danger-fg">Failed: {s.failureReason}</p> : null}
            {s.returnReason ? <p className="text-sm text-tone-warning-fg">Returned: {s.returnReason}</p> : null}
            {s.cancelReason ? <p className="text-sm">Cancelled: {s.cancelReason}</p> : null}
            <ul className="space-y-0.5 text-xs text-muted-foreground" aria-label="Timeline">{TIMES.filter(([k]) => s[k]).map(([k, l]) => <li key={k}>{l} {formatDateTime(s[k] as string)}</li>)}<li>Created {formatDateTime(s.createdAt)}</li></ul>
            <ProofSection id={s.id} staff={false} hasProof={s.hasProof} canUpload={(complete || dispatch) && ON_ITS_WAY.includes(s.status)} onChanged={done} />
          </>
        ) : null}
      </div>
      {s && dlg === "dispatch" ? <DispatchDialog onSubmit={async (b) => { await api.shipmentAction(s.id, "dispatch", b); toast.success("Shipment dispatched"); done(); }} onClose={() => setDlg(null)} courier={s.deliveryMethod === "COURIER"} /> : null}
      {s && dlg === "deliver" ? <DeliverDialog hasProof={s.hasProof} onUploadProof={async (f) => { await api.uploadProof(s.id, f, false); done(); }} onSubmit={async (notes) => { await api.shipmentAction(s.id, "deliver", notes ? { notes } : {}); done(); }} onClose={() => setDlg(null)} /> : null}
      {s && dlg === "fail" ? <ReasonDialog title="Delivery failed" description="Records a failed attempt. The shipment can be dispatched again or returned." confirmLabel="Record failure" onSubmit={async (reason) => { await api.shipmentAction(s.id, "fail", { reason }); done(); }} onClose={() => setDlg(null)} /> : null}
      {s && dlg === "return" ? <ReasonDialog title="Record return" description="The goods came back. Their units become shippable again." confirmLabel="Record return" onSubmit={async (reason) => { await api.shipmentAction(s.id, "return", { reason }); done(); }} onClose={() => setDlg(null)} /> : null}
      {s && dlg === "cancel" ? <ReasonDialog title="Cancel shipment" description="Cancels this shipment; the history is kept and its units become shippable again. This is not a delete." confirmLabel="Cancel shipment" destructive onSubmit={async (reason) => { await api.shipmentAction(s.id, "cancel", { reason }); done(); }} onClose={() => setDlg(null)} /> : null}
    </Drawer>
  );
}

function DispatchDialog({ courier, onSubmit, onClose }: { courier: boolean; onSubmit: (b: Record<string, unknown>) => Promise<unknown>; onClose: () => void }) {
  const [f, setF] = useState({ courierName: "", trackingNumber: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title="Dispatch shipment" description="The goods leave the factory. Quantities, packaging and destination are re-validated by the server.">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); setBusy(true); try { await onSubmit(Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]))); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } finally { setBusy(false); } }}>
          {error ? <FormError {...error} /> : null}
          {courier ? <div className="grid gap-2 sm:grid-cols-2"><FormField id="dp-c" label="Courier"><Input id="dp-c" value={f.courierName} onChange={(e) => setF({ ...f, courierName: e.target.value })} /></FormField><FormField id="dp-t" label="Tracking number"><Input id="dp-t" value={f.trackingNumber} onChange={(e) => setF({ ...f, trackingNumber: e.target.value })} /></FormField></div> : null}
          <FormField id="dp-n" label="Notes"><Input id="dp-n" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Back</Button><Button type="submit" loading={busy}>Dispatch</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
