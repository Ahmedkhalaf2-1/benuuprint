"use client";

import { Check, CircleHelp, Factory, LayoutGrid, Package, Paperclip, PencilLine, Plus, Ruler, Scissors, Shirt, Tag, Trash2, Truck, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { toast } from "sonner";
import { ChoiceGroup } from "@/components/forms/choice-group";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileDropzoneShell } from "@/components/ui/file-dropzone-shell";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import * as api from "./api";
import { fabricBody, fabricProblems, fabricState, fabricsFor, notesBody, notesState, patternsFor, productBody, productProblems, productState, sizeBody, sizeState, type FabricState, type NotesState, type ProductState, type SizeState } from "./builders";
import { FILE_TYPE_LABELS, FileDownloadButton } from "./files";
import { FIT_LABELS, PROVIDER_LABELS, SIDE_LABELS, UNIT_LABELS } from "./labels";
import { GarmentPreview } from "@/features/public-site/garment";
import { BrandForm } from "./brands";
import { useBrands } from "./hooks";
import { Chip, FileTile, GroupCard, StepHeader, Swatch, garmentKindFor } from "./wizard-ui";
import type { StepKey } from "./wizard-config";
import { FILE_TYPES, type FileType, type SampleBody, type SampleDetail, type SampleOptions } from "./types";

/** Each form step registers whether it has unsaved edits and how to save them, so leaving a step never silently drops input. */
export interface StepHandle { dirty: boolean; save: () => Promise<boolean> }
export type StepReg = MutableRefObject<StepHandle | null>;
export interface StepProps { sample: SampleDetail; options: SampleOptions; stepRef: StepReg; patch: (body: SampleBody) => Promise<unknown>; changed: () => void }
type Err = { message: string; requestId?: string };

function useStepForm<T>(initial: T, stepRef: StepReg, run: (f: T) => Promise<void>, problems?: (f: T) => string[]) {
  const [f, setF] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<Err | null>(null);
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  const save = async () => {
    setError(null);
    const p = problems?.(f) ?? [];
    if (p.length) { setError({ message: p.join(". ") }); return false; }
    try { await run(f); setSaved(f); return true; } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); return false; }
  };
  const latest = useRef(save);
  useEffect(() => { latest.current = save; });
  useEffect(() => { stepRef.current = { dirty, save: () => latest.current() }; return () => { stepRef.current = null; }; }, [dirty, stepRef]);
  return { f, set: (p: Partial<T>) => setF((x) => ({ ...x, ...p })), error, setError, dirty };
}


const Section = ({ stepKey, children }: { stepKey: StepKey; children: ReactNode }) => (
  <section className="space-y-7"><StepHeader stepKey={stepKey} />{children}</section>
);

/** Two clearly separated paths (catalogue vs. something of your own), shown as large selectable cards. */
function ModeToggle({ value, onChange, labels, name, hints }: { value: "catalog" | "custom"; onChange: (v: "catalog" | "custom") => void; labels: [string, string]; name: string; hints?: [string, string] }) {
  return <ChoiceGroup name={name} aria-label={name} value={value} onValueChange={onChange} options={[{ value: "catalog", label: labels[0], description: hints?.[0], icon: <LayoutGrid className="size-5 text-brand" /> }, { value: "custom", label: labels[1], description: hints?.[1], icon: <PencilLine className="size-5 text-brand" /> }]} />;
}

const rangeText = (min: number | null, max: number | null) => (min || max ? `${min ?? "…"}–${max ?? "…"} g/m²` : null);

/* ------------------------------ 1. brand ------------------------------ */
export function BrandStep({ sample, patch, stepRef }: StepProps) {
  const brands = useBrands();
  const form = useStepForm({ brandId: sample.brand.id }, stepRef, async (f) => { if (f.brandId !== sample.brand.id) await patch({ brandId: f.brandId }); });
  return (
    <Section stepKey="brand">
      {form.error ? <FormError {...form.error} /> : null}
      {brands.data && brands.data.length === 0 ? (
        <div className="space-y-3" data-testid="no-brand"><p className="text-sm text-muted-foreground">Add the brand you&apos;re manufacturing for.</p><BrandForm onDone={(b) => form.set({ brandId: b.id })} /></div>
      ) : (
        <ChoiceGroup name="brand" aria-label="Brand" value={form.f.brandId} onValueChange={(v) => form.set({ brandId: v })} columns={2} options={(brands.data ?? []).map((b) => ({
          value: b.id, label: b.name, description: [b.brandNumber, b.instagram].filter(Boolean).join(" · "),
          icon: <span className="flex size-10 items-center justify-center rounded-sm border bg-surface-sunken"><Tag className="size-4" style={{ color: b.primaryColor ?? undefined }} /></span>,
          extra: b.description ? <span className="line-clamp-2 text-xs text-muted-foreground">{b.description}</span> : undefined,
        }))} />
      )}
    </Section>
  );
}

