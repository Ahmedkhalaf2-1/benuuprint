export const CUSTOM = "__custom";
export const NONE = "__none";

/** One editable variant row (colour × size × quantity); ids are kept so history stays valid when an order is saved. */
export interface Row { key: number; id?: string; size: string; customSize: string; color: string; customColor: string; pantone: string; hex: string; quantity: string }
export interface ColorDef { key: string; label: string; hex: string | null; /** catalogue colour id, or null for a custom colour */ id: string | null; pantone?: string | null }

export const intOk = (v: string) => /^\d+$/.test(v.trim()) && Number(v) > 0;
const qty = (r: Row) => (intOk(r.quantity) ? Number(r.quantity) : 0);

/** Stable key of a row's colour: the catalogue id, or the lower-cased custom name. */
export const colorKeyOf = (r: Row) => (r.color === CUSTOM ? (r.customColor.trim() ? `custom:${r.customColor.trim().toLowerCase()}` : NONE) : r.color);
/** A row the matrix can show: a catalogue size and a (catalogue or named custom) colour. */
export const inMatrix = (r: Row) => r.size !== NONE && r.size !== CUSTOM && colorKeyOf(r) !== NONE;

/** Colours to list as matrix rows: catalogue colours of the fabric, plus any custom colour already used (or added). */
export function matrixColors(catalog: Array<{ id: string; name: string; hex: string | null; pantone?: string | null }>, rows: Row[], extra: ColorDef[] = []): ColorDef[] {
  const out: ColorDef[] = catalog.map((c) => ({ key: c.id, label: c.name, hex: c.hex, id: c.id, pantone: c.pantone }));
  const seen = new Set(out.map((c) => c.key));
  for (const r of rows) {
    const k = colorKeyOf(r);
    if (k === NONE || seen.has(k)) continue;
    seen.add(k);
    out.push({ key: k, label: r.color === CUSTOM ? r.customColor.trim() : k, hex: r.hex || null, id: null, pantone: r.pantone || null });
  }
  for (const c of extra) if (!seen.has(c.key)) { seen.add(c.key); out.push(c); }
  return out;
}

export const cellQuantity = (rows: Row[], colorKey: string, sizeId: string) => rows.filter((r) => r.size === sizeId && colorKeyOf(r) === colorKey).reduce((n, r) => n + qty(r), 0);

/** Sets one cell. Zero / empty removes the variant; an existing row keeps its id (and notes), otherwise a new row is added. */
export function setCell(rows: Row[], color: ColorDef, sizeId: string, value: string, nextKey: () => number): Row[] {
  const idx = rows.findIndex((r) => r.size === sizeId && colorKeyOf(r) === color.key);
  if (idx >= 0) {
    if (!intOk(value)) return value.trim() === "" || Number(value) === 0 ? rows.filter((_, i) => i !== idx) : rows.map((r, i) => (i === idx ? { ...r, quantity: value } : r));
    return rows.map((r, i) => (i === idx ? { ...r, quantity: value } : r));
  }
  if (!intOk(value)) return rows;
  return [...rows, { key: nextKey(), size: sizeId, customSize: "", color: color.id ?? CUSTOM, customColor: color.id ? "" : color.label, pantone: color.pantone ?? "", hex: color.hex ?? "", quantity: value }];
}

export interface MatrixTotals { byColor: Record<string, number>; bySize: Record<string, number>; grand: number; outside: number }
/** Totals the user sees under/next to the matrix. `outside` = units in variants the matrix cannot show (no size, custom size, no colour). */
export function matrixTotals(rows: Row[], colors: ColorDef[], sizeIds: string[]): MatrixTotals {
  const byColor: Record<string, number> = {};
  const bySize: Record<string, number> = {};
  let grand = 0;
  let outside = 0;
  for (const r of rows) {
    const q = qty(r);
    if (!q) continue;
    grand += q;
    const k = colorKeyOf(r);
    if (inMatrix(r) && colors.some((c) => c.key === k) && sizeIds.includes(r.size)) {
      byColor[k] = (byColor[k] ?? 0) + q;
      bySize[r.size] = (bySize[r.size] ?? 0) + q;
    } else outside += q;
  }
  return { byColor, bySize, grand, outside };
}
