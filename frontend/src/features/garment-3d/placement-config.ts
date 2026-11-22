import type { DecorationVisualKey, GarmentKind } from "@/features/public-site/garment/types";

/**
 * Per-model print placement calibration. Pure data.
 *
 * Coordinates are fractions of the garment's height in the viewer's normalized space (every model is scaled to the same height,
 * centred on its bounding box, front facing +Z, wearer's left on +X):
 *   - `y`: height from the hem/bottom of the model (0) to its top (1);
 *   - `u`: horizontal position on the projection plane: X for front/back, Z for the sleeves (side views).
 * Each anchor was checked against the actual GLB by ray-casting onto the mesh and rendering a test decal from all four sides
 * (see docs/FRONTEND_PHASE_10_3D_GARMENTS.md). A placement that did not land cleanly on the printable fabric is left out
 * (e.g. the jacket's centre chest, which is split by the zip), so the UI never offers it.
 *
 * Sizes are VISUAL only. They are not print dimensions; production size and position are confirmed during sample review.
 */
export const PLACEMENT_IDS = ["center-chest", "left-chest", "right-chest", "upper-back", "full-back", "left-sleeve", "right-sleeve", "left-leg", "right-leg"] as const;
export type PlacementId = (typeof PLACEMENT_IDS)[number];
export type ViewFace = "front" | "back" | "left" | "right";
export type PrintTechnique = Exclude<DecorationVisualKey, "sublimation">;
/** Whether a placement landed on printable fabric in the 3D model ("blocked": something else was in front, nothing is drawn). */
export type PlacementStatus = Partial<Record<PlacementId, "ok" | "blocked">>;

export interface PlacementSpec {
  id: PlacementId;
  /** Which side the artwork is projected from (and where the camera goes). `left` = wearer's left (+X). */
  face: ViewFace;
  u: number;
  y: number;
  /** Default / smallest / largest artwork size (longest edge), as a fraction of garment height. */
  size: number;
  minSize: number;
  maxSize: number;
  /** How far the artwork may move from the anchor (fraction of height, each direction). Keeps it inside the print area. */
  range: { u: number; y: number };
  /** Max rotation either way, in degrees (0 = rotation not offered). */
  maxRotation: number;
  /** Projection depth (fraction of height): deep enough to wrap the curve, shallow enough not to reach other panels. */
  depth: number;
  /** Decoration looks the preview offers at this placement (presentation only; real methods come from the catalogue). */
  techniques: readonly PrintTechnique[];
}

/** Customer-facing English labels (localised with t.text; Arabic lives in messages/ar/phrases.ts). */
export const PLACEMENT_LABEL: Record<PlacementId, string> = {
  "center-chest": "Center chest", "left-chest": "Left chest", "right-chest": "Right chest", "upper-back": "Upper back", "full-back": "Full back",
  "left-sleeve": "Left sleeve", "right-sleeve": "Right sleeve", "left-leg": "Left leg", "right-leg": "Right leg",
};

/** Backend decoration side for each placement (existing enum values: FRONT, BACK, LEFT_SLEEVE, RIGHT_SLEEVE, OTHER). */
export const PLACEMENT_SIDE: Record<PlacementId, string> = {
  "center-chest": "FRONT", "left-chest": "FRONT", "right-chest": "FRONT", "upper-back": "BACK", "full-back": "BACK",
  "left-sleeve": "LEFT_SLEEVE", "right-sleeve": "RIGHT_SLEEVE", "left-leg": "FRONT", "right-leg": "FRONT",
};

const ALL: readonly PrintTechnique[] = ["screen-print", "dtf", "embroidery", "puff"];
const SMALL: readonly PrintTechnique[] = ["embroidery", "screen-print", "dtf", "puff"];
const LARGE: readonly PrintTechnique[] = ["screen-print", "dtf"];

type P = Omit<PlacementSpec, "id" | "techniques" | "depth"> & { depth?: number; techniques?: readonly PrintTechnique[] };
const build = (entries: Partial<Record<PlacementId, P>>): PlacementSpec[] =>
  (Object.entries(entries) as Array<[PlacementId, P]>).map(([id, p]) => ({ id, depth: p.depth ?? 0.12, techniques: p.techniques ?? ALL, ...p }));

const chest = (u: number, y: number, size: number) => ({ face: "front" as const, u, y, size, minSize: size * 0.5, maxSize: size * 1.35, range: { u: 0.025, y: 0.03 }, maxRotation: 20, techniques: SMALL });
const sleeve = (face: "left" | "right", y: number, size: number) => ({ face, u: 0, y, size, minSize: size * 0.6, maxSize: size * 1.3, range: { u: 0.02, y: 0.03 }, maxRotation: 30, depth: 0.08, techniques: SMALL });