/* ----------------------------- 2. product ----------------------------- */
export function ProductStep({ sample, options, patch, stepRef }: StepProps) {
  const form = useStepForm<ProductState>(productState(sample), stepRef, async (f) => { await patch(productBody(f)); }, productProblems);
  const { f } = form;
  return (
    <Section stepKey="product">
      {form.error ? <FormError {...form.error} /> : null}
      <ModeToggle name="Product source" value={f.mode} onChange={(mode) => form.set({ mode })} labels={["From the Benue Print catalogue", "Something else — I'll describe it"]} hints={["Pick a product we already make.", "Tell us about a product that isn't listed."]} />
      {f.mode === "catalog" ? (
        <GroupCard icon={<Shirt />} title="Choose a product">
          <ChoiceGroup name="product-type" aria-label="Product" value={f.productTypeId} onValueChange={(v) => form.set({ productTypeId: v })} columns={3} options={options.productTypes.map((p) => ({ value: p.id, label: p.name, description: p.description ?? undefined, icon: <span className="block size-14"><GarmentPreview productType={garmentKindFor(p.name)} colour="#2b302e" fabric="jersey" /></span> }))} />
        </GroupCard>
      ) : (
        <GroupCard icon={<PencilLine />} title="Describe your product" help="A name and anything that helps us understand it.">
          <FormField id="pr-name" label="Product name" required><Input id="pr-name" value={f.customName} onChange={(e) => form.set({ customName: e.target.value })} placeholder="e.g. Oversized hoodie" /></FormField>
          <FormField id="pr-desc" label="Describe it" hint="Anything that helps us understand the product."><Textarea id="pr-desc" rows={4} value={f.customDescription} onChange={(e) => form.set({ customDescription: e.target.value })} /></FormField>
        </GroupCard>
      )}
    </Section>
  );
}

/* ------------------------- 3. fabric & colour ------------------------- */
const PROVIDER_ICON: Record<string, ReactNode> = { BENUE_PRINT: <Factory className="size-5 text-brand" />, CUSTOMER: <Truck className="size-5 text-brand" />, NOT_DECIDED: <CircleHelp className="size-5 text-brand" /> };

