"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";
import { useAddresses, useOptions, useOrder, useSample } from "./hooks";
import { cellKey, cellsFromOrder, checkItems, itemsBody, setCellValue, toDateInput, toIsoDate, variantSum, type Cells } from "./order-builders";
import type { OrderDetail } from "./types";

const NOT_FOUND = <EmptyState title="Not found" description="We couldn't find that. It may have been removed, or the link may be wrong." action={<Button asChild variant="secondary"><Link href="/account/orders">Back to my orders</Link></Button>} className="py-20" />;
const gone = (e: unknown) => isApiError(e) && (e.kind === "not_found" || e.kind === "validation");

interface Reference { sampleId: string; number: string; product: string | null; brand: string | null; fabricId: string | null }

/** Size × colour grid with real ids from the configurator (no custom sizes or colours). */
function Matrix({ sizes, colors, cells, onChange, disabled }: { sizes: Array<{ id: string; name: string }>; colors: Array<{ id: string; name: string }>; cells: Cells; onChange: (c: Cells) => void; disabled?: boolean }) {
  const rows = colors.length ? colors : [{ id: "", name: "Approved colour" }];
  return (
    <div className="overflow-x-auto" data-testid="order-matrix">
      <table className="w-full text-sm">
        <thead><tr><th className="p-2 text-start font-medium text-muted-foreground">{colors.length ? "Colour" : ""}</th>{sizes.map((s) => <th key={s.id} className="p-2 text-center font-medium">{s.name}</th>)}</tr></thead>
        <tbody>{rows.map((c) => (
          <tr key={c.id || "base"} className="border-t">
            <th scope="row" className="whitespace-nowrap p-2 text-start font-normal">{c.name}</th>
            {sizes.map((s) => <td key={s.id} className="p-1"><Input inputMode="numeric" className="h-9 w-20 text-center" aria-label={`${c.name} ${s.name} quantity`} disabled={disabled} value={cells[cellKey(s.id, c.id)] ?? ""} onChange={(e) => onChange(setCellValue(cells, cellKey(s.id, c.id), e.target.value.replace(/[^\d]/g, "")))} /></td>)}
          </tr>))}</tbody>
      </table>
    </div>
  );
}

