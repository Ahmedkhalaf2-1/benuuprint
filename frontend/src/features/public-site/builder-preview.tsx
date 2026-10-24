"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { StartSampleLink } from "./cta";
import { BuilderGarmentPreview, type DecorationVisualKey, type FabricVisualKey, type GarmentKind } from "./garment";
import { Section, SectionIntro } from "./primitives";
import { useI18n } from "@/i18n/provider";

/**
 * MARKETING PREVIEW ONLY. Local state, no network, no storage: it never creates or saves a sample.
 * The real builder lives behind /account/samples/new. Each option carries the presentation token the garment visual consumes
 * (and a future 3D viewer would consume the same state).
 */
export const PREVIEW_OPTIONS = {
  Product: [{ name: "T-Shirt", kind: "tshirt" }, { name: "Hoodie", kind: "hoodie" }, { name: "Sweatshirt", kind: "sweatshirt" }, { name: "Polo", kind: "polo" }],
  Fabric: [{ name: "Heavyweight Cotton", key: "twill" }, { name: "Cotton Jersey", key: "jersey" }, { name: "Brushed Fleece", key: "brushed" }],
  Colour: [{ name: "Black", hex: "#17191a" }, { name: "Bone", hex: "#d9d2c3" }, { name: "Forest", hex: "#12453a" }, { name: "Navy", hex: "#1b2a4a" }],
  Decoration: [{ name: "Embroidery", key: "embroidery" }, { name: "Screen Print", key: "screen-print" }, { name: "DTF", key: "dtf" }, { name: "Puff", key: "puff" }, { name: "Sublimation", key: "sublimation" }],
} as const satisfies {
  Product: ReadonlyArray<{ name: string; kind: GarmentKind }>;
  Fabric: ReadonlyArray<{ name: string; key: FabricVisualKey }>;
  Colour: ReadonlyArray<{ name: string; hex: string }>;
  Decoration: ReadonlyArray<{ name: string; key: DecorationVisualKey }>;
};
const QUANTITIES = [50, 100, 250, 500] as const;

function Choice({ label, selected, onSelect, swatch }: { label: string; selected: boolean; onSelect: () => void; swatch?: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={cn("inline-flex h-10 shrink-0 items-center gap-2 border px-3 text-[0.8125rem] transition-all active:scale-[0.97] sm:px-4 sm:text-sm sm:active:scale-100 sm:active:translate-y-px", selected ? "border-pub-brand bg-pub-brand-deep/25 text-pub-text shadow-[inset_0_-2px_0_var(--pub-brand)]" : "border-pub-line text-pub-muted hover:border-pub-muted hover:text-pub-text")}>
      {swatch ? <span aria-hidden className="size-3.5 rounded-full border border-white/20" style={{ background: swatch }} /> : null}{label}
    </button>
  );
}

/** Phones: choices wrap (everything visible, no hidden strips); the current pick is echoed beside the numbered label. */
function Group({ label, index, value, children }: { label: string; index: number; value: string; children: React.ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="mb-2.5 flex items-baseline justify-between gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-pub-muted sm:mb-3">
        <span><span className="text-pub-brand">{String(index).padStart(2, "0")}</span> · {label}</span>
        <span aria-hidden className="truncate normal-case tracking-normal text-pub-text/70 lg:hidden">{value}</span>
      </p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">{children}</div>
    </div>
  );
}