export function FabricStep({ sample, options, patch, stepRef }: StepProps) {
  const form = useStepForm<FabricState>(fabricState(sample), stepRef, async (f) => { await patch(fabricBody(f)); }, fabricProblems);
  const { f } = form;
  const fabrics = useMemo(() => fabricsFor(options, sample.productTypeId), [options, sample.productTypeId]);
  const fabric = options.fabrics.find((x) => x.id === f.fabricId);
  const colours = fabric?.colors ?? [];
  const range = fabric && (fabric.minGsm || fabric.maxGsm) ? `Usually ${fabric.minGsm ?? "…"}–${fabric.maxGsm ?? "…"} g/m².` : undefined;
  const recommended = (id: string) => options.fabrics.find((x) => x.id === id)?.productTypes.find((p) => p.productTypeId === sample.productTypeId)?.isRecommended;
  return (
    <Section stepKey="fabric">
      {form.error ? <FormError {...form.error} /> : null}
      <GroupCard icon={<Truck />} title="Who supplies the fabric?">
        <ChoiceGroup name="provider" aria-label="Who supplies the fabric" value={f.provider} onValueChange={(v) => form.set({ provider: v })} columns={3} options={options.fabricProviders.map((p) => ({ value: p.value, label: PROVIDER_LABELS[p.value]?.label ?? p.value, description: PROVIDER_LABELS[p.value]?.help, icon: PROVIDER_ICON[p.value] }))} />
      </GroupCard>
      <GroupCard icon={<Shirt />} title="Fabric">
        <ModeToggle name="Fabric source" value={f.fabricMode} onChange={(fabricMode) => form.set({ fabricMode, ...(fabricMode === "custom" ? { colorMode: "custom" as const, fabricColorId: "" } : {}) })} labels={["From the Benue Print catalogue", "My own fabric — I'll describe it"]} />
        {f.fabricMode === "catalog" ? (
          <ChoiceGroup name="fabric-choice" aria-label="Fabric" value={f.fabricId} onValueChange={(v) => form.set({ fabricId: v, fabricColorId: "", colorMode: "catalog" })} columns={2} options={fabrics.map((x) => ({
            value: x.id, label: x.name, description: x.composition ?? undefined,
            extra: <span className="flex flex-wrap gap-1.5">{rangeText(x.minGsm, x.maxGsm) ? <Chip>{rangeText(x.minGsm, x.maxGsm)}</Chip> : null}{recommended(x.id) ? <Chip tone="brand">Recommended</Chip> : null}{x.colors.length ? <Chip>{x.colors.length} {x.colors.length === 1 ? "colour" : "colours"}</Chip> : null}</span>,
          }))} />
        ) : (
          <div className="space-y-4">
            <FormField id="fb-cname" label="Fabric name" required><Input id="fb-cname" value={f.customFabricName} onChange={(e) => form.set({ customFabricName: e.target.value })} /></FormField>
            <FormField id="fb-cdesc" label="Describe the fabric"><Textarea id="fb-cdesc" rows={3} value={f.customFabricDescription} onChange={(e) => form.set({ customFabricDescription: e.target.value })} /></FormField>
          </div>
        )}
      </GroupCard>
      <GroupCard icon={<span className="size-3.5 rounded-full border bg-brand" />} title="Colour" help={f.fabricMode === "catalog" && f.colorMode === "catalog" && colours.length ? "Pick one of this fabric's colours." : undefined}>
        {f.fabricMode === "catalog" && colours.length > 0 ? <ModeToggle name="Colour source" value={f.colorMode} onChange={(colorMode) => form.set({ colorMode })} labels={["Pick from this fabric's colours", "A different colour"]} /> : null}
        {f.fabricMode === "catalog" && f.colorMode === "catalog" ? (
          colours.length === 0 ? <p className="text-sm text-muted-foreground">{f.fabricId ? "This fabric has no listed colours — choose “A different colour”." : "Choose a fabric first to see its colours."}</p> : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" role="radiogroup" aria-label="Fabric colour">{colours.map((c) => {
              const on = f.fabricColorId === c.id;
              return (
                <li key={c.id}><button type="button" role="radio" aria-checked={on} onClick={() => form.set({ fabricColorId: c.id })} className={cn("relative flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-md border bg-surface p-2 text-center text-sm transition-colors hover:border-border-strong active:scale-[0.97]", on && "border-brand bg-brand-soft/50 shadow-[inset_0_2px_0_var(--brand)]")}>
                  <span className="relative"><Swatch hex={c.hex} size="lg" className={cn(on && "ring-2 ring-brand ring-offset-2 ring-offset-surface")} />{on ? <span aria-hidden className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand-fill text-white"><Check className="size-3" /></span> : null}</span>
                  <span className={cn("leading-tight", on && "font-semibold")}>{c.name}</span>{c.pantone ? <span className="text-[0.6875rem] text-muted-foreground">{c.pantone}</span> : null}</button></li>
              );
            })}</ul>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="fb-colname" label="Colour name"><Input id="fb-colname" value={f.customColorName} onChange={(e) => form.set({ customColorName: e.target.value })} placeholder="e.g. Navy blue" /></FormField>
            <FormField id="fb-pantone" label="Pantone (if you know it)"><Input id="fb-pantone" value={f.customPantone} onChange={(e) => form.set({ customPantone: e.target.value })} /></FormField>
            <FormField id="fb-hex" label="Colour code" hint="Like #1A2B3C (optional)"><div className="flex items-center gap-2"><Input id="fb-hex" value={f.customHex} onChange={(e) => form.set({ customHex: e.target.value })} placeholder="#1A2B3C" /><Swatch hex={f.customHex} size="lg" /></div></FormField>
          </div>
        )}
      </GroupCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="fb-gsm" label="Fabric weight (optional)" hint={`Fabric weight in grams per square metre. ${range ?? ""}`.trim()}><Input id="fb-gsm" className="max-w-40" inputMode="decimal" value={f.gsm} onChange={(e) => form.set({ gsm: e.target.value })} placeholder={fabric?.defaultGsm ? String(fabric.defaultGsm) : "e.g. 220"} /></FormField>
        <FormField id="fb-notes" label="Anything else about the fabric?"><Textarea id="fb-notes" rows={3} value={f.fabricNotes} onChange={(e) => form.set({ fabricNotes: e.target.value })} /></FormField>
      </div>
    </Section>
  );
}

/* --------------------------- 4. size & fit --------------------------- */
const FIT_ICON: Record<string, ReactNode> = { BENUE_PATTERN: <Scissors className="size-5 text-brand" />, COPY_CUSTOMER_PIECE: <Shirt className="size-5 text-brand" />, CUSTOM_SIZE_CHART: <Ruler className="size-5 text-brand" />, NOT_SURE: <CircleHelp className="size-5 text-brand" /> };

