"use client";

import { Check, Plus } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { canRecolor, modelFor } from "@/features/garment-3d/model-registry";
import { PLACEMENT_LABEL, PLACEMENT_SIDE, placementSpec, type PlacementId, type PlacementStatus } from "@/features/garment-3d/placement-config";
import { usePlacementView, usePrintDesign, type PrintLayer } from "@/features/garment-3d/print-design";
import { InteractiveGarment, PrintControls, type GarmentKind } from "@/features/public-site/garment";
import { cn } from "@/lib/utils/cn";
import { colourHex, kindForProductType, type DecorationPrefill } from "./garment-customizer";
import type { SampleDetail, SampleOptions } from "./types";
import { garmentKindFor } from "./wizard-ui";
import { useI18n } from "@/i18n/provider";

/**
 * The sample studio: ONE live 3D viewer shared by every step of the real sample request.
 *
 * Source of truth: the sample itself (saved values) plus the step currently being edited (its unsaved form values, pushed here
 * as "live" overrides), plus the in-memory print design keyed by sample id (shared with the decoration controls). Live overrides
 * are dropped as soon as the saved sample changes, so the viewer never disagrees with what was saved.
 * The viewer is VISUAL ONLY: it never writes to the sample.
 */

interface Live { productTypeId?: string | null; customProduct?: boolean; hex?: string | null }
interface StudioState { live: Live; setLive: (p: Live) => void; status: PlacementStatus; setStatus: (s: PlacementStatus) => void }
const noop = () => undefined;
const StudioCtx = createContext<StudioState>({ live: {}, setLive: noop, status: {}, setStatus: noop });
export const useStudio = () => useContext(StudioCtx);

export function StudioProvider({ sample, children }: { sample: SampleDetail; children: ReactNode }) {
  const saved = [sample.productTypeId, sample.fabricId, sample.fabricColorId, sample.customHex].join("|");
  const [basis, setBasis] = useState(saved);
  const [live, setLiveState] = useState<Live>({});
  const [status, setStatus] = useState<PlacementStatus>({});
  if (basis !== saved) { setBasis(saved); setLiveState({}); }
  const setLive = useCallback((p: Live) => setLiveState((s) => ((Object.keys(p) as Array<keyof Live>).every((k) => s[k] === p[k]) ? s : { ...s, ...p })), []);
  const value = useMemo(() => ({ live, setLive, status, setStatus }), [live, setLive, status]);
  return <StudioCtx.Provider value={value}>{children}</StudioCtx.Provider>;
}

/** Product step: the catalogue product being picked (null = none yet), or a described custom product, before it is saved. */
export function useLiveProduct(productTypeId: string | null, customProduct: boolean) {
  const { setLive } = useStudio();
  useEffect(() => { setLive({ productTypeId: customProduct ? null : productTypeId, customProduct }); }, [setLive, productTypeId, customProduct]);
}
/** Fabric step: the colour being picked, before it is saved. */
export function useLiveColour(hex: string | null) {
  const { setLive } = useStudio();
  useEffect(() => { setLive({ hex }); }, [setLive, hex]);
}

/* ------------------------------------------ viewer ----------------------------------------- */
/**
 * `compact`: smaller stage for the steps after decoration. `pinned`: phones keep a small viewer stuck under the header while the
 * customer works through the controls beneath it (decoration step).
 */
export function StudioViewer({ sample, options, compact = false, pinned = false, className }: { sample: SampleDetail; options: SampleOptions; compact?: boolean; pinned?: boolean; className?: string }) {
  const { t } = useI18n();
  const { live, status, setStatus } = useStudio();
  const productTypeId = live.productTypeId !== undefined ? live.productTypeId : sample.productTypeId;
  const kind = kindForProductType(options, productTypeId);
  const modelKind = kind && modelFor(kind) ? kind : null;
  const product = productTypeId ? options.productTypes.find((p) => p.id === productTypeId) : null;
  const name = product?.name ?? (live.productTypeId === undefined ? sample.customProductName : null);
  const hex = live.hex !== undefined ? live.hex : colourHex(options, sample.fabricId, sample.fabricColorId, sample.customHex);
  const recolor = !!modelKind && canRecolor(modelKind);

  // Garments without a model use a throwaway design store, so the sample's design is never re-clamped against them.
  const design = usePrintDesign(modelKind ?? "tshirt", modelKind ? `sample:${sample.id}` : undefined);
  const [view, setView] = usePlacementView(modelKind ?? "tshirt", design.active);
  const prints = useMemo(() => (modelKind ? Object.values(design.layers).filter((l): l is PrintLayer => !!l) : []), [design.layers, modelKind]);

  // Switching to a garment that can't take some placements drops them from the design: say so instead of silently losing them.
  const [seenKind, setSeenKind] = useState<GarmentKind | null>(modelKind);
  const [dropped, setDropped] = useState(false);
  if (seenKind !== modelKind) {
    setSeenKind(modelKind);
    setDropped(!!modelKind && (Object.keys(design.layers) as PlacementId[]).some((id) => !placementSpec(modelKind, id)));
  }

  const active = modelKind && design.active ? design.active : null;
  const custom = live.customProduct ?? (!sample.productTypeId && !!sample.customProductName);
  const empty = !productTypeId && !custom ? t("customer.studioChooseGarment") : t("customer.studioNoModel");
  return (
    <section aria-label={t("customer.studioLivePreview")} className={cn("pub overflow-hidden rounded-lg border border-pub-line bg-pub-bg text-pub-text", className)} data-testid="studio-viewer" data-garment={modelKind ?? "none"}>
      <header className={cn("flex items-center justify-between gap-3 border-b border-pub-line px-4 py-3", pinned && "max-lg:py-2")}>
        <div className="min-w-0">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-pub-brand">{t("customer.studioLivePreview")}</p>
          <p className="mt-0.5 truncate text-sm font-medium" data-testid="studio-garment">{name ?? "—"}</p>
        </div>
        {recolor && hex ? <span dir="ltr" className="flex shrink-0 items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-pub-muted"><span aria-hidden className="size-3.5 rounded-full border border-white/25" style={{ background: hex }} />{hex}</span> : null}
      </header>
      <div className={cn("px-3 pb-3 pt-2 sm:px-5 sm:pb-5", pinned && "max-lg:pb-2")}>
        <div className={cn("relative mx-auto aspect-square w-full transition-[max-width] duration-300", compact ? "max-w-[min(100%,36svh)] lg:max-w-[min(100%,20rem)]" : pinned ? "max-w-[min(100%,28svh)] lg:max-w-[min(100%,calc(100svh-17rem))]" : "max-w-[min(100%,42svh)] lg:max-w-[min(100%,calc(100svh-17rem))]")}>
          <InteractiveGarment productType={kind ?? "custom"} colour={recolor ? hex ?? undefined : undefined} fabric="jersey" prints={prints} view={view} onViewChange={setView} onPlacementStatus={setStatus} controls={compact ? "compact" : "full"} noModelMessage={empty} />
        </div>
      </div>
      {modelKind ? (
        <footer className={cn("space-y-1.5 border-t border-pub-line px-4 py-3 text-xs leading-relaxed text-pub-muted", pinned && "max-lg:hidden")} data-testid="studio-notes">
          {active ? <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em]"><span>{t("customer.studioPlacement")}</span> · <span className="text-pub-text">{t.text(PLACEMENT_LABEL[active])}</span>{status[active] === "blocked" ? <span> · {t("site.placementUnavailable")}</span> : null}</p> : null}
          {!recolor ? <p>{t("customer.preview3dOriginalMaterial")}</p> : !hex ? <p>{t("customer.studioNoColour")}</p> : null}
          {dropped ? <p role="status">{t("customer.studioPlacementsDropped")}</p> : null}
          <p>{t("customer.studioDisclaimer")}</p>
        </footer>
      ) : null}
    </section>
  );
}

