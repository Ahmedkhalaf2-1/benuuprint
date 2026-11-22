/**
 * Garment visual boundary. Sections import ONLY from here and pass presentation props.
 * Garment VIEWERS (What We Make, carousel, builders, sample request) render only the real GLB model through InteractiveGarment:
 * no illustration is ever shown before, instead of, or after it. The 2D drawings remain only for small static thumbnails
 * (`GarmentVisual` / non-interactive `GarmentPreview`) and the process/hero illustrations, which are not garment viewers.
 */
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";
import { Garment2D } from "./garment-2d";
import { InteractiveGarment, type InteractiveGarmentProps } from "./interactive-garment";
import { HeroGarment2D } from "./hero-2d";
import { PLACEMENT_LABEL, defaultPlacement } from "@/features/garment-3d/placement-config";
import { ProcessGarment2D } from "./process-2d";
import type { GarmentKind, GarmentVisualProps, ProcessStage } from "./types";

export type { DecorationVisualKey, FabricVisualKey, GarmentKind, GarmentVisualProps, ProcessStage } from "./types";
export { PROCESS_STAGE_LABELS } from "./process-2d";
export { InteractiveGarment, type InteractiveGarmentProps } from "./interactive-garment";
export { PrintControls } from "./print-controls";

/** Neutral "bone" used by the category showcases: reads clearly as the garment against the dark stage. */
export const SHOWCASE_COLOUR = "#d9d2c3";

/** Static 2D garment drawing for small thumbnails (product pickers, review cards, catalogue grid). Not used by any 3D viewer. */
export function GarmentVisual(props: GarmentVisualProps) {
  return <Garment2D {...props} />;
}

/**
 * Product preview. `interactive`: the real 3D model only (What We Make, carousel); while it loads the square stays an empty dark
 * stage. Without `interactive`: a static thumbnail drawing (lists that would otherwise need one WebGL context per item).
 */
export function GarmentPreview({ caption, interactive, ...props }: InteractiveGarmentProps & { caption?: string; interactive?: boolean }) {
  return (
    <div className={cn("relative aspect-square w-full", props.className)} data-garment-preview={props.productType}>
      {interactive ? <InteractiveGarment {...props} className={undefined} /> : <GarmentVisual {...props} className={undefined} />}
      {caption ? <p className={cn("absolute font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-pub-muted", interactive ? "start-0 top-0" : "inset-x-0 bottom-0 text-center")}>{caption}</p> : null}
    </div>
  );
}

/** Sample builder preview: the 3D garment on a technical grid. The caption names the calibrated 3D placement being shown. */
export function BuilderGarmentPreview({ caption, ...props }: InteractiveGarmentProps & { caption?: string }) {
  const { t } = useI18n();
  const shown = props.prints?.[0]?.placement ?? (props.decoration && props.decoration !== "sublimation" ? defaultPlacement(props.productType)?.id : undefined);
  const zone = props.decoration === "sublimation" && !props.prints?.length ? t("site.allOver") : shown ? t.text(PLACEMENT_LABEL[shown]) : null;
  return (
    <div className="relative aspect-square w-full" data-builder-preview>
      <svg aria-hidden viewBox="0 0 400 400" className="absolute inset-0 size-full text-pub-line" fill="none">
        <defs><pattern id="bgp-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 H0 V20" stroke="currentColor" strokeWidth="0.5" opacity="0.5" /></pattern></defs>
        <rect width="400" height="400" fill="url(#bgp-grid)" />
      </svg>
      <div className="absolute inset-[6%]"><InteractiveGarment {...props} /></div>
      {caption ?? zone ? <p className="absolute start-0 top-0 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-pub-muted">{caption ?? t("site.previewZone", { zone: zone! })}</p> : null}
    </div>
  );
}

/** How-It-Works sticky visual, driven by the scroll step. Swap point C. */
export function ProcessGarmentVisual({ stage, productType, className }: { stage: ProcessStage; productType?: GarmentKind; className?: string }) {
  return <ProcessGarment2D stage={stage} productType={productType} className={className} />;
}

/** Hero environment used as the `fallback` of <VideoHero>. Swap point A (a future hero mode can render a 3D garment here). */
export function HeroGarmentVisual({ className }: { className?: string }) {
  return <HeroGarment2D className={className} />;
}