export function SizeStep({ sample, options, patch, stepRef }: StepProps) {
  const form = useStepForm<SizeState>(sizeState(sample), stepRef, async (f) => { await patch(sizeBody(f)); });
  const { f } = form;
  const patterns = patternsFor(options, sample.productTypeId);
  const sizes = options.sizeScales.flatMap((sc) => sc.sizes.map((z) => ({ value: z.id, label: options.sizeScales.length > 1 ? `${sc.name} · ${z.name}` : z.name })));
  const selectedSize = sizes.find((z) => z.value === f.sizeId);
  const pattern = patterns.find((p) => p.patternVersionId === f.patternVersionId);
  return (
    <Section stepKey="size">
      {form.error ? <FormError {...form.error} /> : null}
      <GroupCard icon={<Ruler />} title="Sample size" help="The size we will make for your sample.">
        <p className="text-sm" aria-live="polite" data-testid="selected-size"><span className="text-muted-foreground">Selected: </span>{selectedSize ? <span className="text-2xl font-semibold tracking-tight">{selectedSize.label}</span> : <span className="text-muted-foreground">none yet</span>}</p>
        <ul role="radiogroup" aria-label="Sample size" className="flex flex-wrap gap-2">{sizes.map((z) => {
          const on = f.sizeId === z.value;
          return <li key={z.value}><button type="button" role="radio" aria-checked={on} onClick={() => form.set({ sizeId: z.value })} className={cn("h-11 min-w-14 rounded-md border bg-surface px-4 text-sm font-medium transition-colors hover:border-border-strong active:scale-[0.97]", on && "border-brand bg-brand-soft/50 text-foreground shadow-[inset_0_-2px_0_var(--brand)]")}>{z.label}</button></li>;
        })}</ul>
      </GroupCard>
      <GroupCard icon={<Scissors />} title="How should it fit?">
        <ChoiceGroup name="fit" aria-label="How should it fit" value={f.fitMethod} onValueChange={(v) => form.set({ fitMethod: v })} columns={2} options={options.fitMethods.map((m) => ({ value: m.value, label: FIT_LABELS[m.value]?.label ?? m.value, description: FIT_LABELS[m.value]?.help, icon: FIT_ICON[m.value] }))} />
        {f.fitMethod === "BENUE_PATTERN" ? (
          <div className="space-y-3">
            <FormField id="sz-pattern" label="Pattern" hint={patterns.length === 0 ? "No ready-made patterns for this product — we can choose one for you." : undefined}>
              <Select id="sz-pattern" value={f.patternVersionId || undefined} onValueChange={(v) => form.set({ patternVersionId: v })} placeholder="Choose a pattern" options={patterns.map((p) => ({ value: p.patternVersionId, label: `${p.name}${p.fitType ? ` — ${p.fitType}` : ""}` }))} />
            </FormField>
            {pattern ? <div className="flex items-center gap-3 rounded-md border border-brand/35 bg-brand-soft/40 p-3 text-sm" data-testid="pattern-summary"><Scissors aria-hidden className="size-4 text-brand" /><span className="font-medium">{pattern.name}</span>{pattern.fitType ? <Chip>{pattern.fitType}</Chip> : null}</div> : null}
          </div>
        ) : null}
        {f.fitMethod === "CUSTOM_SIZE_CHART" ? <p className="rounded-md border bg-surface-sunken px-3 py-2 text-sm">Upload your size chart in the <strong>Artwork &amp; files</strong> step.</p> : null}
      </GroupCard>
      <FormField id="sz-notes" label="Anything about the fit? (optional)"><Textarea id="sz-notes" rows={3} value={f.fitNotes} onChange={(e) => form.set({ fitNotes: e.target.value })} /></FormField>
    </Section>
  );
}

/* ---------------------------- 5. decoration --------------------------- */
interface DecoForm { id?: string; printMethodId: string; placement: string; side: string; width: string; height: string; unit: string; colorCount: string; notes: string; artworkRequired: boolean }
const emptyDeco: DecoForm = { printMethodId: "", placement: "", side: "FRONT", width: "", height: "", unit: "CM", colorCount: "", notes: "", artworkRequired: false };
const num = (v: string) => (v.trim() === "" ? null : Number(v));

