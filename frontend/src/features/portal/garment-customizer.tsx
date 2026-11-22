"use client";

import { Box, Brush, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { canRecolor, modelFor } from "@/features/garment-3d/model-registry";
import { PLACEMENT_LABEL, PLACEMENT_SIDE, type PlacementId, type PlacementStatus } from "@/features/garment-3d/placement-config";
import { usePlacementView, usePrintDesign, type PrintLayer } from "@/features/garment-3d/print-design";
import { InteractiveGarment, PrintControls, type GarmentKind } from "@/features/public-site/garment";
import type { SampleDetail, SampleOptions } from "./types";
import { GroupCard, garmentKindFor } from "./wizard-ui";
import { useI18n } from "@/i18n/provider";

/**
 * 3D preview inside the real sample request. VISUAL ONLY: it reads the sample's product and colour, and its design state lives
 * in memory for this session (keyed by sample id). It never writes to the sample by itself: placements become real decorations
 * only through the existing decoration dialog, and artwork is uploaded only when the customer adds it to a decoration.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;
/** The 3D garment for a sample: catalogue products only (a described custom product has no model to stand for it). */
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

const Stage = ({ children }: { children: React.ReactNode }) => <div className="pub rounded-md border border-pub-line p-3 sm:p-4">{children}</div>;

/** Fabric & colour step: the garment in the colour being picked (live, before saving). */
export function ColourPreview3D({ kind, hex }: { kind: GarmentKind; hex: string | null }) {
  const { t } = useI18n();
  const recolor = canRecolor(kind);
  return (
    <GroupCard icon={<Box />} title={t("customer.preview3dTitle")} help={recolor ? t("customer.preview3dColourHelp") : t("customer.preview3dOriginalMaterial")}>
      <Stage>
        <div className="mx-auto aspect-square w-full max-w-sm" data-testid="colour-preview-3d"><InteractiveGarment productType={kind} colour={recolor ? hex ?? undefined : undefined} fabric="jersey" controls="full" /></div>
      </Stage>
      <p className="text-xs text-muted-foreground">{t("site.preview3dDisclaimer")}</p>
    </GroupCard>
  );
}

export interface DecorationPrefill { placement: string; side: string; artwork: File | null }

/** Decoration step: try artwork on the garment, then turn a placement into a real decoration through the existing dialog. */
export function DesignPreview3D({ sample, options, kind, onAdd }: { sample: SampleDetail; options: SampleOptions; kind: GarmentKind; onAdd: (p: DecorationPrefill) => void }) {
  const { t } = useI18n();
  const design = usePrintDesign(kind, `sample:${sample.id}`);
  const [view, setView] = usePlacementView(kind, design.active);
  const [status, setStatus] = useState<PlacementStatus>({});
  const prints = useMemo(() => Object.values(design.layers).filter((l): l is PrintLayer => !!l), [design.layers]);
  const hex = canRecolor(kind) ? colourHex(options, sample.fabricId, sample.fabricColorId, sample.customHex) : null;
  const active = design.active;
  const layer = active ? design.layers[active] : undefined;
  const sides = new Set(options.decorationSides.map((s) => s.value));
  const sideFor = (id: PlacementId) => (sides.has(PLACEMENT_SIDE[id]) ? PLACEMENT_SIDE[id] : sides.has("OTHER") ? "OTHER" : "");
  return (
    <GroupCard icon={<Brush />} title={t("customer.designPreviewTitle")} help={t("customer.designPreviewHelp")}>
      <Stage>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="mx-auto aspect-square w-full max-w-md" data-testid="design-preview-3d"><InteractiveGarment productType={kind} colour={hex ?? undefined} fabric="jersey" prints={prints} view={view} onViewChange={setView} onPlacementStatus={setStatus} controls="full" /></div>
          <div className="space-y-5">
            <PrintControls kind={kind} design={design} status={status} />
            {active && layer && status[active] !== "blocked" ? (
              <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => onAdd({ placement: t.text(PLACEMENT_LABEL[active]), side: sideFor(active), artwork: layer.source.type === "artwork" ? layer.source.file : null })}><Plus />{" "}{t("customer.addAsDecoration")}</Button>
            ) : null}
          </div>
        </div>
      </Stage>
    </GroupCard>
  );
}
