import type { ConfigColor, ConfigFabric, SampleOptions } from "./types";

/**
 * Select-friendly option that keeps the full domain record, so forms can show metadata (GSM, colours, fit type,
 * category…) without a second lookup. `value` is always the id to submit.
 */
export interface RefOption<T> {
  value: string;
  label: string;
  /** Short secondary text (code, composition…). */
  hint?: string;
  record: T;
}

export function toOptions<T>(rows: readonly T[] | undefined, pick: (row: T) => { value: string; label: string; hint?: string }): RefOption<T>[] {
  return (rows ?? []).map((record) => ({ ...pick(record), record }));
}

type Coded = { id: string; code: string; name: string };
export const codedOption = <T extends Coded>(row: T) => ({ value: row.id, label: row.name, hint: row.code });

export const productTypeOptions = (o: SampleOptions | undefined) => toOptions(o?.productTypes, codedOption);
export const fabricOptions = (o: SampleOptions | undefined) => toOptions(o?.fabrics, (f) => ({ value: f.id, label: f.name, hint: f.composition ?? f.code }));
export const printMethodOptions = (o: SampleOptions | undefined) => toOptions(o?.printMethods, codedOption);
export const accessoryOptions = (o: SampleOptions | undefined) => toOptions(o?.accessories, codedOption);
export const componentOptions = (o: SampleOptions | undefined) => toOptions(o?.components, codedOption);

/** Colours of one fabric (the configurator embeds them per fabric). */
export function colorOptions(fabric: Pick<ConfigFabric, "colors"> | undefined): RefOption<ConfigColor>[] {
  return toOptions(fabric?.colors, (c) => ({ value: c.id, label: c.name, hint: c.hex ?? undefined }));
}

/** Sizes of one scale, in the order the backend sent them. */
export function sizeOptions(options: SampleOptions | undefined, scaleId: string) {
  const scale = options?.sizeScales.find((s) => s.id === scaleId);
  return toOptions(scale?.sizes, codedOption);
}

/**
 * Patterns the sample form may pick: the backend lists only patterns with an APPROVED version, and the option's value is
 * the pinned **patternVersionId** (samples pin the approved version, not the pattern).
 */
export function patternOptions(o: SampleOptions | undefined, productTypeId?: string) {
  const rows = (o?.patterns ?? []).filter((p) => !productTypeId || p.productTypeId === productTypeId);
  return toOptions(rows, (p) => ({ value: p.patternVersionId, label: `${p.name} (v${p.versionNumber})`, hint: p.referenceNumber }));
}

/**
 * Fabrics for a product type. Compatibility is GUIDANCE: `recommended` is a hint and nothing is hidden. Pass
 * `onlyAllowed` only if the backend rule you are implementing says so.
 */
export function fabricsForProduct(o: SampleOptions | undefined, productTypeId: string, opts: { onlyAllowed?: boolean } = {}) {
  return fabricOptions(o)
    .map((f) => {
      const rel = f.record.productTypes.find((p) => p.productTypeId === productTypeId);
      return { ...f, recommended: rel?.isRecommended === true, allowed: rel ? rel.isAllowed !== false : true };
    })
    .filter((f) => !opts.onlyAllowed || f.allowed)
    .sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

export const choiceOptions = (rows: ReadonlyArray<{ value: string }> | undefined) => toOptions(rows, (c) => ({ value: c.value, label: c.value }));