function DecorationDialog({ sample, options, initial, onClose, onSaved }: { sample: SampleDetail; options: SampleOptions; initial: DecoForm; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState<Err | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<DecoForm>) => setF((x) => ({ ...x, ...p }));
  const submit = async () => {
    setError(null);
    if (!f.printMethodId) return setError({ message: "Choose how it should be decorated (print, embroidery…)." });
    if (!f.placement.trim()) return setError({ message: "Say where it goes, e.g. “Centre chest”." });
    if ([f.width, f.height, f.colorCount].some((v) => v.trim() !== "" && !(Number(v) > 0))) return setError({ message: "Sizes and colours must be positive numbers." });
    const body: api.DecorationBody = { printMethodId: f.printMethodId, placement: f.placement.trim(), side: f.side, ...(f.width || f.height ? { unit: f.unit } : {}), width: num(f.width), height: num(f.height), colorCount: num(f.colorCount), notes: f.notes.trim() || null, artworkRequired: f.artworkRequired };
    setBusy(true);
    try {
      if (f.id) await api.updateDecoration(sample.id, f.id, body);
      else await api.addDecoration(sample.id, { ...body, printMethodId: f.printMethodId, placement: f.placement.trim() });
      onSaved(); onClose();
    } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title={f.id ? "Edit decoration" : "Add a decoration"} description="Where should something be printed or embroidered?" className="max-h-[90vh] max-w-lg overflow-y-auto">
        <div className="space-y-4">
          {error ? <FormError {...error} /> : null}
          <FormField id="dc-method" label="How?" required><Select id="dc-method" value={f.printMethodId || undefined} onValueChange={(v) => set({ printMethodId: v })} placeholder="Print, embroidery…" options={options.printMethods.map((m) => ({ value: m.id, label: m.name }))} /></FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="dc-place" label="Where?" required><Input id="dc-place" value={f.placement} onChange={(e) => set({ placement: e.target.value })} placeholder="e.g. Centre chest" /></FormField>
            <FormField id="dc-side" label="Which side?"><Select id="dc-side" value={f.side} onValueChange={(v) => set({ side: v })} options={options.decorationSides.map((s) => ({ value: s.value, label: SIDE_LABELS[s.value] ?? s.value }))} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField id="dc-w" label="Width"><Input id="dc-w" inputMode="decimal" value={f.width} onChange={(e) => set({ width: e.target.value })} /></FormField>
            <FormField id="dc-h" label="Height"><Input id="dc-h" inputMode="decimal" value={f.height} onChange={(e) => set({ height: e.target.value })} /></FormField>
            <FormField id="dc-u" label="Unit"><Select id="dc-u" value={f.unit} onValueChange={(v) => set({ unit: v })} options={options.measurementUnits.map((u) => ({ value: u.value, label: UNIT_LABELS[u.value] ?? u.value }))} /></FormField>
          </div>
          <FormField id="dc-cc" label="Number of colours (optional)"><Input id="dc-cc" className="max-w-32" inputMode="numeric" value={f.colorCount} onChange={(e) => set({ colorCount: e.target.value })} /></FormField>
          <FormField id="dc-notes" label="Notes"><Textarea id="dc-notes" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></FormField>
          <div className="flex items-center gap-2"><Checkbox id="dc-art" checked={f.artworkRequired} onCheckedChange={(c) => set({ artworkRequired: c === true })} /><Label htmlFor="dc-art" className="font-normal">I will upload artwork for this</Label></div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={() => void submit()}>{f.id ? "Save decoration" : "Add decoration"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export function DecorationStep({ sample, options, patch, stepRef, changed }: StepProps) {
  const [dlg, setDlg] = useState<DecoForm | null>(null);
  const [error, setError] = useState<Err | null>(null);
  const form = useStepForm({ printNotes: sample.printNotes ?? "" }, stepRef, async (f) => { await patch({ printNotes: f.printNotes.trim() || null }); });
  return (
    <Section stepKey="decoration">
      {error ? <FormError {...error} /> : null}{form.error ? <FormError {...form.error} /> : null}
      {sample.decorations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-surface-sunken/60 px-6 py-10 text-center" data-testid="decorations-empty">
          <span aria-hidden className="flex size-11 items-center justify-center rounded-sm border bg-surface text-muted-foreground"><Paperclip className="size-5" /></span>
          <div><p className="font-semibold">No printing or embroidery added yet.</p><p className="mt-1 text-sm text-muted-foreground">Add one for every place something should be printed or embroidered.</p></div>
          <Button onClick={() => setDlg(emptyDeco)}><Plus /> Add decoration</Button>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 lg:grid-cols-2" data-testid="wizard-decorations">{sample.decorations.map((d) => (
            <li key={d.id} className="bp-enter-item space-y-3 rounded-lg border bg-surface p-4 text-sm">
              <div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand">{d.printMethod.name}</p><p className="mt-0.5 text-base font-semibold">{d.placement}</p></div>
                <span className="flex gap-1"><Button size="sm" variant="secondary" onClick={() => setDlg({ id: d.id, printMethodId: d.printMethod.id, placement: d.placement, side: d.side, width: d.width ?? "", height: d.height ?? "", unit: d.unit ?? "CM", colorCount: d.colorCount ? String(d.colorCount) : "", notes: d.notes ?? "", artworkRequired: d.artworkRequired })}>Edit</Button>
                  <IconButton size="sm" label={`Remove ${d.printMethod.name} ${d.placement}`} icon={<Trash2 />} onClick={async () => { try { await api.removeDecoration(sample.id, d.id); changed(); } catch (e) { setError({ message: errorMessage(e) }); } }} /></span></div>
              <div className="flex flex-wrap gap-1.5"><Chip>{SIDE_LABELS[d.side] ?? d.side}</Chip>{d.width && d.height ? <Chip>{d.width} × {d.height} {d.unit ? UNIT_LABELS[d.unit] ?? d.unit : ""}</Chip> : null}{d.colorCount ? <Chip>{d.colorCount} {d.colorCount === 1 ? "colour" : "colours"}</Chip> : null}{d.artwork ? <Chip tone="brand">Artwork: {d.artwork.name}</Chip> : d.artworkRequired ? <Chip tone="warning">Artwork needed</Chip> : null}</div>
              {d.notes ? <p className="text-muted-foreground">{d.notes}</p> : null}
            </li>))}</ul>
          <Button variant="secondary" onClick={() => setDlg(emptyDeco)}><Plus /> Add a decoration</Button>
        </>
      )}
      <FormField id="dc-printnotes" label="Anything else about the printing?"><Textarea id="dc-printnotes" rows={3} value={form.f.printNotes} onChange={(e) => form.set({ printNotes: e.target.value })} /></FormField>
      {dlg ? <DecorationDialog sample={sample} options={options} initial={dlg} onClose={() => setDlg(null)} onSaved={changed} /> : null}
    </Section>
  );
}

