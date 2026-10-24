/**
 * Garment visual boundary. Sections import ONLY from here and pass presentation props; they never touch SVG.
 * Today every component renders the 2D fallback. The 3D phase replaces the implementation behind these same
 * exports (dynamic import, static/poster fallback, reduced-motion handling all live inside the swap), not the callers.
 */
import { cn } from "@/lib/utils/cn";
import { Garment2D } from "./garment-2d";
import { InteractiveGarment } from "./interactive-garment";
import { HeroGarment2D } from "./hero-2d";
import { PLACEMENT_ZONE } from "./silhouettes";
import { ProcessGarment2D } from "./process-2d";
import type { GarmentKind, GarmentVisualProps, ProcessStage } from "./types";

export type { DecorationVisualKey, FabricVisualKey, GarmentKind, GarmentVisualProps, ProcessStage } from "./types";
export { PROCESS_STAGE_LABELS } from "./process-2d";

/** The bare garment. Swap point for every other garment component. */
export function GarmentVisual(props: GarmentVisualProps) {
  return <Garment2D {...props} />;
}

/** Product showcase preview (What We Make). Swap point B. */
export function GarmentPreview({ caption, ...props }: GarmentVisualProps & { caption?: string }) {
  return (
    <div className={cn("relative aspect-square w-full", props.className)} data-garment-preview={props.productType}>
      <GarmentVisual {...props} className={undefined} />
      {caption ? <p className="absolute inset-x-0 bottom-0 text-center font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-pub-muted">{caption}</p> : null}
    </div>
  );
}

/** Sample builder preview with technical staging (grid, placement zone). Renders the interactive 3D tee where supported, else the 2D visual. */
export function BuilderGarmentPreview({ modelSrc, ...props }: GarmentVisualProps & { modelSrc?: string | null }) {
  const zone = PLACEMENT_ZONE[props.productType];
  return (
    <div className="relative aspect-square w-full" data-builder-preview>
      <svg aria-hidden viewBox="0 0 400 400" className="absolute inset-0 size-full text-pub-line" fill="none">
        <defs><pattern id="bgp-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 H0 V20" stroke="currentColor" strokeWidth="0.5" opacity="0.5" /></pattern></defs>
        <rect width="400" height="400" fill="url(#bgp-grid)" />
        {props.decoration && props.decoration !== "sublimation" ? (
          <g stroke="var(--pub-brand)" strokeWidth="1" strokeDasharray="3 4"><rect x={zone.x - 6} y={zone.y - 6} width={zone.w + 12} height={zone.h + 12} /></g>
        ) : null}
      </svg>
      <div className="absolute inset-[6%]"><InteractiveGarment {...props} modelSrc={modelSrc} /></div>
      <p className="absolute bottom-0 start-0 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-pub-muted">Preview · {props.decoration === "sublimation" ? "All-over" : zone.label}</p>
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
