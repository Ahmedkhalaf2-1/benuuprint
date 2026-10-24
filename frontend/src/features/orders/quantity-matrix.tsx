"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { ColorSwatch } from "@/components/data-display/color-swatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cellQuantity, colorKeyOf, matrixColors, matrixTotals, setCell, type ColorDef, type Row } from "./matrix";
import { useI18n } from "@/i18n/provider";

/** What the cell shows: the typed text of its row (so partial input is kept), else the stored total. */
const cellText = (rows: Row[], colorKey: string, sizeId: string) => rows.find((r) => r.size === sizeId && colorKeyOf(r) === colorKey)?.quantity ?? (cellQuantity(rows, colorKey, sizeId) ? String(cellQuantity(rows, colorKey, sizeId)) : "");

/**
 * Colour × size quantity grid over the order's variant rows. Ids of the catalogue sizes/colours come from the configurator (never
 * hard-coded labels). The grid never changes the item quantity: totals are shown beside it and the mismatch stays visible.
 */
export function QuantityMatrix({ rows, sizes, colors, nextKey, onChange }: {
  rows: Row[];
  sizes: Array<{ value: string; label: string }>;
  colors: Array<{ id: string; name: string; hex: string | null; pantone?: string | null }>;
  nextKey: () => number;
  onChange: (rows: Row[]) => void;
}) {
  const { t } = useI18n();
  const [extra, setExtra] = useState<ColorDef[]>([]);
  const [name, setName] = useState("");
  const all = matrixColors(colors, rows, extra);
  const sizeIds = sizes.map((s) => s.value);
  const tot = matrixTotals(rows, all, sizeIds);
  return (
    <div className="space-y-2" data-testid="quantity-matrix">
      <div className="relative overflow-x-auto rounded-md border">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">{t("orders.quantityByColourAndSize")}</caption>
          <thead className="bg-surface-muted text-xs text-muted-foreground">
            <tr><th scope="col" className="px-2 py-1.5 text-start font-medium">{t("orders.colour")}</th>{sizes.map((z) => <th key={z.value} scope="col" className="px-1 py-1.5 text-center font-medium">{z.label}</th>)}<th scope="col" className="px-2 py-1.5 text-end font-medium">{t("orders.total")}</th></tr>
          </thead>
          <tbody>
            {all.length === 0 ? <tr><td colSpan={sizes.length + 2} className="px-2 py-4 text-center text-muted-foreground">{t("orders.thisFabricHasNoCatalogueColours")}</td></tr> : all.map((c) => (
              <tr key={c.key} className="border-t" data-testid="matrix-row">
                <th scope="row" className="px-2 py-1 text-start font-medium"><ColorSwatch name={c.label} hex={c.hex} size="sm" /></th>
                {sizes.map((z) => {
                  return <td key={z.value} className="px-0.5 py-0.5"><Input aria-label={`${c.label} ${z.label}`} inputMode="numeric" className="h-8 min-w-12 px-1.5 text-center tabular-nums" value={cellText(rows, c.key, z.value)} onChange={(e) => onChange(setCell(rows, c, z.value, e.target.value, nextKey))} /></td>;
                })}
                <td className="px-2 text-end font-medium tabular-nums" data-testid="row-total">{tot.byColor[c.key] ?? 0}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-surface-muted/60 text-xs">
            <tr><th scope="row" className="px-2 py-1.5 text-start font-medium">{t("orders.total")}</th>{sizes.map((z) => <td key={z.value} className="text-center tabular-nums">{tot.bySize[z.value] ?? 0}</td>)}<td className="px-2 text-end text-sm font-semibold tabular-nums" data-testid="grand-total">{tot.grand}</td></tr>
          </tfoot>
        </table>
      </div>
      {tot.outside > 0 ? <p role="status" className="text-xs text-tone-warning-fg" data-testid="matrix-outside">{t("orders.outsideUnitsAreInVariantsThe", { outside: tot.outside })}</p> : null}
      <div className="flex items-center gap-2">
        <Input aria-label={t("orders.newCustomColour")} className="h-8 max-w-48" placeholder={t("orders.customColourName")} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="button" size="sm" variant="secondary" disabled={!name.trim()} onClick={() => { setExtra((x) => [...x, { key: `custom:${name.trim().toLowerCase()}`, label: name.trim(), hex: null, id: null }]); setName(""); }}><Plus />{" "}{t("orders.addColour")}</Button>
      </div>
    </div>
  );
}