/* ------------------------------------- product selector ------------------------------------ */
/** Compact, scannable catalogue list (no garment drawings, no extra WebGL canvases): the shared viewer shows the selection in 3D. */
export function StudioProductSelector({ options, value, onChange }: { options: SampleOptions; value: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  const ids = options.productTypes.map((p) => p.id);
  const move = (e: KeyboardEvent<HTMLUListElement>) => {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d || !ids.length) return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl" && (e.key === "ArrowLeft" || e.key === "ArrowRight");
    const i = (Math.max(0, ids.indexOf(value)) + (rtl ? -d : d) + ids.length) % ids.length;
    onChange(ids[i]!);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[i]?.focus();
  };
  return (
    <ul role="radiogroup" aria-label={t("common.product")} onKeyDown={move} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-testid="studio-products">
      {options.productTypes.map((p, i) => {
        const on = value === p.id;
        const has3d = !!modelFor(garmentKindFor(p.name));
        return (
          <li key={p.id} className="min-w-0">
            <button type="button" role="radio" aria-checked={on} tabIndex={on || (!value && i === 0) ? 0 : -1} onClick={() => onChange(p.id)} className={cn("flex h-full min-h-16 w-full items-center gap-3 rounded-md border bg-surface px-3.5 py-3 text-start transition-[border-color,background-color] hover:border-border-strong active:scale-[0.99]", on && "border-brand bg-brand-soft/40")}>
              <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors", on && "border-brand bg-brand-fill text-white")}>{on ? <Check className="size-3" /> : null}</span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm", on ? "font-semibold" : "font-medium")}>{p.name}</span>
                {p.description ? <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{p.description}</span> : null}
              </span>
              {has3d ? <span className={cn("shrink-0 rounded-sm border px-1.5 py-px font-mono text-[0.625rem] uppercase tracking-[0.12em]", on ? "border-brand/50 text-brand" : "text-muted-foreground")}>{t("customer.studioHas3d")}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------------------- design panel -------------------------------------- */
/**
 * Decoration step: placement, artwork, size/position. Drives the shared viewer through the sample's design store (selecting a
 * back placement turns the garment around). A placement becomes a real decoration only through the existing decoration dialog.
 */
export function StudioDesignPanel({ sample, options, kind, onAdd }: { sample: SampleDetail; options: SampleOptions; kind: GarmentKind; onAdd: (p: DecorationPrefill) => void }) {
  const { t } = useI18n();
  const { status } = useStudio();
  const design = usePrintDesign(kind, `sample:${sample.id}`);
  const active = design.active;
  const layer = active ? design.layers[active] : undefined;
  const sides = new Set(options.decorationSides.map((s) => s.value));
  const sideFor = (id: PlacementId) => (sides.has(PLACEMENT_SIDE[id]) ? PLACEMENT_SIDE[id] : sides.has("OTHER") ? "OTHER" : "");
  return (
    <div className="pub space-y-5 rounded-md border border-pub-line bg-pub-bg p-4 text-pub-text sm:p-5" data-testid="studio-design">
      <PrintControls kind={kind} design={design} status={status} note={t("customer.studioDisclaimer")} />
      {active && layer && status[active] !== "blocked" ? (
        <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => onAdd({ placement: t.text(PLACEMENT_LABEL[active]), side: sideFor(active), artwork: layer.source.type === "artwork" ? layer.source.file : null })}><Plus />{" "}{t("customer.addAsDecoration")}</Button>
      ) : null}
    </div>
  );
}
