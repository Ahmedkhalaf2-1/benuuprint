"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Eyebrow } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";
import { useBrands } from "./hooks";
import type { CustomerBrand } from "./types";

const DUPLICATE = "You already have an active brand with this name.";
const blank = (v: string | null | undefined) => v ?? "";
const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Create (no `initial`) or edit one of the customer's own brands. Creating is deliberately tiny: a name, with the rest folded
 * away. Only customer-editable fields are ever sent; ownership, status and numbering belong to the backend.
 */
export function BrandForm({ initial, onDone, onCancel, submitLabel }: { initial?: CustomerBrand; onDone: (b: CustomerBrand) => void; onCancel?: () => void; submitLabel?: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: blank(initial?.name), instagram: blank(initial?.instagram), website: blank(initial?.website), description: blank(initial?.description), primaryColor: blank(initial?.primaryColor), secondaryColor: blank(initial?.secondaryColor) });
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; primaryColor?: string; secondaryColor?: string }>({});
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const hasDetails = !!initial && !!(initial.instagram || initial.website || initial.description || initial.primaryColor || initial.secondaryColor);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const errs: typeof fieldErrors = {};
    if (!f.name.trim()) errs.name = "Enter your brand name";
    if (f.primaryColor.trim() && !HEX.test(f.primaryColor.trim())) errs.primaryColor = "Use a hex colour like #0B7A53";
    if (f.secondaryColor.trim() && !HEX.test(f.secondaryColor.trim())) errs.secondaryColor = "Use a hex colour like #0B7A53";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const t = (v: string) => v.trim();
      let saved: CustomerBrand;
      if (initial) { // an empty optional clears it
        const n = (v: string) => (t(v) === "" ? null : t(v));
        saved = await api.updateBrand(initial.id, { name: t(f.name), instagram: n(f.instagram), website: n(f.website), description: n(f.description), primaryColor: n(f.primaryColor), secondaryColor: n(f.secondaryColor) });
      } else {
        const o = (k: "instagram" | "website" | "description" | "primaryColor" | "secondaryColor") => (t(f[k]) ? { [k]: t(f[k]) } : {});
        saved = await api.createBrand({ name: t(f.name), ...o("instagram"), ...o("website"), ...o("description"), ...o("primaryColor"), ...o("secondaryColor") });
      }
      await qc.invalidateQueries({ queryKey: queryKeys.customer.brands });
      onDone(saved);
    } catch (err) {
      if (isApiError(err) && err.kind === "conflict") setFieldErrors({ name: DUPLICATE });
      else setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined });
    } finally { setBusy(false); }
  };
  return (
    <form className="space-y-4" noValidate onSubmit={submit} aria-label={initial ? "Edit brand" : "Create brand"}>
      {error ? <FormError {...error} /> : null}
      <FormField id="br-name" label="Brand name" required error={fieldErrors.name}>
        <Input id="br-name" autoComplete="organization" autoFocus={!initial} className="h-12" aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "br-name-error" : undefined} value={f.name} onChange={(e) => set({ name: e.target.value })} />
      </FormField>
      <details className="group rounded-md border bg-surface-sunken/40" open={hasDetails}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-sm font-medium text-muted-foreground hover:text-foreground">Add more details <span className="ms-1 font-normal">(optional)</span></summary>
        <div className="space-y-4 border-t px-3 py-4">
          <FormField id="br-ig" label="Instagram"><Input id="br-ig" autoCapitalize="none" placeholder="@yourbrand" value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} /></FormField>
          <FormField id="br-web" label="Website"><Input id="br-web" type="url" inputMode="url" autoCapitalize="none" placeholder="https://" value={f.website} onChange={(e) => set({ website: e.target.value })} /></FormField>
          <FormField id="br-desc" label="About the brand"><textarea id="br-desc" rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} className="w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="br-c1" label="Primary colour" error={fieldErrors.primaryColor}><Input id="br-c1" autoCapitalize="none" placeholder="#0B7A53" value={f.primaryColor} onChange={(e) => set({ primaryColor: e.target.value })} /></FormField>
            <FormField id="br-c2" label="Secondary colour" error={fieldErrors.secondaryColor}><Input id="br-c2" autoCapitalize="none" placeholder="#111111" value={f.secondaryColor} onChange={(e) => set({ secondaryColor: e.target.value })} /></FormField>
          </div>
        </div>
      </details>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? <Button type="button" variant="secondary" className="h-12 sm:h-10" onClick={onCancel}>Cancel</Button> : null}
        <Button type="submit" size="lg" className="h-12 w-full sm:h-10 sm:w-auto" loading={busy}>{busy ? "Saving…" : submitLabel ?? (initial ? "Save brand" : "Create brand")}</Button>
      </div>
    </form>
  );
}

