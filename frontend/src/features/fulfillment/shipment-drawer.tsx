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

import * as api from "./api";
import { useFulfillmentInvalidation } from "./hooks";
import { AddressBlock, DeliverDialog, ProofSection, methodLabel } from "./parts";
import type { Shipment, ShipmentStatus } from "./types";
import { useI18n } from "@/i18n/provider";

type Dlg = "dispatch" | "deliver" | "fail" | "return" | "cancel" | null;
const ON_ITS_WAY: ShipmentStatus[] = ["DISPATCHED", "IN_TRANSIT"];

const TIMES: Array<[keyof Shipment, string]> = [["readyAt", "Ready"], ["dispatchedAt", "Dispatched"], ["inTransitAt", "In transit"], ["deliveredAt", "Delivered"], ["failedAt", "Failed"], ["returnedAt", "Returned"], ["cancelledAt", "Cancelled"]];

/**
 * Admin shipment detail with the lifecycle actions. What is offered = permission + the shipment's backend status; the backend
 * remains the authority and its refusal is shown. Address is the immutable snapshot.
 */
export function ShipmentDrawer({ shipmentId, orderId, onClose, onEdit }: { shipmentId: string; orderId: string; onClose: () => void; onEdit?: (s: Shipment) => void }) {
  const { t, fmt } = useI18n();
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
    try { await api.shipmentAction(shipmentId, verb, body); if (ok) toast.success(t.text(ok)); done(); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); done(); } finally { setBusy(false); }
  };
  const manage = can("shipments.manage"), dispatch = can("shipments.dispatch"), complete = can("shipments.complete");

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} title={s?.shipmentNumber ?? t("fulfillment.shipment")} className="w-[min(32rem,100vw)]">
      <div className="space-y-5 p-4" data-testid="shipment-drawer">
        {q.isLoading ? <p role="status" className="text-sm text-muted-foreground">{t("fulfillment.loading")}</p> : q.error ? (isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState className="py-8" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />) : s ? (
          <>
            <header className="space-y-1">
              <p className="flex flex-wrap items-center gap-2"><StatusBadge status={s.status} /><span className="text-sm">{methodLabel(s.deliveryMethod)}</span><span className="text-sm tabular-nums">{t("fulfillment.totalquantityUnits", { totalQuantity: s.totalQuantity })}</span></p>
              <p className="text-sm">{s.recipientName} · {s.recipientPhone}</p>
              <p className="text-xs text-muted-foreground">{s.assignedDeliveryName ? t("fulfillment.deliveryAssigneddeliveryname", { assignedDeliveryName: s.assignedDeliveryName }) : t("fulfillment.noDeliveryPersonAssigned")}{s.courierName ? ` · ${s.courierName}` : ""}{s.trackingNumber ? ` · ${s.trackingNumber}` : ""}</p>
            </header>
            {error ? <FormError {...error} /> : null}
            <div className="flex flex-wrap gap-2" data-testid="shipment-actions">
              {s.status === "DRAFT" && manage ? <><Button size="sm" loading={busy} onClick={() => void act("ready", undefined, "Shipment is ready")}>{t("fulfillment.markReady")}</Button>{onEdit ? <Button size="sm" variant="secondary" onClick={() => onEdit(s)}>{t("fulfillment.editQuantities")}</Button> : null}</> : null}
              {(s.status === "READY" || s.status === "FAILED") && dispatch ? <Button size="sm" onClick={() => setDlg("dispatch")}>{s.status === "FAILED" ? t("fulfillment.retryDispatch") : t("fulfillment.dispatch")}</Button> : null}
              {s.status === "DISPATCHED" && dispatch ? <Button size="sm" variant="secondary" loading={busy} onClick={() => void act("in-transit", undefined, "Marked in transit")}>{t("fulfillment.markInTransit")}</Button> : null}
              {ON_ITS_WAY.includes(s.status) && complete ? <><Button size="sm" onClick={() => setDlg("deliver")}>{t("fulfillment.markDelivered")}</Button><Button size="sm" variant="secondary" onClick={() => setDlg("fail")}>{t("fulfillment.deliveryFailed")}</Button></> : null}
              {(s.status === "FAILED" || s.status === "DELIVERED") && complete ? <Button size="sm" variant="secondary" onClick={() => setDlg("return")}>{t("fulfillment.recordReturn")}</Button> : null}
              {(s.status === "DRAFT" || s.status === "READY") && manage ? <Button size="sm" variant="secondary" className="text-danger" onClick={() => setDlg("cancel")}>{t("fulfillment.cancelShipment")}</Button> : null}
            </div>
            <section aria-label={t("fulfillment.quantities")}><h4 className="mb-1 text-sm font-semibold">{t("fulfillment.quantities")}</h4>
              <ul className="divide-y rounded-md border text-sm" data-testid="shipment-lines">{s.lines.map((l) => <li key={l.orderVariantId} className="flex justify-between px-3 py-1.5"><span>{l.label}</span><span className="tabular-nums">{l.quantity}</span></li>)}</ul>
            </section>
            <AddressBlock snapshot={s.addressSnapshot} />
            {s.deliveryNotes ? <p className="text-sm"><span className="text-muted-foreground">{t("fulfillment.deliveryNotes")}</span> {s.deliveryNotes}</p> : null}
            {s.notes ? <p className="text-sm"><span className="text-muted-foreground">{t("fulfillment.notes")}</span> {s.notes}</p> : null}
            {s.failureReason ? <p className="text-sm text-tone-danger-fg">{t("fulfillment.failedFailurereason", { failureReason: s.failureReason })}</p> : null}
            {s.returnReason ? <p className="text-sm text-tone-warning-fg">{t("fulfillment.returnedReturnreason", { returnReason: s.returnReason })}</p> : null}
            {s.cancelReason ? <p className="text-sm">{t("fulfillment.cancelledCancelreason", { cancelReason: s.cancelReason })}</p> : null}
            <ul className="space-y-0.5 text-xs text-muted-foreground" aria-label={t("fulfillment.timeline")}>{TIMES.filter(([k]) => s[k]).map(([k, l]) => <li key={k}>{t.text(l)} {fmt.dateTime(s[k] as string)}</li>)}<li>{t("fulfillment.createdCreatedat", { createdAt: fmt.dateTime(s.createdAt) })}</li></ul>
            <ProofSection id={s.id} staff={false} hasProof={s.hasProof} canUpload={(complete || dispatch) && ON_ITS_WAY.includes(s.status)} onChanged={done} />
          </>
        ) : null}
      </div>
      {s && dlg === "dispatch" ? <DispatchDialog onSubmit={async (b) => { await api.shipmentAction(s.id, "dispatch", b); toast.success(t("fulfillment.shipmentDispatched")); done(); }} onClose={() => setDlg(null)} courier={s.deliveryMethod === "COURIER"} /> : null}
      {s && dlg === "deliver" ? <DeliverDialog hasProof={s.hasProof} onUploadProof={async (f) => { await api.uploadProof(s.id, f, false); done(); }} onSubmit={async (notes) => { await api.shipmentAction(s.id, "deliver", notes ? { notes } : {}); done(); }} onClose={() => setDlg(null)} /> : null}
      {s && dlg === "fail" ? <ReasonDialog title={t("fulfillment.deliveryFailed")} description={t("fulfillment.recordsAFailedAttemptTheShipment")} confirmLabel={t("fulfillment.recordFailure")} onSubmit={async (reason) => { await api.shipmentAction(s.id, "fail", { reason }); done(); }} onClose={() => setDlg(null)} /> : null}
      {s && dlg === "return" ? <ReasonDialog title={t("fulfillment.recordReturn")} description={t("fulfillment.theGoodsCameBackTheirUnits")} confirmLabel={t("fulfillment.recordReturn")} onSubmit={async (reason) => { await api.shipmentAction(s.id, "return", { reason }); done(); }} onClose={() => setDlg(null)} /> : null}
      {s && dlg === "cancel" ? <ReasonDialog title={t("fulfillment.cancelShipment")} description={t("fulfillment.cancelsThisShipmentTheHistoryIs")} confirmLabel={t("fulfillment.cancelShipment")} destructive onSubmit={async (reason) => { await api.shipmentAction(s.id, "cancel", { reason }); done(); }} onClose={() => setDlg(null)} /> : null}
    </Drawer>
  );
}

function DispatchDialog({ courier, onSubmit, onClose }: { courier: boolean; onSubmit: (b: Record<string, unknown>) => Promise<unknown>; onClose: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ courierName: "", trackingNumber: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title={t("fulfillment.dispatchShipment")} description={t("fulfillment.theGoodsLeaveTheFactoryQuantities")}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); setBusy(true); try { await onSubmit(Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]))); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } finally { setBusy(false); } }}>
          {error ? <FormError {...error} /> : null}
          {courier ? <div className="grid gap-2 sm:grid-cols-2"><FormField id="dp-c" label={t("fulfillment.courier")}><Input id="dp-c" value={f.courierName} onChange={(e) => setF({ ...f, courierName: e.target.value })} /></FormField><FormField id="dp-t" label={t("fulfillment.trackingNumber")}><Input id="dp-t" value={f.trackingNumber} onChange={(e) => setF({ ...f, trackingNumber: e.target.value })} /></FormField></div> : null}
          <FormField id="dp-n" label={t("common.notes")}><Input id="dp-n" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.back")}</Button><Button type="submit" loading={busy}>{t("fulfillment.dispatch")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