/* ----------------- 6. accessories, labels and packaging ---------------- */
const isPackaging = (category: string | null | undefined) => /packag/i.test(category ?? "");

function AddedItem({ title, tags, notes, removeLabel, onRemove }: { title: string; tags?: ReactNode; notes?: string | null; removeLabel: string; onRemove: () => void }) {
  return (
    <li className="bp-enter-item flex items-start justify-between gap-3 rounded-md border bg-surface p-3 text-sm">
      <span className="min-w-0"><span className="block font-medium">{title}</span>{tags ? <span className="mt-1 flex flex-wrap gap-1.5">{tags}</span> : null}{notes ? <span className="mt-1 block text-muted-foreground">{notes}</span> : null}</span>
      <IconButton size="sm" label={removeLabel} icon={<Trash2 />} onClick={onRemove} />
    </li>
  );
}

export function ExtrasStep({ sample, options, changed }: StepProps) {
  const [error, setError] = useState<Err | null>(null);
  const [acc, setAcc] = useState({ mode: "catalog" as "catalog" | "custom", id: "", custom: "", qty: "", notes: "" });
  const [cmp, setCmp] = useState({ mode: "catalog" as "catalog" | "custom", id: "", custom: "", notes: "" });
  const [open, setOpen] = useState<null | "acc" | "trim" | "pack">(null);
  const run = async (fn: () => Promise<unknown>, reset: () => void) => { setError(null); try { await fn(); reset(); setOpen(null); changed(); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); } };
  const trimOptions = options.components.filter((c) => !isPackaging(c.category));
  const packOptions = options.components.filter((c) => isPackaging(c.category));
  const trimItems = sample.components.filter((c) => !isPackaging(c.category));
  const packItems = sample.components.filter((c) => isPackaging(c.category));

  const componentForm = (kind: "trim" | "pack", opts: typeof options.components) => (
    <div className="bp-enter-item space-y-3 rounded-md border bg-surface-sunken/60 p-3">
      <ModeToggle name={kind === "pack" ? "Packaging source" : "Label source"} value={cmp.mode} onChange={(mode) => setCmp({ ...cmp, mode })} labels={["From the catalogue", "Something else"]} />
      {cmp.mode === "catalog" ? <FormField id={`cp-sel-${kind}`} label={kind === "pack" ? "Packaging" : "Label or trim"}><Select id={`cp-sel-${kind}`} value={cmp.id || undefined} onValueChange={(v) => setCmp({ ...cmp, id: v })} placeholder="Choose" options={opts.map((c) => ({ value: c.id, label: `${c.name}${c.category ? ` (${c.category})` : ""}` }))} /></FormField> : <FormField id={`cp-cust-${kind}`} label="What is it?"><Input id={`cp-cust-${kind}`} value={cmp.custom} onChange={(e) => setCmp({ ...cmp, custom: e.target.value })} /></FormField>}
      <FormField id={`cp-notes-${kind}`} label="Notes"><Input id={`cp-notes-${kind}`} value={cmp.notes} onChange={(e) => setCmp({ ...cmp, notes: e.target.value })} /></FormField>
      <div className="flex gap-2"><Button variant="secondary" disabled={cmp.mode === "catalog" ? !cmp.id : !cmp.custom.trim()} onClick={() => void run(() => api.addComponent(sample.id, { ...(cmp.mode === "catalog" ? { componentOptionId: cmp.id } : { customName: cmp.custom.trim() }), ...(cmp.notes.trim() ? { notes: cmp.notes.trim() } : {}) }), () => setCmp({ mode: "catalog", id: "", custom: "", notes: "" }))}><Plus /> {kind === "pack" ? "Add packaging" : "Add label or trim"}</Button><Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button></div>
    </div>
  );
  const componentList = (items: typeof sample.components, testId: string) => items.length ? (
    <ul className="space-y-2" data-testid={testId}>{items.map((c) => <AddedItem key={c.id} title={c.componentOption?.name ?? c.customName ?? ""} tags={c.category ? <Chip>{c.category}</Chip> : undefined} notes={c.notes} removeLabel={`Remove ${c.componentOption?.name ?? c.customName}`} onRemove={() => void run(() => api.removeComponent(sample.id, c.id), () => undefined)} />)}</ul>
  ) : null;

  return (
    <Section stepKey="extras">
      {error ? <FormError {...error} /> : null}
      <GroupCard icon={<Paperclip />} title="Accessories" help="Zips, buttons and similar extras.">
        {sample.accessories.length ? <ul className="space-y-2" data-testid="wizard-accessories">{sample.accessories.map((a) => <AddedItem key={a.id} title={a.accessory?.name ?? a.customName ?? ""} tags={a.quantity ? <Chip tone="brand">× {a.quantity}</Chip> : undefined} notes={a.notes} removeLabel={`Remove ${a.accessory?.name ?? a.customName}`} onRemove={() => void run(() => api.removeAccessory(sample.id, a.id), () => undefined)} />)}</ul> : <p className="text-sm text-muted-foreground">None added.</p>}
        {open === "acc" ? (
          <div className="bp-enter-item space-y-3 rounded-md border bg-surface-sunken/60 p-3">
            <ModeToggle name="Accessory source" value={acc.mode} onChange={(mode) => setAcc({ ...acc, mode })} labels={["From the catalogue", "Something else"]} />
            <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
              {acc.mode === "catalog" ? <FormField id="ac-sel" label="Accessory"><Select id="ac-sel" value={acc.id || undefined} onValueChange={(v) => setAcc({ ...acc, id: v })} placeholder="Choose" options={options.accessories.map((a) => ({ value: a.id, label: a.name }))} /></FormField> : <FormField id="ac-cust" label="What is it?"><Input id="ac-cust" value={acc.custom} onChange={(e) => setAcc({ ...acc, custom: e.target.value })} /></FormField>}
              <FormField id="ac-qty" label="How many"><Input id="ac-qty" inputMode="numeric" value={acc.qty} onChange={(e) => setAcc({ ...acc, qty: e.target.value })} /></FormField>
            </div>
            <FormField id="ac-notes" label="Notes"><Input id="ac-notes" value={acc.notes} onChange={(e) => setAcc({ ...acc, notes: e.target.value })} /></FormField>
            <div className="flex gap-2"><Button variant="secondary" disabled={acc.mode === "catalog" ? !acc.id : !acc.custom.trim()} onClick={() => void run(() => api.addAccessory(sample.id, { ...(acc.mode === "catalog" ? { accessoryId: acc.id } : { customName: acc.custom.trim() }), ...(/^\d+$/.test(acc.qty) && Number(acc.qty) > 0 ? { quantity: Number(acc.qty) } : {}), ...(acc.notes.trim() ? { notes: acc.notes.trim() } : {}) }), () => setAcc({ mode: "catalog", id: "", custom: "", qty: "", notes: "" }))}><Plus /> Add accessory</Button><Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button></div>
          </div>
        ) : <div><Button variant="secondary" onClick={() => setOpen("acc")}><Plus /> Add an accessory</Button></div>}
      </GroupCard>

      <GroupCard icon={<Tag />} title="Labels and trims" help="Neck labels, care labels, hang tags and similar.">
        {trimItems.length ? componentList(trimItems, "wizard-components") : <p className="text-sm text-muted-foreground">None added.</p>}
        {open === "trim" ? componentForm("trim", trimOptions.length ? trimOptions : options.components) : <div><Button variant="secondary" onClick={() => setOpen("trim")}><Plus /> Add a label or trim</Button></div>}
      </GroupCard>

      {packOptions.length > 0 || packItems.length > 0 ? (
        <GroupCard icon={<Package />} title="Packaging" help="How the finished garment is packed.">
          {packItems.length ? componentList(packItems, "wizard-packaging") : <p className="text-sm text-muted-foreground">None added.</p>}
          {open === "pack" ? componentForm("pack", packOptions) : <div><Button variant="secondary" onClick={() => setOpen("pack")}><Plus /> Add packaging</Button></div>}
        </GroupCard>
      ) : null}
    </Section>
  );
}