export const startSampleHref = (brandId?: string) => (brandId ? `/account/samples/new?brandId=${encodeURIComponent(brandId)}` : "/account/samples/new");

/** The first thing a new customer sees: create the brand, then go straight into the first sample. */
export function FirstBrandCard({ created, onCreated }: { created: CustomerBrand | null; onCreated: (b: CustomerBrand) => void }) {
  return (
    <Card variant="action" className="p-5 sm:p-7" data-testid="first-brand">
      {created ? (
        <div className="space-y-4" role="status" data-testid="brand-created">
          <Eyebrow>Brand ready</Eyebrow>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{created.name} is ready</h2>
          <p className="text-muted-foreground">Your brand is set up. Now tell us what you want to make.</p>
          <Button asChild size="lg" className="h-12 w-full sm:w-auto"><Link href={startSampleHref(created.id)}>Start your first sample</Link></Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div><Eyebrow className="mb-2">Your first step</Eyebrow><h2 className="text-2xl font-semibold tracking-[-0.03em]">Create your brand</h2><p className="mt-1 text-muted-foreground">Before requesting a sample, add the brand you&apos;re manufacturing for.</p></div>
          <BrandForm onDone={onCreated} />
        </div>
      )}
    </Card>
  );
}

/** Lightweight management on the profile page: see, add and edit the customer's own brands. */
export function BrandsCard() {
  const q = useBrands();
  const [dlg, setDlg] = useState<CustomerBrand | "new" | null>(null);
  return (
    <Card>
      <CardHeader><CardTitle>Brands</CardTitle><Button size="sm" variant="secondary" onClick={() => setDlg("new")}><Plus aria-hidden className="size-4" />Add brand</Button></CardHeader>
      <CardContent>
        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-4" /> : q.data && q.data.length ? (
          <ul className="divide-y rounded-md border" data-testid="brands">{q.data.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-sm border bg-surface-sunken"><Tag className="size-4" style={{ color: b.primaryColor ?? undefined }} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{b.name}</span><span className="block truncate text-muted-foreground">{[b.brandNumber, b.instagram].filter(Boolean).join(" · ")}</span></span>
              <Button size="sm" variant="secondary" aria-label={`Edit ${b.name}`} onClick={() => setDlg(b)}>Edit</Button>
            </li>))}</ul>
        ) : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles aria-hidden className="size-4 text-brand" />No brands yet. Add the brand you manufacture for.</p>}
      </CardContent>
      {dlg ? (
        <Dialog open onOpenChange={(o) => !o && setDlg(null)}>
          <DialogContent title={dlg === "new" ? "Add a brand" : "Edit brand"} description={dlg === "new" ? "Another brand you manufacture for." : undefined} className="max-h-[90vh] max-w-lg overflow-y-auto">
            <BrandForm initial={dlg === "new" ? undefined : dlg} onCancel={() => setDlg(null)} onDone={() => { toast.success("Brand saved"); setDlg(null); }} />
          </DialogContent>
        </Dialog>
      ) : null}
    </Card>
  );
}
