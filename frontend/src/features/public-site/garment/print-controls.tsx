"use client";

import { ImageUp, RotateCcw, Trash2 } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { PLACEMENT_LABEL, placementsFor, type PlacementSpec, type PlacementStatus, type ViewFace } from "@/features/garment-3d/placement-config";
import { ARTWORK_ACCEPT, readArtwork, type ArtworkError, type usePrintDesign } from "@/features/garment-3d/print-design";
import type { GarmentKind } from "./types";
import { useI18n } from "@/i18n/provider";

type Design = ReturnType<typeof usePrintDesign>;

/** On screen, "right" depends on which side the camera looks from (the garment is never mirrored, also not in RTL). */
const SCREEN_RIGHT: Record<ViewFace, 1 | -1> = { front: 1, back: -1, left: -1, right: 1 };

const chip = "inline-flex h-10 shrink-0 items-center gap-2 border px-3 text-[0.8125rem] transition-colors active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";
const quiet = "inline-flex h-10 items-center gap-2 border border-pub-line px-3 text-[0.8125rem] text-pub-muted transition-colors hover:border-pub-muted hover:text-pub-text";

function Range({ id, label, value, min, max, step, onChange, display }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-pub-muted"><span>{label}</span><span className="tabular-nums text-pub-text/80">{display}</span></label>
      {/* LTR on purpose: the slider moves the print the way it moves on screen, in both languages. */}
      <input id={id} dir="ltr" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-6 w-full accent-[var(--pub-brand)]" />
    </div>
  );
}

/**
 * Placement, artwork and positioning controls for the 3D print preview. Local only: choosing a file never uploads it.
 * Everything is clamped to the calibrated print area of the placement (garment-3d/placement-config).
 */
export function PrintControls({ kind, design, status, note, className, allowRotation = true }: { kind: GarmentKind; design: Design; status?: PlacementStatus; note?: ReactNode; className?: string; allowRotation?: boolean }) {
  const { t } = useI18n();
  const uid = useId().replace(/:/g, "");
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<ArtworkError | null>(null);
  const [busy, setBusy] = useState(false);
  const placements = placementsFor(kind);
  const activeId = design.active && placements.some((p) => p.id === design.active) ? design.active : placements[0]?.id ?? null;
  const spec = placements.find((p) => p.id === activeId) ?? null;
  const layer = activeId ? design.layers[activeId] : undefined;
  if (!placements.length || !spec) return null;

  const pick = async (file: File | undefined) => {
    if (!file || !activeId) return;
    setBusy(true); setError(null);
    const r = await readArtwork(file);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    design.place(activeId, r.source);
  };
  const errorText = { type: t("site.artworkTypeError"), size: t("site.artworkSizeError"), read: t("site.artworkReadError") };
  const pct = (v: number, range: number) => (range ? Math.round((v / range) * 100) : 0);
  const sizeOf = (s: PlacementSpec, v: number) => Math.round(((v - s.minSize) / (s.maxSize - s.minSize || 1)) * 100);

  return (
    <div className={cn("space-y-5", className)} data-testid="print-controls">
      <div role="radiogroup" aria-label={t("site.printPlacement")}>
        <p className="mb-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-pub-muted">{t("site.printPlacement")}</p>
        <div className="flex flex-wrap gap-1.5">
          {placements.map((p) => {
            const on = p.id === activeId;
            const blocked = status?.[p.id] === "blocked";
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} data-placement={p.id} onClick={() => design.select(p.id)} className={cn(chip, on ? "border-pub-brand bg-pub-brand-deep/25 text-pub-text shadow-[inset_0_-2px_0_var(--pub-brand)]" : "border-pub-line text-pub-muted hover:border-pub-muted hover:text-pub-text")}>
                {design.layers[p.id] ? <span aria-hidden className={cn("size-2 rounded-full", blocked ? "bg-pub-muted" : "bg-pub-brand")} /> : null}
                {t.text(PLACEMENT_LABEL[p.id])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept={ARTWORK_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={cn(chip, "border-pub-brand text-pub-text hover:bg-pub-brand-deep/25")}><ImageUp aria-hidden className="size-4" />{layer?.source.type === "artwork" ? t("site.replaceDesign") : t("site.uploadDesign")}</button>
        {layer ? <button type="button" onClick={() => design.remove(spec.id)} className={quiet}><Trash2 aria-hidden className="size-4" />{t("site.removeDesign")}</button> : null}
        {layer?.source.type === "artwork" ? <span className="min-w-0 truncate text-xs text-pub-muted" title={layer.source.name}>{layer.source.name}</span> : null}
      </div>
      <p className="text-xs text-pub-muted">{t("site.artworkHint")}</p>
      {error ? <p role="alert" className="text-sm text-[#f2a7a0]">{errorText[error]}</p> : null}
      {layer && status?.[spec.id] === "blocked" ? <p role="status" className="text-sm text-pub-muted">{t("site.placementUnavailable")}</p> : null}

      {layer ? (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="print-adjust">
          <Range id={`${uid}-size`} label={t("site.designSize")} min={spec.minSize} max={spec.maxSize} step={(spec.maxSize - spec.minSize) / 50} value={layer.size} onChange={(v) => design.update(spec.id, { size: v })} display={`${sizeOf(spec, layer.size)}%`} />
          {spec.maxRotation && allowRotation ? <Range id={`${uid}-rot`} label={t("site.rotateDesign")} min={-spec.maxRotation} max={spec.maxRotation} step={1} value={layer.rotation} onChange={(v) => design.update(spec.id, { rotation: v })} display={`${Math.round(layer.rotation)}°`} /> : null}
          <Range id={`${uid}-x`} label={t("site.moveHorizontal")} min={-spec.range.u} max={spec.range.u} step={spec.range.u / 25} value={layer.du * SCREEN_RIGHT[spec.face]} onChange={(v) => design.update(spec.id, { du: v * SCREEN_RIGHT[spec.face] })} display={`${pct(layer.du * SCREEN_RIGHT[spec.face], spec.range.u)}`} />
          <Range id={`${uid}-y`} label={t("site.moveVertical")} min={-spec.range.y} max={spec.range.y} step={spec.range.y / 25} value={layer.dv} onChange={(v) => design.update(spec.id, { dv: v })} display={`${pct(layer.dv, spec.range.y)}`} />
          <div className="sm:col-span-2"><button type="button" onClick={() => design.restore(spec.id)} className={quiet}><RotateCcw aria-hidden className="size-4" />{t("site.restorePosition")}</button></div>
        </div>
      ) : null}
      <p className="border-t border-pub-line pt-3 text-xs text-pub-muted" data-testid="preview-disclaimer">{note ?? t("site.preview3dDisclaimer")}</p>
    </div>
  );
}
