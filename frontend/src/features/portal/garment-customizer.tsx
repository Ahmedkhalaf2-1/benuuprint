import { modelFor } from "@/features/garment-3d/model-registry";
import type { GarmentKind } from "@/features/public-site/garment";
import type { SampleDetail, SampleOptions } from "./types";
import { garmentKindFor } from "./wizard-ui";

/**
 * Pure helpers that tie a sample's real data (product type, fabric colour) to the 3D garment models. The studio itself lives in
 * `studio.tsx`; nothing here writes to the sample.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The 3D garment for a catalogue product type id. A described custom product (no id) has no model to stand for it. */
export function kindForProductType(options: Pick<SampleOptions, "productTypes">, productTypeId: string | null | undefined): GarmentKind | null {
  const name = productTypeId ? options.productTypes.find((p) => p.id === productTypeId)?.name : null;
  return name ? garmentKindFor(name) : null;
}

/** The 3D garment for a saved sample: catalogue products only, and only when a model exists. */
export function sampleGarmentKind(sample: Pick<SampleDetail, "productName" | "productTypeId">): GarmentKind | null {
  if (!sample.productTypeId || !sample.productName) return null;
  const kind = garmentKindFor(sample.productName);
  return modelFor(kind) ? kind : null;
}

/** Hex of the chosen production colour: the catalogue colour's hex, or the customer's own valid code. Never invented. */
export function colourHex(options: SampleOptions, fabricId: string | null | undefined, fabricColorId: string | null | undefined, customHex: string | null | undefined): string | null {
  const c = options.fabrics.find((f) => f.id === fabricId)?.colors.find((x) => x.id === fabricColorId);
  if (c?.hex && HEX.test(c.hex)) return c.hex;
  return customHex && HEX.test(customHex.trim()) ? customHex.trim() : null;
}

export interface DecorationPrefill { placement: string; side: string; artwork: File | null }
