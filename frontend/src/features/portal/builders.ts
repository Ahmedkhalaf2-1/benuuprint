import type { SampleBody, SampleDetail, SampleOptions } from "./types";

/**
 * Pure form-state ⇄ API-body mapping for the sample request steps. Catalogue and custom choices are mutually exclusive on the
 * backend ("productTypeId OR customProductName"…), so switching modes always sends `null` for the other side. Fields the customer
 * DTO does not have (e.g. factoryInstructions) can never be produced here.
 */
const t = (v: string) => (v.trim() === "" ? null : v.trim());

export interface ProductState { mode: "catalog" | "custom"; productTypeId: string; customName: string; customDescription: string }
export const productState = (s: SampleDetail): ProductState => ({ mode: s.customProductName && !s.productTypeId ? "custom" : "catalog", productTypeId: s.productTypeId ?? "", customName: s.customProductName ?? "", customDescription: s.customProductDescription ?? "" });
export function productBody(f: ProductState): SampleBody {
  return f.mode === "catalog"
    ? { productTypeId: f.productTypeId || null, customProductName: null, customProductDescription: null }
    : { productTypeId: null, customProductName: t(f.customName), customProductDescription: t(f.customDescription) };
}
export function productProblems(f: ProductState): string[] {
  if (f.mode === "catalog") return [];
  return f.customName.trim() ? [] : ["Give your product a name"];
}

export interface FabricState {
  provider: string; fabricMode: "catalog" | "custom"; fabricId: string; customFabricName: string; customFabricDescription: string;
  colorMode: "catalog" | "custom"; fabricColorId: string; customColorName: string; customPantone: string; customHex: string; gsm: string; fabricNotes: string;
}
export const fabricState = (s: SampleDetail): FabricState => ({
  provider: s.fabricProvider ?? "", fabricMode: s.customFabricName && !s.fabricId ? "custom" : "catalog", fabricId: s.fabricId ?? "", customFabricName: s.customFabricName ?? "", customFabricDescription: s.customFabricDescription ?? "",
  colorMode: s.customColorName && !s.fabricColorId ? "custom" : "catalog", fabricColorId: s.fabricColorId ?? "", customColorName: s.customColorName ?? "", customPantone: s.customPantone ?? "", customHex: s.customHex ?? "", gsm: s.gsm != null ? String(s.gsm) : "", fabricNotes: s.fabricNotes ?? "",
});
export function fabricBody(f: FabricState): SampleBody {
  const custom = f.fabricMode === "custom";
  const colourCustom = custom || f.colorMode === "custom"; // a custom fabric has no catalogue colours
  const gsm = f.gsm.trim() === "" ? null : Number(f.gsm);
  return {
    ...(f.provider ? { fabricProvider: f.provider } : {}),
    ...(custom ? { fabricId: null, customFabricName: t(f.customFabricName), customFabricDescription: t(f.customFabricDescription) } : { fabricId: f.fabricId || null, customFabricName: null, customFabricDescription: null }),
    ...(colourCustom ? { fabricColorId: null, customColorName: t(f.customColorName), customPantone: t(f.customPantone), customHex: t(f.customHex) } : { fabricColorId: f.fabricColorId || null, customColorName: null, customPantone: null, customHex: null }),
    gsm: gsm !== null && Number.isFinite(gsm) ? gsm : null,
    fabricNotes: t(f.fabricNotes),
  };
}
export function fabricProblems(f: FabricState): string[] {
  const out: string[] = [];
  if (f.fabricMode === "custom" && !f.customFabricName.trim()) out.push("Give your fabric a name");
  if ((f.fabricMode === "custom" || f.colorMode === "custom") && f.customHex.trim() && !/^#[0-9a-fA-F]{6}$/.test(f.customHex.trim())) out.push("Colour code must look like #1A2B3C");
  if (f.gsm.trim() && !(Number(f.gsm) > 0)) out.push("Fabric weight must be a positive number");
  return out;
}

export interface SizeState { sizeId: string; fitMethod: string; patternVersionId: string; fitNotes: string }
export const sizeState = (s: SampleDetail): SizeState => ({ sizeId: s.size?.id ?? "", fitMethod: s.fitMethod ?? "", patternVersionId: s.pattern?.patternVersionId ?? "", fitNotes: s.fitNotes ?? "" });
export function sizeBody(f: SizeState): SampleBody {
  return {
    sampleSizeOptionId: f.sizeId || null,
    ...(f.fitMethod ? { fitMethod: f.fitMethod } : {}),
    // a pattern only makes sense with the Benuu Print pattern fit method
    patternVersionId: f.fitMethod === "BENUE_PATTERN" && f.patternVersionId ? f.patternVersionId : null,
    fitNotes: t(f.fitNotes),
  };
}

export interface NotesState { notes: string; specialInstructions: string; printNotes: string }
export const notesState = (s: SampleDetail): NotesState => ({ notes: s.notes ?? "", specialInstructions: s.specialInstructions ?? "", printNotes: s.printNotes ?? "" });
export const notesBody = (f: Pick<NotesState, "notes" | "specialInstructions">): SampleBody => ({ notes: t(f.notes), specialInstructions: t(f.specialInstructions) });

/** Fabrics offered for a product type: never the ones the catalogue marks as not allowed for it; recommended first. */
export function fabricsFor(options: SampleOptions | undefined, productTypeId: string | null | undefined) {
  const all = options?.fabrics ?? [];
  if (!productTypeId) return all;
  const link = (f: (typeof all)[number]) => f.productTypes.find((p) => p.productTypeId === productTypeId);
  return all.filter((f) => link(f)?.isAllowed !== false).sort((a, b) => Number(!!link(b)?.isRecommended) - Number(!!link(a)?.isRecommended));
}
export const patternsFor = (options: SampleOptions | undefined, productTypeId: string | null | undefined) => (options?.patterns ?? []).filter((p) => !productTypeId || p.productTypeId === productTypeId);
