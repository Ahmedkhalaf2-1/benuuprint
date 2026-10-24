"use client";

import { Brush, Check, FileImage, Paperclip, Palette, Ruler, SendHorizontal, Shirt, StickyNote, Tag, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ErrorState } from "@/components/feedback/states";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/input";
import { errorMessage, isApiError } from "@/lib/api/errors";
import * as api from "./api";
import { useSubmissionCheck, useTerms } from "./hooks";
import { GarmentPreview } from "@/features/public-site/garment";
import { FILE_TYPE_LABELS } from "./files";
import { fitLabel, providerLabel, SIDE_LABELS, UNIT_LABELS } from "./labels";
import type { SampleDetail } from "./types";
import type { StepKey } from "./wizard-config";
import { Chip, Fact, FileTile, StepHeader, SummaryCard, Swatch, garmentKindFor } from "./wizard-ui";

/** What is still missing, exactly as the backend reports it (`problems[]`). Nothing is re-validated here. */
export function SubmissionChecklist({ ready, problems }: { ready: boolean; problems: string[] }) {
  return (
    <section aria-label="Before you submit" className="rounded-lg border bg-surface p-4" data-testid="submission-check" data-ready={ready}>
      <h3 className="mb-2 font-semibold">Before you submit</h3>
      {ready ? <p className="flex items-center gap-2 text-sm text-tone-success-fg"><Check aria-hidden className="size-4" /> Everything we need is filled in.</p> : (
        <ul className="space-y-1.5 text-sm">{problems.map((p) => <li key={p} className="flex items-start gap-2"><X aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />{p}</li>)}</ul>
      )}
    </section>
  );
}

/** The customer accepts the CURRENT sample terms themselves (authenticated customer acceptance, not a staff-recorded one). */
function TermsBlock({ sample, onAccepted }: { sample: SampleDetail; onAccepted: () => void }) {
  const terms = useTerms();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  if (!sample.terms.required) return null;
  if (terms.isLoading) return <p className="text-sm text-muted-foreground">Loading terms…</p>;
  if (terms.error || !terms.data) return <ErrorState error={terms.error} onRetry={() => terms.refetch()} className="py-4" />;
  const t = terms.data;
  return (
    <section aria-label="Sample terms" className="space-y-3 rounded-lg border bg-surface p-4" data-testid="terms-block" data-accepted={sample.terms.accepted}>
      <div className="flex items-baseline justify-between gap-3"><h3 className="font-semibold">{t.title}</h3><span className="text-xs text-muted-foreground">Version {t.version}</span></div>
      <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-surface-muted px-3 py-2 text-sm" tabIndex={0} aria-label="Terms text">{t.content}</div>
      {sample.terms.accepted ? <p className="flex items-center gap-2 text-sm text-tone-success-fg" data-testid="terms-accepted"><Check aria-hidden className="size-4" /> You accepted these terms{sample.terms.activeVersion ? ` (version ${sample.terms.activeVersion})` : ""}.</p> : (
        <div className="space-y-3">
          {error ? <FormError {...error} /> : null}
          <div className="flex items-start gap-2"><Checkbox id="terms-agree" checked={agree} onCheckedChange={(c) => setAgree(c === true)} className="mt-0.5" /><Label htmlFor="terms-agree" className="font-normal">I accept the Sample Terms (version {t.version})</Label></div>
          <Button disabled={!agree} loading={busy} onClick={async () => { setBusy(true); setError(null); try { await api.acceptTerms(sample.id, t.id); toast.success("Terms accepted"); onAccepted(); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); } finally { setBusy(false); } }}>Accept terms</Button>
        </div>
      )}
    </section>
  );
}

const CHECK_ICON = { brand: Tag, product: Shirt, fabric: Palette, size: Ruler, decoration: Brush, extras: Paperclip, files: FileImage, notes: StickyNote } as const;
const Ico = ({ k }: { k: keyof typeof CHECK_ICON }) => { const I = CHECK_ICON[k]; return <I />; };
const FILE_ORDER = ["ARTWORK", "REFERENCE", "SIZE_CHART", "OTHER"] as const;

