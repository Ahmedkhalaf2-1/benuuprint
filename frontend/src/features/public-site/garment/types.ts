/**
 * Presentation vocabulary for garment visuals. These identifiers are local to the public site: they are not backend
 * enums and the backend never sees them. They are the keys a future 3D viewer would map to models, materials and decals.
 */
export const GARMENT_KINDS = ["tshirt", "hoodie", "sweatshirt", "polo", "jacket", "bottoms", "sportswear", "custom"] as const;
export type GarmentKind = (typeof GARMENT_KINDS)[number];

/** Decorative fabric tokens (no composition, weight or any other material data). */
export const FABRIC_VISUAL_KEYS = ["jersey", "rib", "fleece", "brushed", "twill"] as const;
export type FabricVisualKey = (typeof FABRIC_VISUAL_KEYS)[number];

export const DECORATION_VISUAL_KEYS = ["screen-print", "dtf", "embroidery", "puff", "sublimation"] as const;
export type DecorationVisualKey = (typeof DECORATION_VISUAL_KEYS)[number];

/** The six How-It-Works stages, zero-based. */
export type ProcessStage = 0 | 1 | 2 | 3 | 4 | 5;

/** The presentation props every garment visual accepts. The same props must drive the future 3D renderer. */
export interface GarmentVisualProps {
  productType: GarmentKind;
  /** Garment colour as a hex string. */
  colour?: string;
  fabric?: FabricVisualKey;
  decoration?: DecorationVisualKey | null;
  className?: string;
  /** Forces a static render. CSS `prefers-reduced-motion` already calms transitions; this is for explicit control. */
  reducedMotion?: boolean;
}
