"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { PackagingReportBody } from "./types";

const NONE = "__none";
const whole = (v: string) => /^\d+$/.test(v.trim());

/** Pure: the POST body for a packaging report from the form's text fields (null = nothing to report / invalid). */
export function buildPackagingBody(f: { packed: string; damaged: string; cartons: string; variant: string; notes: string }): PackagingReportBody | null {
  if ([f.packed, f.damaged, f.cartons].some((v) => v.trim() !== "" && !whole(v))) return null;
  const packed = f.packed.trim() ? Number(f.packed) : 0;
  const damaged = f.damaged.trim() ? Number(f.damaged) : 0;
  if (packed + damaged === 0) return null;
  return { packedQuantity: packed, ...(damaged ? { damagedQuantity: damaged } : {}), ...(f.cartons.trim() && Number(f.cartons) ? { cartonCount: Number(f.cartons) } : {}), ...(f.variant && f.variant !== NONE ? { orderVariantId: f.variant } : {}), ...(f.notes.trim() ? { notes: f.notes.trim() } : {}) };
}

/** Packed / damaged / cartons report for a PACKAGING stage. Append-only; the backend refuses over-reporting and (before the spec exists) any report. */
export function PackagingReportForm({ variants, onReport }: { variants: Array<{ id: string; label: string }>; onReport: (b: PackagingReportBody) => Promise<unknown> }) {
  const [f, setF] = useState({ packed: "", damaged: "", cartons: "", variant: "", notes: "" });
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: (b: PackagingReportBody) => onReport(b) });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <form aria-label="Packaging report" className="space-y-2" data-testid="packaging-report-form" onSubmit={async (e) => {
      e.preventDefault(); setError(null);
      const body = buildPackagingBody(f);
      if (!body) { setError({ message: "Report at least one packed or damaged unit (whole numbers)." }); return; }
      try { await run.mutateAsync(body); setF({ packed: "", damaged: "", cartons: "", variant: "", notes: "" }); toast.success("Packaging reported"); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); }
    }}>
      {error ? <FormError {...error} /> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <FormField id="pk-packed" label="Packed (good)"><Input id="pk-packed" inputMode="numeric" value={f.packed} onChange={(e) => set({ packed: e.target.value })} /></FormField>
        <FormField id="pk-damaged" label="Damaged (scrapped)"><Input id="pk-damaged" inputMode="numeric" value={f.damaged} onChange={(e) => set({ damaged: e.target.value })} /></FormField>
        <FormField id="pk-cartons" label="Cartons filled"><Input id="pk-cartons" inputMode="numeric" value={f.cartons} onChange={(e) => set({ cartons: e.target.value })} /></FormField>
      </div>
      {variants.length ? <FormField id="pk-variant" label="Variant (optional)"><Select id="pk-variant" value={f.variant || NONE} onValueChange={(v) => set({ variant: v === NONE ? "" : v })} options={[{ value: NONE, label: "Not specified" }, ...variants.map((v) => ({ value: v.id, label: v.label }))]} /></FormField> : null}
      <FormField id="pk-notes" label="Notes"><Input id="pk-notes" value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></FormField>
      <Button type="submit" size="sm" loading={run.isPending}>Add packaging report</Button>
    </form>
  );
}
