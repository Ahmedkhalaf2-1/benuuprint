"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ColorSwatch } from "@/components/data-display/color-swatch";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useConfiguratorOptions } from "@/features/master-data/hooks";
import { errorMessage, isApiError } from "@/lib/api/errors";
import * as api from "./api";
import { useOrderInvalidation } from "./hooks";
import { CUSTOM, NONE, intOk, type Row } from "./matrix";
import { QuantityMatrix } from "./quantity-matrix";
import { QuantitySummary } from "./quantity-summary";
import type { ItemInput, OrderDetail, OrderItem, VariantInput } from "./types";

interface ItemState { id: string; isNew?: boolean; productName: string; quantity: string; notes: string; rows: Row[] }
let seq = 0;

const fromItem = (it: OrderItem): ItemState => ({
  id: it.id, productName: it.productName, quantity: String(it.quantity), notes: it.notes ?? "",
  rows: it.variants.map((v) => ({
    key: ++seq, id: v.id, size: v.sizeOptionId ?? (v.customSizeName ? CUSTOM : NONE), customSize: v.customSizeName ?? "",
    color: v.fabricColorId ?? (v.customColorName ? CUSTOM : NONE), customColor: v.customColorName ?? "", pantone: v.pantone ?? "", hex: v.hex ?? "", quantity: String(v.quantity),
  })),
});


/** Row -> API variant. Catalogue vs custom pairs are exclusive; ids are kept so history stays valid. */
export function toVariantInput(r: Row): VariantInput {
  const v: VariantInput = { quantity: Number(r.quantity) };
  if (r.id) v.id = r.id;
  if (r.size === CUSTOM) { if (r.customSize.trim()) v.customSizeName = r.customSize.trim(); } else if (r.size !== NONE) v.sizeOptionId = r.size;
  if (r.color === CUSTOM) {
    if (r.customColor.trim()) v.customColorName = r.customColor.trim();
    if (r.pantone.trim()) v.pantone = r.pantone.trim();
    if (r.hex.trim()) v.hex = r.hex.trim();
  } else if (r.color !== NONE) v.fabricColorId = r.color;
  return v;
}

export function toItemInputs(items: ItemState[]): ItemInput[] {
  // a new item has no id: the API creates it (its product name comes from the approved reference)
  return items.map((it) => ({ ...(it.isNew ? {} : { id: it.id }), quantity: Number(it.quantity), ...(it.notes.trim() ? { notes: it.notes.trim() } : {}), variants: it.rows.map(toVariantInput) }));
}

