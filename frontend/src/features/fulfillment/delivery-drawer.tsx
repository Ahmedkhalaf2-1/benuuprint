"use client";

import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/states";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ReasonDialog } from "@/features/production/admin-dialogs";
import { errorMessage, isApiError } from "@/lib/api/errors";

import * as api from "./api";
import { useFulfillmentInvalidation, useMyDelivery } from "./hooks";
import { AddressBlock, DeliverDialog, ProofSection, methodLabel } from "./parts";
import { useI18n } from "@/i18n/provider";

/**
 * The delivery person's view of ONE assigned delivery (`/staff/deliveries/:id`): recipient, address, packages, notes and the
 * actions for the current status. It shows nothing about prices, quotations or the order beyond what the backend returns.
 */
export function DeliveryDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const q = useMyDelivery(id);
  const inv = useFulfillmentInvalidation();
  const [dlg, setDlg] = useState<"deliver" | "fail" | "return" | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const d = q.data;
  const done = () => inv.delivery();
  const run = async (verb: "dispatch" | "in-transit", ok: string) => { setError(null); setBusy(true); try { await api.staffAction(id, verb); toast.success(t.text(ok)); done(); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); done(); } finally { setBusy(false); } };
  const onWay = d?.status === "DISPATCHED" || d?.status === "IN_TRANSIT";
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} title={d?.shipmentNumber ?? t("fulfillment.delivery")} className="w-[min(30rem,100vw)]">
      <div className="space-y-5 p-4" data-testid="delivery-drawer">
        {q.isLoading ? <p role="status" className="text-sm text-muted-foreground">{t("fulfillment.loading")}</p> : q.error ? <ErrorState error={q.error} title={isApiError(q.error) && q.error.kind === "not_found" ? t("fulfillment.thisDeliveryIsNotAssignedTo") : undefined} /> : d ? (
          <>
            <header className="space-y-1"><p className="flex flex-wrap items-center gap-2"><StatusBadge status={d.status} /><span className="text-sm">{methodLabel(d.deliveryMethod)}</span><span className="text-sm tabular-nums">{t("fulfillment.totalquantityUnits", { totalQuantity: d.totalQuantity })}</span></p>
              <p className="text-base font-medium">{d.recipientName}</p>
              <a href={`tel:${d.recipientPhone}`} className="text-sm text-brand hover:underline">{d.recipientPhone}</a></header>
            {error ? <FormError {...error} /> : null}
            <div className="flex flex-wrap gap-2" data-testid="delivery-actions">
              {d.status === "READY" ? <Button loading={busy} onClick={() => void run("dispatch", "Picked up for delivery")}>{t("fulfillment.pickUpForDelivery")}</Button> : null}
              {d.status === "DISPATCHED" ? <Button variant="secondary" loading={busy} onClick={() => void run("in-transit", "Marked in transit")}>{t("fulfillment.iMOnMyWay")}</Button> : null}
              {onWay ? <><Button onClick={() => setDlg("deliver")}>{t("fulfillment.delivered")}</Button><Button variant="secondary" onClick={() => setDlg("fail")}>{t("fulfillment.couldNotDeliver")}</Button></> : null}
              {d.status === "FAILED" ? <><Button variant="secondary" loading={busy} onClick={() => void run("dispatch", "Dispatched again")}>{t("fulfillment.tryAgain")}</Button><Button variant="secondary" onClick={() => setDlg("return")}>{t("fulfillment.goodsCameBack")}</Button></> : null}
            </div>
            <AddressBlock snapshot={d.address} />
            {d.deliveryNotes ? <p className="rounded-md bg-surface-muted px-3 py-2 text-sm"><span className="font-medium">{t("fulfillment.deliveryNotes")}</span> {d.deliveryNotes}</p> : null}
            <section aria-label={t("fulfillment.packages")}><h4 className="mb-1 text-sm font-semibold">{t("fulfillment.packages")}</h4><ul className="divide-y rounded-md border text-sm" data-testid="delivery-packages">{d.packages.map((l) => <li key={l.orderVariantId} className="flex justify-between px-3 py-1.5"><span>{l.label}</span><span className="tabular-nums">{l.quantity}</span></li>)}</ul></section>
            {d.courierName || d.trackingNumber ? <p className="text-sm text-muted-foreground">{d.courierName}{d.trackingNumber ? ` · ${d.trackingNumber}` : ""}</p> : null}
            <p className="text-xs text-muted-foreground">{d.scheduledAt ? t("fulfillment.scheduledScheduledat", { scheduledAt: fmt.dateTime(d.scheduledAt) }) : ""}{d.dispatchedAt ? t("fulfillment.pickedUpDispatchedat", { dispatchedAt: fmt.dateTime(d.dispatchedAt) }) : ""}{d.deliveredAt ? t("fulfillment.deliveredDeliveredat", { deliveredAt: fmt.dateTime(d.deliveredAt) }) : ""}</p>
            <ProofSection id={d.id} staff hasProof={d.hasProof} canUpload={onWay} onChanged={done} />
          </>
        ) : null}
      </div>
      {d && dlg === "deliver" ? <DeliverDialog hasProof={d.hasProof} onUploadProof={async (f) => { await api.uploadProof(d.id, f, true); done(); }} onSubmit={async (notes) => { await api.staffAction(d.id, "deliver", notes ? { notes } : {}); done(); }} onClose={() => setDlg(null)} /> : null}
      {d && dlg === "fail" ? <ReasonDialog title={t("fulfillment.couldNotDeliver")} description={t("fulfillment.tellTheOfficeWhyCustomerAbsent")} confirmLabel={t("fulfillment.reportFailedDelivery")} onSubmit={async (reason) => { await api.staffAction(d.id, "fail", { reason }); done(); }} onClose={() => setDlg(null)} /> : null}
      {d && dlg === "return" ? <ReasonDialog title={t("fulfillment.goodsCameBack")} description={t("fulfillment.recordsThatTheGoodsReturnedTo")} confirmLabel={t("fulfillment.reportReturn")} onSubmit={async (reason) => { await api.staffAction(d.id, "return", { reason }); done(); }} onClose={() => setDlg(null)} /> : null}
    </Drawer>
  );
}
