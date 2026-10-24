import { z } from "zod";
import { FABRIC_PROVIDERS, FIT_METHODS } from "./types";
import type { SampleBody } from "./api";
import type { SampleDetail } from "./types";

/**
 * Draft-level validation only: format and length. Completeness (product present, fabric, colour, size, fit, pattern,
 * terms, artwork…) is the backend's submit-time check and is NOT enforced on every draft save.
 */
const text = (max: number) => z.string().trim().max(max, `At most ${max} characters`);

export const sampleSchema = z.object({
  customerId: z.string().min(1, "Choose a customer"),
  brandId: z.string().min(1, "Choose a brand"),
  productMode: z.enum(["catalogue", "custom"]),
  productTypeId: z.string(),
  customProductName: text(120),
  customProductDescription: text(1000),
  fabricMode: z.enum(["catalogue", "custom"]),
  fabricId: z.string(),
  customFabricName: text(120),
  customFabricDescription: text(1000),
  colorMode: z.enum(["catalogue", "custom"]),
  fabricColorId: z.string(),
  customColorName: text(80),
  customPantone: text(40),
  customHex: z.string().trim().refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), "Use a hex colour like #1A2B3C"),
  fabricProvider: z.enum(FABRIC_PROVIDERS),
  gsm: z.string().trim().refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) > 0), "Enter a whole number above 0"),
  sampleSizeOptionId: z.string(),
  fitMethod: z.enum(FIT_METHODS),
  patternVersionId: z.string(),
  notes: text(2000),
  fitNotes: text(2000),
  printNotes: text(2000),
  fabricNotes: text(2000),
  specialInstructions: text(2000),
  factoryInstructions: text(4000),
});
export type SampleFormValues = z.infer<typeof sampleSchema>;
export const SAMPLE_FIELDS = Object.keys(sampleSchema.shape);

export const emptySampleValues: SampleFormValues = {
  customerId: "", brandId: "", productMode: "catalogue", productTypeId: "", customProductName: "", customProductDescription: "",
  fabricMode: "catalogue", fabricId: "", customFabricName: "", customFabricDescription: "", colorMode: "catalogue", fabricColorId: "",
  customColorName: "", customPantone: "", customHex: "", fabricProvider: "NOT_DECIDED", gsm: "", sampleSizeOptionId: "",
  fitMethod: "NOT_SURE", patternVersionId: "", notes: "", fitNotes: "", printNotes: "", fabricNotes: "", specialInstructions: "", factoryInstructions: "",
};

export function toFormValues(s: SampleDetail): SampleFormValues {
  return {
    customerId: s.customer.id,
    brandId: s.brand.id,
    productMode: !s.productType && s.customProductName ? "custom" : "catalogue",
    productTypeId: s.productType?.id ?? "",
    customProductName: s.customProductName ?? "",
    customProductDescription: s.customProductDescription ?? "",
    fabricMode: !s.fabric && s.customFabricName ? "custom" : "catalogue",
    fabricId: s.fabric?.id ?? "",
    customFabricName: s.customFabricName ?? "",
    customFabricDescription: s.customFabricDescription ?? "",
    colorMode: !s.fabricColor && (s.customColorName || s.customPantone || s.customHex) ? "custom" : "catalogue",
    fabricColorId: s.fabricColor?.id ?? "",
    customColorName: s.customColorName ?? "",
    customPantone: s.customPantone ?? "",
    customHex: s.customHex ?? "",
    fabricProvider: s.fabricProvider,
    gsm: s.gsm != null ? String(s.gsm) : "",
    sampleSizeOptionId: s.sampleSize?.id ?? "",
    fitMethod: s.fitMethod,
    patternVersionId: s.patternVersion?.id ?? "",
    notes: s.notes ?? "", fitNotes: s.fitNotes ?? "", printNotes: s.printNotes ?? "", fabricNotes: s.fabricNotes ?? "",
    specialInstructions: s.specialInstructions ?? "", factoryInstructions: s.factoryInstructions ?? "",
  };
}

const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

/**
 * Builds the API body.
 * - create: empty fields are omitted.
 * - update: every spec field is sent, `null` clearing it. Catalogue/custom pairs are switched EXPLICITLY (the API rejects
 *   "both" and never auto-fixes), and patternVersionId is cleared unless the fit is BENUE_PATTERN.
 */
export function buildSamplePayload(v: SampleFormValues, mode: "create" | "update", opts: { includeBrand?: boolean } = {}): SampleBody {
  const cat = (m: string, id: string) => (m === "catalogue" ? orNull(id) : null);
  const cus = (m: string, val: string) => (m === "custom" ? orNull(val) : null);
  const spec: SampleBody = {
    productTypeId: cat(v.productMode, v.productTypeId),
    customProductName: cus(v.productMode, v.customProductName),
    customProductDescription: cus(v.productMode, v.customProductDescription),
    fabricId: cat(v.fabricMode, v.fabricId),
    customFabricName: cus(v.fabricMode, v.customFabricName),
    customFabricDescription: cus(v.fabricMode, v.customFabricDescription),
    // a catalogue colour only exists for a catalogue fabric
    fabricColorId: v.fabricMode === "catalogue" && v.colorMode === "catalogue" ? orNull(v.fabricColorId) : null,
    customColorName: cus(v.colorMode, v.customColorName),
    customPantone: cus(v.colorMode, v.customPantone),
    customHex: cus(v.colorMode, v.customHex),
    fabricProvider: v.fabricProvider,
    gsm: v.gsm.trim() === "" ? null : Number(v.gsm),
    sampleSizeOptionId: orNull(v.sampleSizeOptionId),
    fitMethod: v.fitMethod,
    patternVersionId: v.fitMethod === "BENUE_PATTERN" ? orNull(v.patternVersionId) : null,
    notes: orNull(v.notes), fitNotes: orNull(v.fitNotes), printNotes: orNull(v.printNotes), fabricNotes: orNull(v.fabricNotes),
    specialInstructions: orNull(v.specialInstructions), factoryInstructions: orNull(v.factoryInstructions),
  };
  if (mode === "update") return opts.includeBrand ? { brandId: v.brandId, ...spec } : spec;
  const body: SampleBody = { customerId: v.customerId, brandId: v.brandId };
  for (const [k, val] of Object.entries(spec)) if (val !== null) body[k] = val;
  return body;
}

/** Maps a backend submit message ("<area>: …") to the form section it belongs to. */
export function sectionForProblem(message: string): string {
  const area = (message.split(":")[0] ?? "").toLowerCase();
  if (/customer|brand/.test(area)) return "sec-customer";
  if (/product/.test(area)) return "sec-product";
  if (/fabric|gsm|colou?r/.test(area)) return "sec-fabric";
  if (/size|fit|pattern/.test(area)) return "sec-size";
  if (/decoration|artwork|print/.test(area)) return "sec-decoration";
  if (/accessor|component|packag|label/.test(area)) return "sec-accessories";
  if (/attachment|file|asset/.test(area)) return "sec-files";
  if (/terms/.test(area)) return "sec-terms";
  return "sec-review";
}