/** Create (from an approved sample) or edit a draft order. Save Draft and Submit use the explicit routes; the status is never PATCHed. */
export function OrderForm({ sampleId, orderId }: { sampleId?: string; orderId?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const order = useOrder(orderId);
  const refId = orderId ? order.data?.reference.sampleId : sampleId;
  const sample = useSample(refId);
  const options = useOptions();
  const addresses = useAddresses();
  const [init, setInit] = useState<string | null>(null);
  const [total, setTotal] = useState("");
  const [cells, setCells] = useState<Cells>({});
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [addressId, setAddressId] = useState("");
  const [scaleId, setScaleId] = useState("");
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  if (orderId && order.data && init !== order.data.id) {
    const o = order.data;
    setInit(o.id); setTotal(o.items[0] ? String(o.items[0].quantity) : ""); setCells(cellsFromOrder(o));
    setDate(toDateInput(o.targetDeliveryDate)); setNotes(o.customerNotes ?? ""); setAddressId(o.preferredAddressId ?? "");
  }

  const fabric = options.data?.fabrics.find((f) => f.id === sample.data?.fabricId);
  const colors = fabric?.colors ?? [];
  const scales = useMemo(() => options.data?.sizeScales ?? [], [options.data]);
  const scale = scales.find((s) => s.id === scaleId) ?? scales[0];
  const check = checkItems(total, cells);

  const loading = (orderId && order.isLoading) || sample.isLoading || options.isLoading;
  if (loading) return <PageSkeleton />;
  if (orderId && order.error) return gone(order.error) ? NOT_FOUND : <ErrorState error={order.error} onRetry={() => order.refetch()} />;
  if (sample.error) return gone(sample.error) ? NOT_FOUND : <ErrorState error={sample.error} onRetry={() => sample.refetch()} />;
  if (options.error) return <ErrorState error={options.error} onRetry={() => options.refetch()} />;
  const s = sample.data;
  if (!s) return null;
  if (orderId && order.data && !order.data.allowedActions.includes("EDIT_ORDER")) {
    return <EmptyState title="This order can't be edited" description="Once an order is submitted our team takes over. You can follow its progress from the order page." action={<Button asChild><Link href={`/account/orders/${orderId}`}>View order</Link></Button>} className="py-20" />;
  }
  const ref: Reference = { sampleId: s.id, number: s.sampleNumber, product: s.productName ?? null, brand: s.brand.name, fabricId: s.fabricId };
  const noSizes = !scale || scale.sizes.length === 0;
  const myAddresses = addresses.data ?? [];

  const invalidate = () => { void qc.invalidateQueries({ queryKey: queryKeys.customer.orders }); };
  const save = async (submit: boolean) => {
    setError(null);
    if (check.state !== "empty" && check.state !== "ok") { setError({ message: check.message ?? "Check the quantities." }); return; }
    if (submit && check.state !== "ok") { setError({ message: "Enter the quantity and size breakdown before submitting." }); return; }
    setBusy(submit ? "submit" : "save");
    let id = orderId;
    try {
      const details = { ...(date ? { targetDeliveryDate: toIsoDate(date) } : {}), ...(notes.trim() ? { customerNotes: notes.trim() } : {}), ...(addressId ? { preferredAddressId: addressId } : {}) };
      const items = check.state === "ok" ? itemsBody(total, cells) : undefined;
      if (id) {
        await api.updateOrder(id, { targetDeliveryDate: date ? toIsoDate(date) : null, customerNotes: notes.trim() || null, preferredAddressId: addressId || null });
        if (items) await api.putOrderItems(id, items);
      } else {
        const created = await api.createOrder(s.id, { ...(items ? { items } : {}), ...details });
        id = created.id;
      }
      if (submit) {
        const done = await api.submitOrder(id);
        invalidate();
        router.replace(`/account/orders/${done.id}?submitted=1`);
      } else {
        invalidate();
        toast.success("Draft saved");
        router.replace(`/account/orders/${id}/edit`);
      }
    } catch (e) {
      setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined });
      if (id && !orderId) router.replace(`/account/orders/${id}/edit`);
      invalidate();
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href={orderId ? `/account/orders/${orderId}` : `/account/samples/${s.id}`} className="text-muted-foreground hover:text-foreground hover:underline">← Back</Link></p>
      <header className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight">{orderId ? `Edit order ${order.data?.orderNumber ?? ""}` : "Start a bulk order"}</h1>
        <p className="text-muted-foreground" data-testid="reference-note">This order will use your approved sample as the production reference.</p></header>
      <Card data-testid="reference-card"><CardHeader><CardTitle>Approved sample</CardTitle></CardHeader><CardContent><dl className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr]">
        <dt className="text-muted-foreground">Sample</dt><dd className="font-mono">{ref.number}</dd>
        <dt className="text-muted-foreground">Product</dt><dd>{ref.product ?? "—"}</dd>
        <dt className="text-muted-foreground">Brand</dt><dd>{ref.brand}</dd>
      </dl></CardContent></Card>

      <Card><CardHeader><CardTitle>Quantity</CardTitle></CardHeader><CardContent className="space-y-4">
        <FormField id="ord-total" label="Total units" hint="How many pieces in all."><Input id="ord-total" inputMode="numeric" className="w-40" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d]/g, ""))} /></FormField>
        <div className="space-y-2"><h3 className="text-sm font-medium">Sizes{colors.length ? " and colours" : ""}</h3>
          {noSizes ? <p role="status" data-testid="no-sizes" className="rounded-md bg-surface-muted px-3 py-2 text-sm">No sizes are available to choose right now. Please contact Benue Print to set up your quantities.</p> : (
            <>
              {scales.length > 1 ? <Select aria-label="Size range" className="w-56" value={scale.id} onValueChange={setScaleId} options={scales.map((x) => ({ value: x.id, label: x.name }))} /> : null}
              <Matrix sizes={scale.sizes} colors={colors} cells={cells} onChange={setCells} />
              {!colors.length ? <p className="text-xs text-muted-foreground">Your order uses the approved colour from your sample.</p> : null}
            </>)}
          <p className={check.state === "mismatch" || check.state === "invalid" ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"} role={check.message ? "alert" : undefined} data-testid="qty-summary">
            Breakdown: {variantSum(cells)} · Order total: {total || 0}{check.message ? ` — ${check.message}` : check.state === "ok" ? " — matches" : ""}</p>
        </div></CardContent></Card>

      <Card><CardHeader><CardTitle>Delivery</CardTitle></CardHeader><CardContent className="space-y-4">
        <FormField id="ord-date" label="Requested delivery date" hint="A request, not a guarantee. We'll confirm a realistic date after review."><DatePicker id="ord-date" className="w-48" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
        <FormField id="ord-addr" label="Delivery address" hint="Addresses saved in your profile.">
          {myAddresses.length ? <Select id="ord-addr" aria-label="Delivery address" value={addressId || "__none"} onValueChange={(v) => setAddressId(v === "__none" ? "" : v)} options={[{ value: "__none", label: "Choose an address…" }, ...myAddresses.map((a) => ({ value: a.id, label: `${a.addressLine1}, ${a.city}` }))]} /> : <p className="text-sm text-muted-foreground">You have no saved addresses yet.</p>}
        </FormField>
        <p className="text-sm"><Link href="/account/profile" className="text-brand hover:underline">Add or edit addresses in your profile</Link></p>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><FormField id="ord-notes" label="Anything we should know?"><Textarea id="ord-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField></CardContent></Card>

      <Card data-testid="order-review"><CardHeader><CardTitle>Review &amp; submit</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Submitting sends the order to our team to review. You can&apos;t change it afterwards, so check the quantities first.</p>
        {error ? <FormError message={error.message} requestId={error.requestId} /> : null}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" loading={busy === "save"} disabled={!!busy} onClick={() => void save(false)}>Save draft</Button>
          <Button loading={busy === "submit"} disabled={!!busy || check.state !== "ok"} onClick={() => void save(true)}>Submit order</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}

export type { OrderDetail };
