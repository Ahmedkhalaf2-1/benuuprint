import { makeTranslator, type Translator } from "@/i18n/translate";
import type { OrderDetail, OrderItemsBody } from "./types";

/** Matrix cells are keyed `sizeOptionId|fabricColorId` (empty colour id = the approved colour / size-only row). */
export type Cells = Record<string, string>;
export const cellKey = (sizeId: string, colorId: string) => `${sizeId}|${colorId}`;
const posInt = (v: string) => (/^\d+$/.test(v.trim()) && Number(v) > 0 ? Number(v) : 0);

export const variantSum = (cells: Cells) => Object.values(cells).reduce((n, v) => n + posInt(v), 0);

export function setCellValue(cells: Cells, key: string, value: string): Cells {
  const next = { ...cells };
  if (value.trim() === "" || Number(value) === 0) delete next[key];
  else next[key] = value;
  return next;
}

/** Existing draft → cells. Real ids only; nothing is invented. */
export function cellsFromOrder(o: Pick<OrderDetail, "items">): Cells {
  const out: Cells = {};
  for (const it of o.items) for (const v of it.variants) if (v.sizeOptionId) out[cellKey(v.sizeOptionId, v.fabricColorId ?? "")] = String(v.quantity);
  return out;
}

export interface ItemsCheck { state: "empty" | "ok" | "mismatch" | "invalid"; total: number; sum: number; message: string | null }

/** The total is never adjusted for the customer: a mismatch is reported and blocks saving the breakdown. */
export function checkItems(totalInput: string, cells: Cells, t: Translator = makeTranslator("en")): ItemsCheck {
  const sum = variantSum(cells);
  const hasTotal = totalInput.trim() !== "";
  if (!hasTotal && sum === 0) return { state: "empty", total: 0, sum, message: null };
  const total = posInt(totalInput);
  if (hasTotal && total === 0) return { state: "invalid", total, sum, message: t("customer.enterWholeUnits") };
  if (total !== sum) return { state: "mismatch", total, sum, message: sum === 0 ? t("customer.addUnitsPerSize") : t("customer.breakdownMismatch", { sum, total }) };
  return { state: "ok", total, sum, message: null };
}

export function itemsBody(totalInput: string, cells: Cells, notes?: string): OrderItemsBody {
  const variants = Object.entries(cells).flatMap(([key, v]) => {
    const quantity = posInt(v);
    if (!quantity) return [];
    const [sizeOptionId, colorId] = key.split("|");
    return [{ sizeOptionId, ...(colorId ? { fabricColorId: colorId } : {}), quantity }];
  });
  return { quantity: posInt(totalInput), variants, ...(notes?.trim() ? { notes: notes.trim() } : {}) };
}

export const toIsoDate = (d: string) => new Date(d).toISOString();
export const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