export const PLACEMENTS: Partial<Record<GarmentKind, PlacementSpec[]>> = {
  tshirt: build({
    "center-chest": { face: "front", u: 0, y: 0.7, size: 0.22, minSize: 0.1, maxSize: 0.32, range: { u: 0.05, y: 0.06 }, maxRotation: 20 },
    "left-chest": chest(0.12, 0.8, 0.09),
    "right-chest": chest(-0.12, 0.8, 0.09),
    "upper-back": { face: "back", u: 0, y: 0.84, size: 0.16, minSize: 0.08, maxSize: 0.22, range: { u: 0.04, y: 0.03 }, maxRotation: 15 },
    "full-back": { face: "back", u: 0, y: 0.55, size: 0.32, minSize: 0.16, maxSize: 0.36, range: { u: 0.04, y: 0.08 }, maxRotation: 10, techniques: LARGE },
    "left-sleeve": sleeve("left", 0.76, 0.08),
    "right-sleeve": sleeve("right", 0.76, 0.08),
  }),
  polo: build({
    "center-chest": { face: "front", u: 0, y: 0.64, size: 0.18, minSize: 0.09, maxSize: 0.26, range: { u: 0.04, y: 0.05 }, maxRotation: 15 },
    "left-chest": chest(0.13, 0.76, 0.08),
    "right-chest": chest(-0.13, 0.76, 0.08),
    "upper-back": { face: "back", u: 0, y: 0.84, size: 0.16, minSize: 0.08, maxSize: 0.22, range: { u: 0.04, y: 0.03 }, maxRotation: 15 },
    "full-back": { face: "back", u: 0, y: 0.55, size: 0.3, minSize: 0.15, maxSize: 0.34, range: { u: 0.04, y: 0.08 }, maxRotation: 10, techniques: LARGE },
    "left-sleeve": sleeve("left", 0.76, 0.08),
    "right-sleeve": sleeve("right", 0.76, 0.08),
  }),
  hoodie: build({
    // The hood drapes over the upper chest: front placements sit below it.
    "center-chest": { face: "front", u: 0, y: 0.5, size: 0.15, minSize: 0.08, maxSize: 0.2, range: { u: 0.03, y: 0.04 }, maxRotation: 15 },
    "left-chest": chest(0.1, 0.56, 0.055),
    "right-chest": chest(-0.1, 0.56, 0.055),
    "upper-back": { face: "back", u: 0, y: 0.62, size: 0.12, minSize: 0.06, maxSize: 0.16, range: { u: 0.03, y: 0.03 }, maxRotation: 15 },
    "full-back": { face: "back", u: 0, y: 0.44, size: 0.24, minSize: 0.12, maxSize: 0.27, range: { u: 0.03, y: 0.06 }, maxRotation: 10, techniques: LARGE },
    "left-sleeve": sleeve("left", 0.45, 0.06),
    "right-sleeve": sleeve("right", 0.45, 0.06),
  }),
  jacket: build({
    // No centre chest: the front is split by a full-length zip.
    "left-chest": chest(0.14, 0.72, 0.09),
    "right-chest": chest(-0.14, 0.72, 0.09),
    "upper-back": { face: "back", u: 0, y: 0.8, size: 0.16, minSize: 0.08, maxSize: 0.22, range: { u: 0.04, y: 0.03 }, maxRotation: 15 },
    "full-back": { face: "back", u: 0, y: 0.55, size: 0.3, minSize: 0.15, maxSize: 0.34, range: { u: 0.04, y: 0.07 }, maxRotation: 10, techniques: LARGE },
    "left-sleeve": sleeve("left", 0.6, 0.08),
    "right-sleeve": sleeve("right", 0.6, 0.08),
  }),
  bottoms: build({
    "left-leg": { face: "front", u: 0.11, y: 0.7, size: 0.07, minSize: 0.04, maxSize: 0.1, range: { u: 0.02, y: 0.06 }, maxRotation: 20, techniques: SMALL },
    "right-leg": { face: "front", u: -0.11, y: 0.7, size: 0.07, minSize: 0.04, maxSize: 0.1, range: { u: 0.02, y: 0.06 }, maxRotation: 20, techniques: SMALL },
  }),
  sportswear: build({
    "center-chest": { face: "front", u: 0, y: 0.74, size: 0.09, minSize: 0.05, maxSize: 0.11, range: { u: 0.02, y: 0.02 }, maxRotation: 15 },
    "left-chest": chest(0.07, 0.78, 0.045),
    "right-chest": chest(-0.07, 0.78, 0.045),
    "upper-back": { face: "back", u: 0, y: 0.8, size: 0.1, minSize: 0.05, maxSize: 0.13, range: { u: 0.02, y: 0.02 }, maxRotation: 15 },
    "full-back": { face: "back", u: 0, y: 0.7, size: 0.16, minSize: 0.08, maxSize: 0.18, range: { u: 0.02, y: 0.03 }, maxRotation: 10, techniques: LARGE },
    "left-sleeve": sleeve("left", 0.68, 0.045),
    "right-sleeve": sleeve("right", 0.68, 0.045),
  }),
};

export const placementsFor = (kind: GarmentKind): PlacementSpec[] => PLACEMENTS[kind] ?? [];
export const placementSpec = (kind: GarmentKind, id: PlacementId): PlacementSpec | null => placementsFor(kind).find((p) => p.id === id) ?? null;
/** The placement a plain decoration look (no artwork) is shown at: the garment's first front placement. */
export const defaultPlacement = (kind: GarmentKind): PlacementSpec | null => placementsFor(kind).find((p) => p.face === "front") ?? placementsFor(kind)[0] ?? null;