/** Variant editor for DRAFT orders: size × colour rows per item. Totals are NOT enforced here (the server checks them at confirmation). */
export function VariantsEditor({ order, fabricColors, onSave, saveLabel = "Save variants", disabledExtra }: {
  order: OrderDetail;
  fabricColors: Array<{ id: string; name: string; hex: string | null; pantone?: string | null }>;
  /** Replaces the default draft save (PUT /items): used by the revision dialog (POST /revise). */
  onSave?: (items: ItemInput[]) => Promise<unknown>;
  saveLabel?: string;
  disabledExtra?: boolean;
}) {
  const inv = useOrderInvalidation();
  const config = useConfiguratorOptions();
  const [items, setItems] = useState<ItemState[]>(order.items.length ? order.items.map(fromItem) : [{ id: "new-item", isNew: true, productName: "Product", quantity: "", notes: "", rows: [] }]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [view, setView] = useState<"matrix" | "list">("matrix");

  const sizes = useMemo(() => (config.data?.sizeScales ?? []).flatMap((sc) => sc.sizes.map((z) => ({ value: z.id, label: (config.data?.sizeScales.length ?? 0) > 1 ? `${sc.name} · ${z.name}` : z.name }))), [config.data]);
  const save = useMutation({ mutationFn: () => (onSave ? onSave(toItemInputs(items)) : api.replaceItems(order.id, toItemInputs(items))), onSuccess: () => inv.order(order.id) });

  const patchItem = (id: string, f: (i: ItemState) => ItemState) => { setItems((xs) => xs.map((x) => (x.id === id ? f(x) : x))); setDirty(true); };
  const patchRow = (itemId: string, key: number, p: Partial<Row>) => patchItem(itemId, (i) => ({ ...i, rows: i.rows.map((r) => (r.key === key ? { ...r, ...p } : r)) }));
  const rowErr = (r: Row) => ({
    quantity: intOk(r.quantity) ? undefined : "Whole number above 0",
    kind: r.size === NONE && r.color === NONE ? "Choose a size or a colour" : (r.size === CUSTOM && !r.customSize.trim()) || (r.color === CUSTOM && !r.customColor.trim()) ? "Enter the custom name" : undefined,
  });
  const valid = items.every((i) => intOk(i.quantity) && i.rows.every((r) => !rowErr(r).quantity && !rowErr(r).kind));

  const submit = async () => {
    setShowErrors(true);
    setError(null);
    if (!valid) return;
    try {
      await save.mutateAsync();
      setDirty(false);
      setShowErrors(false);
      if (!onSave) toast.success("Variants saved");
    } catch (e) {
      setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined });
    }
  };

  return (
    <div className="space-y-4" data-testid="variants-editor">
      {error ? <FormError {...error} /> : null}
      {items.map((it) => {
        const total = it.rows.reduce((n, r) => n + (intOk(r.quantity) ? Number(r.quantity) : 0), 0);
        const orderQty = intOk(it.quantity) ? Number(it.quantity) : 0;
        return (
          <Card key={it.id} aria-labelledby={`item-${it.id}`}>
            <CardHeader><CardTitle><span id={`item-${it.id}`}>{it.productName}</span></CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                <div className="space-y-1.5"><label htmlFor={`q-${it.id}`} className="text-[0.8125rem] font-medium">Order quantity</label><Input id={`q-${it.id}`} inputMode="numeric" aria-invalid={showErrors && !intOk(it.quantity)} value={it.quantity} onChange={(e) => patchItem(it.id, (i) => ({ ...i, quantity: e.target.value }))} /></div>
                <div className="space-y-1.5"><label htmlFor={`n-${it.id}`} className="text-[0.8125rem] font-medium">Item notes</label><Input id={`n-${it.id}`} value={it.notes} onChange={(e) => patchItem(it.id, (i) => ({ ...i, notes: e.target.value }))} /></div>
              </div>
              <QuantitySummary orderQuantity={orderQty} variantTotal={total} />
              {total !== orderQty && total > 0 ? <Button type="button" variant="ghost" size="sm" onClick={() => patchItem(it.id, (i) => ({ ...i, quantity: String(total) }))}>Set order quantity to {total}</Button> : null}
              <div role="tablist" aria-label="Variant editor view" className="inline-flex rounded-md border p-0.5 text-sm">
                {(["matrix", "list"] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-sm px-3 py-1 ${view === v ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-surface-muted"}`}>{v === "matrix" ? "Colour × size grid" : "List"}</button>)}
              </div>
              {view === "matrix" ? <QuantityMatrix rows={it.rows} sizes={sizes} colors={fabricColors} nextKey={() => ++seq} onChange={(rows) => patchItem(it.id, (i) => ({ ...i, rows }))} /> : null}
              {view === "list" ? (
              <div className="space-y-2" role="group" aria-label={`Variants of ${it.productName}`}>
                <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_6rem_2rem] gap-2 text-xs text-muted-foreground md:grid"><span>Size</span><span>Colour</span><span>Quantity</span><span /></div>
                {it.rows.map((r, i) => {
                  const e: { quantity?: string; kind?: string } = showErrors ? rowErr(r) : {};
                  return (
                    <div key={r.key} data-testid="variant-row" className="grid gap-2 rounded-md border p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_6rem_2rem] md:items-start md:border-0 md:p-0">
                      <div className="space-y-1">
                        <Select aria-label={`Variant ${i + 1} size`} value={r.size} onValueChange={(v) => patchRow(it.id, r.key, { size: v })} options={[{ value: NONE, label: "No size" }, ...sizes, { value: CUSTOM, label: "Custom size…" }]} />
                        {r.size === CUSTOM ? <Input aria-label={`Variant ${i + 1} custom size`} placeholder="Custom size" value={r.customSize} onChange={(ev) => patchRow(it.id, r.key, { customSize: ev.target.value })} /> : null}
                      </div>
                      <div className="space-y-1">
                        <Select aria-label={`Variant ${i + 1} colour`} value={r.color} onValueChange={(v) => patchRow(it.id, r.key, { color: v })} options={[{ value: NONE, label: "No colour" }, ...fabricColors.map((c) => ({ value: c.id, label: c.name })), { value: CUSTOM, label: "Custom colour…" }]} />
                        {r.color === CUSTOM ? (
                          <div className="grid grid-cols-3 gap-1">
                            <Input aria-label={`Variant ${i + 1} custom colour name`} placeholder="Name" value={r.customColor} onChange={(ev) => patchRow(it.id, r.key, { customColor: ev.target.value })} />
                            <Input aria-label={`Variant ${i + 1} pantone`} placeholder="Pantone" value={r.pantone} onChange={(ev) => patchRow(it.id, r.key, { pantone: ev.target.value })} />
                            <Input aria-label={`Variant ${i + 1} hex`} placeholder="#RRGGBB" value={r.hex} onChange={(ev) => patchRow(it.id, r.key, { hex: ev.target.value })} />
                          </div>
                        ) : r.color !== NONE ? <ColorSwatch name={fabricColors.find((c) => c.id === r.color)?.name ?? "Colour"} hex={fabricColors.find((c) => c.id === r.color)?.hex} size="sm" showLabel={false} /> : null}
                        {e.kind ? <p role="alert" className="text-xs text-danger">{e.kind}</p> : null}
                      </div>
                      <div><Input aria-label={`Variant ${i + 1} quantity`} inputMode="numeric" aria-invalid={!!e.quantity} value={r.quantity} onChange={(ev) => patchRow(it.id, r.key, { quantity: ev.target.value })} />{e.quantity ? <p role="alert" className="mt-1 text-xs text-danger">{e.quantity}</p> : null}</div>
                      <IconButton size="sm" label={`Remove variant ${i + 1}`} icon={<Trash2 />} onClick={() => patchItem(it.id, (x) => ({ ...x, rows: x.rows.filter((y) => y.key !== r.key) }))} />
                    </div>
                  );
                })}
                <Button type="button" variant="secondary" size="sm" onClick={() => patchItem(it.id, (x) => ({ ...x, rows: [...x.rows, { key: ++seq, size: NONE, customSize: "", color: NONE, customColor: "", pantone: "", hex: "", quantity: "" }] }))}><Plus /> Add variant</Button>
              </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
      <div className="flex items-center gap-3">
        <Button loading={save.isPending} disabled={!dirty || disabledExtra} onClick={() => void submit()}>{saveLabel}</Button>
        <span className="text-xs text-muted-foreground" aria-live="polite">{dirty ? "Unsaved changes" : "Saved"}. Totals are checked by the server when you confirm.</span>
      </div>
    </div>
  );
}

/** Read-only variant table for confirmed orders (frozen specification) with the per-variant counters. */
export function VariantsTable({ items }: { items: OrderItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((it) => (
        <Card key={it.id} aria-labelledby={`vi-${it.id}`}>
          <CardHeader><CardTitle><span id={`vi-${it.id}`}>{it.productName}</span></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <QuantitySummary orderQuantity={it.quantity} variantTotal={it.variantTotal} />
            {it.notes ? <p className="text-sm text-muted-foreground">{it.notes}</p> : null}
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm"><caption className="sr-only">Variants of {it.productName}</caption>
                <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1.5 text-start font-medium">Variant</th><th scope="col" className="text-end font-medium">Ordered</th><th scope="col" className="text-end font-medium">Allocated to batches</th><th scope="col" className="text-end font-medium">Completed</th><th scope="col" className="text-end font-medium">Rejected</th></tr></thead>
                <tbody>{it.variants.map((v) => (
                  <tr key={v.id} className="border-t"><th scope="row" className="py-1.5 text-start font-medium"><span className="inline-flex items-center gap-2">{v.colorName || v.customColorName ? <ColorSwatch name={v.colorName ?? v.customColorName ?? ""} hex={v.hex} size="sm" showLabel={false} /> : null}{v.label}</span></th>
                    <td className="text-end tabular-nums">{v.quantity}</td><td className="text-end tabular-nums">{v.allocatedQuantity}</td><td className="text-end tabular-nums">{v.completedQuantity}</td><td className="text-end tabular-nums">{v.rejectedQuantity}</td></tr>
                ))}</tbody></table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