/** Everything the customer entered, as eight summary cards with an Edit action each. Values come straight from the sample; nothing is invented. */
export function ReviewSummary({ sample, onEdit, highlight }: { sample: SampleDetail; onEdit?: (k: StepKey) => void; highlight?: StepKey | null }) {
  const s = sample;
  const product = s.productName ?? s.customProductName;
  const colour = s.colorName ?? s.customColorName;
  const custom = !!s.customProductName && !s.productTypeId;
  const byCat = s.components.reduce<Record<string, typeof s.components>>((a, c) => { (a[c.category ?? "Other"] ??= []).push(c); return a; }, {});
  const left = (
    <>
      <SummaryCard stepKey="brand" icon={<Ico k="brand" />} title="Brand" onEdit={onEdit} highlight={highlight === "brand"}>
        <p className="text-xl font-semibold tracking-tight">{s.brand.name}</p>
        <Chip>{s.sampleNumber}</Chip>
      </SummaryCard>
      <SummaryCard stepKey="product" icon={<Ico k="product" />} title="Product" onEdit={onEdit} highlight={highlight === "product"}>
        {product ? (
          <div className="flex items-center gap-4">
            {!custom ? <span className="block size-16 shrink-0"><GarmentPreview productType={garmentKindFor(product)} colour="#2b302e" fabric="jersey" /></span> : null}
            <div className="min-w-0"><p className="text-xl font-semibold tracking-tight">{product}</p><Chip className="mt-1.5">{custom ? "Described by you" : "Benue Print catalogue"}</Chip></div>
          </div>
        ) : <p className="text-sm text-muted-foreground">Not chosen yet.</p>}
        {s.customProductDescription ? <p className="text-sm text-muted-foreground">{s.customProductDescription}</p> : null}
      </SummaryCard>
      <SummaryCard stepKey="fabric" icon={<Ico k="fabric" />} title="Fabric & colour" onEdit={onEdit} highlight={highlight === "fabric"}>
        <div className="flex flex-wrap gap-1.5">{s.fabricProvider ? <Chip tone="brand">{providerLabel(s.fabricProvider)}</Chip> : null}{s.gsm ? <Chip>{s.gsm} g/m²</Chip> : null}</div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Fabric">{s.fabricName ?? s.customFabricName}</Fact>
          <Fact label="Colour">{colour ? <span className="inline-flex items-center gap-2"><Swatch hex={s.customHex} size="md" />{colour}{s.customPantone ? <span className="text-muted-foreground">· Pantone {s.customPantone}</span> : null}{s.customHex ? <span className="text-muted-foreground">· {s.customHex}</span> : null}</span> : null}</Fact>
          <Fact label="About the fabric" className="sm:col-span-2">{s.customFabricDescription}</Fact>
          <Fact label="Fabric notes" className="sm:col-span-2">{s.fabricNotes}</Fact>
        </dl>
        {!s.fabricName && !s.customFabricName && !colour && !s.fabricProvider ? <p className="text-sm text-muted-foreground">Nothing chosen yet.</p> : null}
      </SummaryCard>
      <SummaryCard stepKey="decoration" icon={<Ico k="decoration" />} title="Decoration" onEdit={onEdit} highlight={highlight === "decoration"}>
        {s.decorations.length === 0 ? <p className="text-sm text-muted-foreground">No print or embroidery.</p> : (
          <ul className="space-y-2" data-testid="decorations">{s.decorations.map((d) => (
            <li key={d.id} className="rounded-md border bg-surface-sunken/60 p-3 text-sm">
              <p><span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand">{d.printMethod.name}</span> <span className="font-semibold">{d.placement}</span></p>
              <div className="mt-1.5 flex flex-wrap gap-1.5"><Chip>{SIDE_LABELS[d.side] ?? d.side}</Chip>{d.width && d.height ? <Chip>{d.width} × {d.height} {d.unit ? UNIT_LABELS[d.unit] ?? d.unit : ""}</Chip> : null}{d.colorCount ? <Chip>{d.colorCount} {d.colorCount === 1 ? "colour" : "colours"}</Chip> : null}{d.artwork ? <Chip tone="brand">Artwork: {d.artwork.name}</Chip> : d.artworkRequired ? <Chip tone="warning">Artwork needed</Chip> : null}</div>
              {d.notes ? <p className="mt-1.5 text-muted-foreground">{d.notes}</p> : null}
            </li>))}</ul>
        )}
        {s.printNotes ? <p className="text-sm"><span className="text-muted-foreground">Print notes: </span>{s.printNotes}</p> : null}
      </SummaryCard>
    </>
  );
  const right = (
    <>
      <SummaryCard stepKey="size" icon={<Ico k="size" />} title="Size & fit" onEdit={onEdit} highlight={highlight === "size"}>
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-md border border-brand/40 bg-brand-soft/40 text-2xl font-semibold tabular-nums" data-testid="review-size">{s.size?.name ?? "—"}</span>
          <div className="min-w-0 text-sm"><p className="text-muted-foreground">Sample size</p><p className="font-medium">{fitLabel(s.fitMethod) ?? "Fit not chosen yet"}</p>{s.pattern ? <p className="text-muted-foreground">Pattern: {s.pattern.name}</p> : null}</div>
        </div>
        {s.fitNotes ? <p className="text-sm text-muted-foreground">{s.fitNotes}</p> : null}
      </SummaryCard>
      <SummaryCard stepKey="extras" icon={<Ico k="extras" />} title="Accessories & labels" onEdit={onEdit} highlight={highlight === "extras"}>
        {s.accessories.length === 0 && s.components.length === 0 ? <p className="text-sm text-muted-foreground">None added.</p> : null}
        {s.accessories.length ? <div><p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">Accessories</p><ul className="flex flex-wrap gap-1.5" data-testid="accessories">{s.accessories.map((a) => <li key={a.id}><Chip>{a.accessory?.name ?? a.customName}{a.quantity ? <span className="font-semibold text-foreground">× {a.quantity}</span> : null}</Chip></li>)}</ul></div> : null}
        {Object.entries(byCat).map(([cat, items]) => <div key={cat}><p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">{cat}</p><ul className="flex flex-wrap gap-1.5" data-testid="components">{items.map((c) => <li key={c.id}><Chip>{c.componentOption?.name ?? c.customName}</Chip></li>)}</ul></div>)}
      </SummaryCard>
      <SummaryCard stepKey="files" icon={<Ico k="files" />} title="Artwork & files" onEdit={onEdit} highlight={highlight === "files"}>
        {s.files.length === 0 ? <p className="text-sm text-muted-foreground">No files uploaded.</p> : (
          <div className="space-y-3" data-testid="review-files-summary">
            <div className="flex flex-wrap gap-1.5">{FILE_ORDER.map((t) => { const n = s.files.filter((f) => f.type === t).length; return n ? <Chip key={t} tone="brand">{FILE_TYPE_LABELS[t]} · {n}</Chip> : null; })}</div>
            <ul className="space-y-2">{s.files.map((f) => <FileTile key={f.attachmentId} name={f.originalName} mime={f.mimeType} sizeBytes={f.sizeBytes} typeLabel={FILE_TYPE_LABELS[f.type] ?? f.type} />)}</ul>
          </div>
        )}
      </SummaryCard>
      <SummaryCard stepKey="notes" icon={<Ico k="notes" />} title="Notes" onEdit={onEdit} highlight={highlight === "notes"}>
        {!s.notes && !s.specialInstructions ? <p className="text-sm text-muted-foreground">No extra notes.</p> : null}
        <dl className="space-y-3"><Fact label="Your notes"><span className="whitespace-pre-wrap">{s.notes}</span></Fact><Fact label="Special instructions"><span className="whitespace-pre-wrap">{s.specialInstructions}</span></Fact></dl>
      </SummaryCard>
    </>
  );
  return <div className="grid items-start gap-4 lg:grid-cols-2" data-testid="review-summary"><div className="space-y-4">{left}</div><div className="space-y-4">{right}</div></div>;
}

export function ReviewStep({ sample, changed, onSubmitted, onEdit, highlight, submitSlot }: { sample: SampleDetail; changed: () => void; onSubmitted: () => void; onEdit?: (k: StepKey) => void; highlight?: StepKey | null; submitSlot?: HTMLElement | null }) {
  const check = useSubmissionCheck(sample.id, true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const blocked = !!check.data && !check.data.ready;
  const submit = (
    <Button size="lg" disabled={!check.data?.ready} loading={busy} onClick={async () => { setBusy(true); setError(null); try { await api.submitSample(sample.id); onSubmitted(); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); changed(); } finally { setBusy(false); } }}>Submit my request</Button>
  );
  return (
    <section className="space-y-7">
      <StepHeader stepKey="review" />
      <ReviewSummary sample={sample} onEdit={onEdit} highlight={highlight} />
      <section aria-label="Submit your request" className="space-y-4 rounded-lg border border-brand/35 bg-surface p-4 shadow-[inset_2px_0_0_var(--brand)] sm:p-5" data-testid="submit-area">
        <div className="flex items-center gap-2.5"><span aria-hidden className="flex size-8 items-center justify-center rounded-sm border bg-surface-sunken text-brand"><SendHorizontal className="size-4" /></span><h3 className="text-base font-semibold tracking-tight">Ready to send?</h3></div>
        <TermsBlock sample={sample} onAccepted={changed} />
        {check.isLoading ? <p className="text-sm text-muted-foreground" role="status">Checking your request…</p> : check.error ? <ErrorState error={check.error} onRetry={() => check.refetch()} className="py-4" /> : check.data ? <SubmissionChecklist ready={check.data.ready} problems={check.data.problems} /> : null}
        {error ? <FormError {...error} /> : null}
        <div className="flex flex-wrap items-center gap-3">
          {submitSlot ? createPortal(submit, submitSlot) : submit}
          {blocked ? <span className="text-sm text-tone-warning-fg" data-testid="submit-blocked">Submission is blocked until the items above are fixed.</span> : null}
        </div>
      </section>
    </section>
  );
}