export function BuilderPreview({ modelSrc = null }: { modelSrc?: string | null }) {
  const { t } = useI18n();
  const [product, setProduct] = useState<(typeof PREVIEW_OPTIONS.Product)[number]>(PREVIEW_OPTIONS.Product[0]);
  const [fabric, setFabric] = useState<(typeof PREVIEW_OPTIONS.Fabric)[number]>(PREVIEW_OPTIONS.Fabric[0]);
  const [colour, setColour] = useState<(typeof PREVIEW_OPTIONS.Colour)[number]>(PREVIEW_OPTIONS.Colour[0]);
  const [decoration, setDecoration] = useState<(typeof PREVIEW_OPTIONS.Decoration)[number]>(PREVIEW_OPTIONS.Decoration[0]);
  const [qty, setQty] = useState<number>(250);

  const spec: Array<[string, string]> = [[t.text("Product"), t.text(product.name)], [t.text("Fabric"), t.text(fabric.name)], [t.text("Colour"), t.text(colour.name)], [t.text("Decoration"), t.text(decoration.name)], [t.text("Quantity"), String(qty)]];

  return (
    <Section id="builder" labelledBy="builder-title" className="bg-pub-bg">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <SectionIntro eyebrow={t("site.n04SampleBuilder")} title={<span id="builder-title">{t("site.buildItBeforeWeMakeIt")}</span>}>{t("site.chooseTheGarmentFabricColourAnd")}</SectionIntro>
      </div>
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] border border-pub-line sm:mt-14 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="order-2 space-y-6 border-pub-line p-5 sm:space-y-7 sm:p-8 lg:order-1 lg:border-e">
          <Group label={t("common.product")} index={1} value={t.text(product.name)}>{PREVIEW_OPTIONS.Product.map((o) => <Choice key={o.name} label={t.text(o.name)} selected={product.name === o.name} onSelect={() => setProduct(o)} />)}</Group>
          <Group label={t("common.fabric")} index={2} value={t.text(fabric.name)}>{PREVIEW_OPTIONS.Fabric.map((o) => <Choice key={o.name} label={t.text(o.name)} selected={fabric.name === o.name} onSelect={() => setFabric(o)} />)}</Group>
          <Group label={t("common.colour")} index={3} value={t.text(colour.name)}>{PREVIEW_OPTIONS.Colour.map((o) => <Choice key={o.name} label={t.text(o.name)} swatch={o.hex} selected={colour.name === o.name} onSelect={() => setColour(o)} />)}</Group>
          <Group label={t("site.decoration")} index={4} value={t.text(decoration.name)}>{PREVIEW_OPTIONS.Decoration.map((o) => <Choice key={o.name} label={t.text(o.name)} selected={decoration.name === o.name} onSelect={() => setDecoration(o)} />)}</Group>
          <Group label={t("common.quantity")} index={5} value={String(qty)}>{QUANTITIES.map((q) => <Choice key={q} label={String(q)} selected={qty === q} onSelect={() => setQty(q)} />)}</Group>
          <div data-cta-end className="border-t border-pub-line pt-5 lg:hidden">
            <StartSampleLink className="h-14 w-full">{t("site.buildYours")}</StartSampleLink>
            <p className="mt-3 text-center text-xs text-pub-muted">{t("site.previewOnlyYourRealSampleRequest")}</p>
          </div>
        </div>
        <div className="order-1 grid gap-8 border-b border-pub-line bg-pub-surface p-3 max-lg:sticky max-lg:top-16 max-lg:z-20 max-lg:gap-2 max-lg:bg-pub-surface/95 max-lg:backdrop-blur sm:p-8 lg:order-2 lg:border-b-0 xl:grid-cols-[1fr_15rem]">
          <div className="mx-auto w-full max-w-lg max-lg:max-w-[min(100%,24svh)] sm:max-lg:max-w-lg">
            <BuilderGarmentPreview modelSrc={modelSrc} productType={product.kind} colour={colour.hex} fabric={fabric.key} decoration={decoration.key} />
          </div>
          <p data-testid="builder-summary-mobile" className="truncate pb-1 text-center font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-pub-muted lg:hidden"><span className="text-pub-text">{t.text(product.name)}</span> · {t.text(fabric.name)} · {t.text(colour.name)} · {t.text(decoration.name)} · {qty}</p>
          <div className="flex flex-col justify-between gap-8 max-lg:hidden">
            <dl data-testid="builder-summary" className="divide-y divide-pub-line border-y border-pub-line text-sm">
              {spec.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted">{k}</dt><dd className="text-end text-pub-text">{v}</dd></div>)}
            </dl>
            <StartSampleLink>{t("site.buildYours")}</StartSampleLink>
          </div>
        </div>
      </div>
    </Section>
  );
}
