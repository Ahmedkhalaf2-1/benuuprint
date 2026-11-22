import type { GarmentKind } from "@/features/public-site/garment/types";

/**
 * The real garment models (GLB, served from /public). Pure data: no three.js here, so any page can read it without pulling the
 * 3D chunk. URLs are site-relative so they work behind any host (local, Ubuntu VPS, CDN in front of Next).
 *
 * Every file is an optimized copy of a supplied source model (originals untouched, see docs/FRONTEND_PHASE_10_3D_GARMENTS.md):
 * meshopt-compressed geometry, WebP textures, simplified where the source was far above a web budget. All face +Z, Y up.
 *
 * `colour.materials` lists the materials that are garment fabric and may be recoloured. Everything else (buttons, zip sliders,
 * drawcord stoppers, labels) keeps its original material.
 */
export type ColourSupport =
  | { mode: "recolor"; materials: readonly string[] }
  /** The model's look lives in a baked texture (washed denim, a printed graphic): recolouring would misrepresent it. */
  | { mode: "original"; reason: "baked-denim" | "baked-print" };

export interface GarmentModelSpec {
  kind: GarmentKind;
  src: string;
  /** Size on disk, for loading budgets and the docs. */
  bytes: number;
  /** The supplied file this was optimized from. */
  sourceFile: string;
  colour: ColourSupport;
  /** Materials that form the printable outer fabric (decals are only projected onto these). */
  printSurface: readonly string[];
}

export const GARMENT_MODELS: Partial<Record<GarmentKind, GarmentModelSpec>> = {
  tshirt: {
    kind: "tshirt", src: "/models/garments/tshirt.glb", bytes: 726_400, sourceFile: "t_shirt.glb",
    // Body, sleeves and neck rib share one untextured white fabric material.
    colour: { mode: "recolor", materials: ["Body_FRONT_2664"] }, printSurface: ["Body_FRONT_2664"],
  },
  hoodie: {
    kind: "hoodie", src: "/models/garments/hoodie.glb", bytes: 3_921_348, sourceFile: "hoodiebasemodel_reload.glb",
    // Terry body + rib cuffs/hem recolour; drawcord tips and labels (Material564688/564690) keep their material.
    colour: { mode: "recolor", materials: ["Knit_Terry_FRONT_494551", "Rib2_FRONT_494451"] }, printSurface: ["Knit_Terry_FRONT_494551"],
  },
  polo: {
    kind: "polo", src: "/models/garments/polo.glb", bytes: 1_843_024, sourceFile: "short_sleeve_polo.glb",
    // Canvas body/collar recolours; buttons (Material2279) and the woven label (PT_FABRIC…) do not.
    colour: { mode: "recolor", materials: ["Cotton_Heavy_Canvas_FRONT_232020"] }, printSurface: ["Cotton_Heavy_Canvas_FRONT_232020"],
  },
  jacket: {
    kind: "jacket", src: "/models/garments/jacket.glb", bytes: 2_563_212, sourceFile: "black_jacket_coat.glb",
    // The fleece albedo was normalized to a neutral grey detail map during optimization so it can take any colour.
    // Zip slider and drawcord stoppers keep their material.
    colour: { mode: "recolor", materials: ["uniform_1001"] }, printSurface: ["uniform_1001"],
  },
  bottoms: {
    kind: "bottoms", src: "/models/garments/bottoms-jeans.glb", bytes: 2_909_708, sourceFile: "jnco_twin_cannon_baggy_jeans.glb",
    colour: { mode: "original", reason: "baked-denim" }, printSurface: ["Scene_-_Root"],
  },
  sportswear: {
    kind: "sportswear", src: "/models/garments/sportswear-suit.glb", bytes: 3_878_816, sourceFile: "sport_suit.glb",
    colour: { mode: "original", reason: "baked-print" }, printSurface: ["Cotton_14_Wale_Corduroy_FRONT_72511", "Cotton_14_Wale_Corduroy_FRONT_72495", "Cotton_14_Wale_Corduroy_FRONT_72504"],
  },
};

export const modelFor = (kind: GarmentKind): GarmentModelSpec | null => GARMENT_MODELS[kind] ?? null;
export const canRecolor = (kind: GarmentKind) => modelFor(kind)?.colour.mode === "recolor";