/* --------------------------- 7. artwork & files --------------------------- */
const FILE_GROUP_ORDER: FileType[] = ["ARTWORK", "REFERENCE", "SIZE_CHART", "OTHER"];

export function FilesStep({ sample, changed }: StepProps) {
  const [type, setType] = useState<FileType>(sample.fitMethod === "CUSTOM_SIZE_CHART" && !sample.files.some((f) => f.type === "SIZE_CHART") ? "SIZE_CHART" : "REFERENCE");
  const [description, setDescription] = useState("");
  const [decorationId, setDecorationId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<Err | null>(null);
  const groups = FILE_GROUP_ORDER.map((t) => [t, sample.files.filter((f) => f.type === t)] as const).filter(([, list]) => list.length > 0);
  return (
    <Section stepKey="files">
      {error ? <FormError {...error} /> : null}
      <GroupCard icon={<UploadCloud />} title="Add a file" help="PNG, JPEG, GIF, WebP or PDF.">
        <FormField id="fl-type" label="What are you uploading?">
          <ul role="radiogroup" aria-label="What are you uploading" id="fl-type" className="flex flex-wrap gap-2">{FILE_TYPES.map((t) => <li key={t}><button type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)} className={cn("h-11 rounded-md border bg-surface px-4 text-sm font-medium transition-colors hover:border-border-strong active:scale-[0.97]", type === t && "border-brand bg-brand-soft/50 shadow-[inset_0_-2px_0_var(--brand)]")}>{FILE_TYPE_LABELS[t]}</button></li>)}</ul>
        </FormField>
        {type === "ARTWORK" && sample.decorations.length ? <FormField id="fl-deco" label="Which print is this for?" hint="Optional"><Select id="fl-deco" value={decorationId || "__none"} onValueChange={(v) => setDecorationId(v === "__none" ? "" : v)} options={[{ value: "__none", label: "Not linked to a print" }, ...sample.decorations.map((d) => ({ value: d.id, label: `${d.printMethod.name} · ${d.placement}` }))]} /></FormField> : null}
        <FormField id="fl-desc" label="Short description (optional)"><Input id="fl-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
        <FileDropzoneShell hint="Drop a file here or click to choose" disabled={!!busy} accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" onFiles={async ([file]) => {
          if (!file) return;
          setError(null); setBusy(file.name);
          try { await api.uploadFile(sample.id, file, type, { ...(description.trim() ? { description: description.trim() } : {}), ...(type === "ARTWORK" && decorationId ? { decorationId } : {}) }); setDescription(""); toast.success("File uploaded"); changed(); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); } finally { setBusy(null); }
        }} />
        {busy ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><span aria-hidden className="size-2 animate-pulse rounded-full bg-brand" />Uploading {busy}…</p> : null}
      </GroupCard>
      {sample.files.length === 0 ? <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No files yet.</p> : (
        <div className="space-y-5" data-testid="wizard-files">{groups.map(([t, list]) => (
          <section key={t} aria-label={`${FILE_TYPE_LABELS[t]} files`}>
            <h3 className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">{FILE_TYPE_LABELS[t]} · {list.length}</h3>
            <ul className="grid gap-2 lg:grid-cols-2">{list.map((f) => (
              <FileTile key={f.attachmentId} name={f.originalName} mime={f.mimeType} sizeBytes={f.sizeBytes} typeLabel={FILE_TYPE_LABELS[f.type] ?? f.type} status="Uploaded" actions={<>
                <FileDownloadButton sampleId={sample.id} attachmentId={f.attachmentId} name={f.originalName} />
                <Button size="sm" variant="ghost" aria-label={`Remove ${f.originalName} from this request`} onClick={async () => { try { await api.removeFile(sample.id, f.attachmentId); changed(); } catch (e) { setError({ message: errorMessage(e) }); } }}>Remove</Button></>} />
            ))}</ul>
          </section>
        ))}</div>
      )}
      <p className="text-xs text-muted-foreground">Removing a file takes it off this request. We may keep a record of earlier artwork versions.</p>
    </Section>
  );
}

/* ----------------------------- 8. instructions ---------------------------- */
export function NotesStep({ sample, patch, stepRef }: StepProps) {
  const form = useStepForm<NotesState>(notesState(sample), stepRef, async (f) => { await patch(notesBody(f)); });
  return (
    <Section stepKey="notes">
      {form.error ? <FormError {...form.error} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <GroupCard title="Notes about your request" help="General context: who it is for, the look you want, anything that helps us understand the idea.">
          <FormField id="nt-notes" label="Notes about your request"><Textarea id="nt-notes" rows={7} value={form.f.notes} onChange={(e) => form.set({ notes: e.target.value })} /></FormField>
        </GroupCard>
        <GroupCard title="Special instructions" help="Specific things that must be done, or must not happen, when we make your sample.">
          <FormField id="nt-special" label="Special instructions"><Textarea id="nt-special" rows={7} value={form.f.specialInstructions} onChange={(e) => form.set({ specialInstructions: e.target.value })} /></FormField>
        </GroupCard>
      </div>
    </Section>
  );
}
