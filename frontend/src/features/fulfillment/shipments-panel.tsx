"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, EmptyState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import * as customersApi from "@/features/customers/api";
import type { OrderDetail } from "@/features/orders/types";
import { filterEligible } from "@/features/production/admin-dialogs";
import { useStaffSearch } from "@/features/samples/hooks";
import { errorMessage, isApiError } from "@/lib/api/errors";

import * as api from "./api";
import { checkAllocation, shipmentAllocation } from "./allocation";
import { useFulfillmentInvalidation, useOrderShipments } from "./hooks";
import { methodLabel } from "./parts";
import { ShipmentDrawer } from "./shipment-drawer";
import { DELIVERY_METHODS, type CreateShipmentBody, type DeliveryMethod, type Shipment } from "./types";
import { useI18n } from "@/i18n/provider";

export function ShipmentsPanel({ order }: { order: OrderDetail }) {
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const q = useOrderShipments(order.id);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const sp = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(sp.get("shipment")); // deep link: ?tab=shipments&shipment=<id> opens that shipment
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title={t("fulfillment.shipmentsAreNotAvailableToYour")} className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const list = q.data ?? [];
  const f = order.fulfillment;
  return (
    <div className="space-y-4" data-testid="shipments-panel">
      <Card aria-labelledby="sh-t">
        <CardHeader>
          <CardTitle><span id="sh-t">{t("fulfillment.shipments")}</span></CardTitle>
          {can("shipments.manage") ? <Button size="sm" disabled={f.shippableQuantity <= 0} title={f.shippableQuantity <= 0 ? t("fulfillment.nothingPackedIsWaitingToShip") : undefined} onClick={() => setCreating(true)}><Plus />{" "}{t("fulfillment.newShipment")}</Button> : null}
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? <EmptyState title={t("fulfillment.noShipments")} description={f.shippableQuantity > 0 ? t("fulfillment.shippablequantityPackedUnitsCanShipNow", { shippableQuantity: f.shippableQuantity }) : t("fulfillment.unitsCanShipOnceTheyAre")} className="py-8" /> : (
            <ul className="divide-y" data-testid="shipment-list">
              {list.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => setOpenId(s.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-start text-sm hover:bg-surface-muted">
                    <span className="font-mono text-xs font-semibold">{s.shipmentNumber}</span>
                    <StatusBadge status={s.status} />
                    <span className="tabular-nums">{t("fulfillment.totalquantityUnits", { totalQuantity: s.totalQuantity })}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{methodLabel(s.deliveryMethod)} · {s.recipientName}{(s.addressSnapshot as { city?: string } | null)?.city ? ` · ${(s.addressSnapshot as { city?: string }).city}` : ""}</span>
                    <span className="text-xs text-muted-foreground">{s.deliveredAt ? t("fulfillment.deliveredDeliveredat", { deliveredAt: fmt.date(s.deliveredAt) }) : s.dispatchedAt ? t("fulfillment.dispatchedDispatchedat2", { dispatchedAt: fmt.date(s.dispatchedAt) }) : t("fulfillment.createdCreatedat", { createdAt: fmt.date(s.createdAt) })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {openId ? <ShipmentDrawer shipmentId={openId} orderId={order.id} onClose={() => setOpenId(null)} onEdit={(s) => { setOpenId(null); setEditing(s); }} /> : null}
      {creating ? <ShipmentDialog order={order} shipments={list} onClose={() => setCreating(false)} /> : null}
      {editing ? <ShipmentDialog order={order} shipments={list} editing={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

const NEW_ADDR = "__new";
const NO_USER = "__none";

/** Create (or, for a DRAFT, edit the quantities of) a shipment. The address is copied (snapshotted) by the backend at creation. */
export function ShipmentDialog({ order, shipments, editing, onClose }: { order: OrderDetail; shipments: Shipment[]; editing?: Shipment; onClose: () => void }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const inv = useFulfillmentInvalidation();
  const variants = order.items.flatMap((i) => i.variants).map((v) => ({ id: v.id, label: v.label, quantity: v.quantity }));
  const rows = shipmentAllocation(variants, shipments, editing?.id);
  const [qty, setQty] = useState<Record<string, string>>(Object.fromEntries((editing?.lines ?? []).map((l) => [l.orderVariantId, String(l.quantity)])));
  const [method, setMethod] = useState<DeliveryMethod>(editing?.deliveryMethod ?? "OWN_DELIVERY");
  const [name, setName] = useState(editing?.recipientName ?? order.customer.name);
  const [phone, setPhone] = useState(editing?.recipientPhone ?? "");
  const [addr, setAddr] = useState<string>(NEW_ADDR);
  const [one, setOne] = useState({ country: "", state: "", city: "", area: "", addressLine1: "", addressLine2: "", postalCode: "" });
  const [courier, setCourier] = useState({ courierName: "", trackingNumber: "", trackingUrl: "" });
  const [date, setDate] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState(editing?.deliveryNotes ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [assignee, setAssignee] = useState<string>(editing?.assignedDeliveryUserId ?? NO_USER);
  const [staffSearch, setStaffSearch] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const addresses = useQuery({ queryKey: ["fulfillment", "customer-addresses", order.customer.id], queryFn: ({ signal }) => customersApi.listAddresses(order.customer.id, signal), enabled: !editing });
  const staff = useStaffSearch(staffSearch, can("users.read"));
  const couriers = filterEligible(staff.data?.data ?? [], ["DELIVERY"]);
  const check = checkAllocation(rows, qty, editing ? undefined : order.fulfillment.shippableQuantity + 0);
  const lines = rows.filter((r) => Number(qty[r.id]) > 0).map((r) => ({ orderVariantId: r.id, quantity: Number(qty[r.id]) }));
  const save = useMutation({
    mutationFn: async () => {
      if (editing) return api.updateShipment(editing.id, { lines, ...(deliveryNotes.trim() ? { deliveryNotes: deliveryNotes.trim() } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) });
      const body: CreateShipmentBody = {
        deliveryMethod: method, recipientName: name.trim(), recipientPhone: phone.trim(), lines,
        ...(addr !== NEW_ADDR ? { customerAddressId: addr } : one.city.trim() && one.addressLine1.trim() ? { address: Object.fromEntries(Object.entries(one).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])) as NonNullable<CreateShipmentBody["address"]> } : {}),
        ...(method === "COURIER" ? Object.fromEntries(Object.entries(courier).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])) : {}),
        ...(date ? { scheduledAt: new Date(date).toISOString() } : {}), ...(deliveryNotes.trim() ? { deliveryNotes: deliveryNotes.trim() } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}), ...(assignee !== NO_USER ? { assignedDeliveryUserId: assignee } : {}),
      };
      return api.createShipment(order.id, body);
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent title={editing ? t("fulfillment.editShipmentnumber", { shipmentNumber: editing.shipmentNumber }) : t("fulfillment.newShipment")} description={editing ? t("fulfillment.quantitiesCanChangeOnlyWhileThe") : t("fulfillment.shipAnyPartOfTheOrder", { shippableQuantity: order.fulfillment.shippableQuantity })} className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setError(null);
          if (!check.valid) { setError({ message: check.totalError ?? Object.values(check.errors)[0] ?? t("fulfillment.checkTheQuantities") }); return; }
          try { const s = await save.mutateAsync(); inv.shipment(order.id, (s as Shipment).id); toast.success(editing ? t("fulfillment.shipmentUpdated") : t("fulfillment.shipmentnumberCreated", { shipmentNumber: (s as Shipment).shipmentNumber })); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); inv.shipment(order.id); }
        }}>
          {error ? <FormError {...error} /> : null}
          <section aria-label={t("fulfillment.quantities")} className="space-y-1.5">
            <h3 className="text-sm font-semibold">{t("fulfillment.quantities")}</h3>
            <div className="relative overflow-x-auto rounded-md border">
              <table className="w-full min-w-[26rem] text-sm" data-testid="allocation-table">
                <thead className="bg-surface-muted text-xs text-muted-foreground"><tr><th scope="col" className="px-2 py-1.5 text-start font-medium">{t("fulfillment.variant")}</th><th scope="col" className="px-2 text-end font-medium">{t("fulfillment.ordered")}</th><th scope="col" className="px-2 text-end font-medium">{t("fulfillment.onShipments")}</th><th scope="col" className="px-2 text-end font-medium">{t("fulfillment.left")}</th><th scope="col" className="w-24 px-2 text-end font-medium">{t("fulfillment.shipNow")}</th></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.id} className="border-t"><th scope="row" className="px-2 py-1 text-start font-medium">{r.label}</th><td className="px-2 text-end tabular-nums">{r.ordered}</td><td className="px-2 text-end tabular-nums">{r.allocated}</td><td className="px-2 text-end tabular-nums">{r.remaining}</td>
                    <td className="px-1 py-0.5"><Input aria-label={t("fulfillment.shipLabel", { label: r.label })} inputMode="numeric" className="h-8 text-end tabular-nums" aria-invalid={!!check.errors[r.id]} value={qty[r.id] ?? ""} onChange={(e) => setQty({ ...qty, [r.id]: e.target.value })} />{check.errors[r.id] ? <span role="alert" className="block text-end text-xs text-danger">{check.errors[r.id]}</span> : null}</td></tr>
                ))}</tbody>
                <tfoot className="border-t bg-surface-muted/60 text-sm"><tr><th scope="row" className="px-2 py-1.5 text-start font-medium" colSpan={4}>{t("fulfillment.totalOnThisShipment")}</th><td className="px-2 text-end font-semibold tabular-nums" data-testid="alloc-total">{check.total}</td></tr></tfoot>
              </table>
            </div>
            {check.total > 0 && check.totalError ? <p role="alert" className="text-xs text-danger">{check.totalError}</p> : null}
            <p className="text-xs text-muted-foreground">{t("fulfillment.guideOnlyTheServerDecidesFrom")}</p>
          </section>

          {!editing ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField id="sh-method" label={t("fulfillment.deliveryMethod")} required><Select id="sh-method" value={method} onValueChange={(v) => setMethod(v as DeliveryMethod)} options={DELIVERY_METHODS.map((m) => ({ value: m, label: methodLabel(m) }))} /></FormField>
                <FormField id="sh-name" label={t("fulfillment.recipient")} required><Input id="sh-name" value={name} onChange={(e) => setName(e.target.value)} /></FormField>
                <FormField id="sh-phone" label={t("fulfillment.recipientPhone")} required><Input id="sh-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></FormField>
              </div>
              <section aria-label={t("fulfillment.destination")} className="space-y-2">
                <h3 className="text-sm font-semibold">{t("fulfillment.destination")}{" "}<span className="text-xs font-normal text-muted-foreground">{t("fulfillment.copiedIntoTheShipmentLaterChanges")}</span></h3>
                <FormField id="sh-addr" label={t("fulfillment.address")}><Select id="sh-addr" value={addr} onValueChange={setAddr} options={[...(addresses.data ?? []).map((a) => ({ value: a.id, label: `${a.addressLine1}, ${a.city}${a.isDefault ? " (default)" : ""}` })), { value: NEW_ADDR, label: t("fulfillment.oneOffAddress") }]} /></FormField>
                {addr === NEW_ADDR ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <FormField id="sh-a1" label={t("fulfillment.addressLine1")}><Input id="sh-a1" value={one.addressLine1} onChange={(e) => setOne({ ...one, addressLine1: e.target.value })} /></FormField>
                    <FormField id="sh-city" label={t("fulfillment.city")}><Input id="sh-city" value={one.city} onChange={(e) => setOne({ ...one, city: e.target.value })} /></FormField>
                    <FormField id="sh-area" label={t("common.area")}><Input id="sh-area" value={one.area} onChange={(e) => setOne({ ...one, area: e.target.value })} /></FormField>
                    <FormField id="sh-state" label={t("fulfillment.governorateState")}><Input id="sh-state" value={one.state} onChange={(e) => setOne({ ...one, state: e.target.value })} /></FormField>
                  </div>
                ) : null}
              </section>
              {method === "COURIER" ? <div className="grid gap-2 sm:grid-cols-3"><FormField id="sh-cn" label={t("fulfillment.courier")}><Input id="sh-cn" value={courier.courierName} onChange={(e) => setCourier({ ...courier, courierName: e.target.value })} /></FormField><FormField id="sh-tn" label={t("fulfillment.trackingNumber")}><Input id="sh-tn" value={courier.trackingNumber} onChange={(e) => setCourier({ ...courier, trackingNumber: e.target.value })} /></FormField><FormField id="sh-tu" label={t("fulfillment.trackingUrl")}><Input id="sh-tu" value={courier.trackingUrl} onChange={(e) => setCourier({ ...courier, trackingUrl: e.target.value })} /></FormField></div> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="sh-date" label={t("fulfillment.scheduledFor")}><DatePicker id="sh-date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
                {method === "OWN_DELIVERY" && can("users.read") ? (
                  <div className="space-y-1.5"><label htmlFor="sh-staff" className="text-[0.8125rem] font-medium">{t("fulfillment.deliveryPerson")}</label>
                    <SearchInput value={staffSearch} onValueChange={setStaffSearch} placeholder={t("fulfillment.searchStaff")} aria-label={t("fulfillment.searchDeliveryStaff")} />
                    <Select id="sh-staff" value={assignee} onValueChange={setAssignee} options={[{ value: NO_USER, label: t("fulfillment.notAssignedYet") }, ...couriers.map((u) => ({ value: u.id, label: u.name }))]} /></div>
                ) : null}
              </div>
            </>
          ) : null}
          <FormField id="sh-dn" label={t("fulfillment.deliveryNotesForTheDeliveryPerson")}><Textarea id="sh-dn" rows={2} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} /></FormField>
          <FormField id="sh-notes" label={t("common.internalNotes")}><Input id="sh-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" loading={save.isPending} disabled={!check.valid || (!editing && (!name.trim() || !phone.trim()))}>{editing ? t("fulfillment.saveQuantities") : t("fulfillment.createShipment")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
