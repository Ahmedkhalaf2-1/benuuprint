"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { StartSampleLink } from "./cta";
import { BuilderGarmentPreview, type DecorationVisualKey, type FabricVisualKey, type GarmentKind } from "./garment";
import { Section, SectionIntro } from "./primitives";

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
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={cn("inline-flex h-11 shrink-0 items-center gap-2 border px-4 text-sm transition-all active:scale-[0.97] sm:h-10 sm:active:scale-100 sm:active:translate-y-px", selected ? "border-pub-brand bg-pub-brand-deep/20 text-pub-text" : "border-pub-line text-pub-muted hover:border-pub-muted hover:text-pub-text")}>
      {swatch ? <span aria-hidden className="size-3.5 rounded-full border border-white/20" style={{ background: swatch }} /> : null}{label}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div role="radiogroup" aria-label={label}><p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-pub-muted">{label}</p><div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">{children}</div></div>;
}

export function BuilderPreview({ modelSrc = null }: { modelSrc?: string | null }) {
  const [product, setProduct] = useState<(typeof PREVIEW_OPTIONS.Product)[number]>(PREVIEW_OPTIONS.Product[0]);
  const [fabric, setFabric] = useState<(typeof PREVIEW_OPTIONS.Fabric)[number]>(PREVIEW_OPTIONS.Fabric[0]);
  const [colour, setColour] = useState<(typeof PREVIEW_OPTIONS.Colour)[number]>(PREVIEW_OPTIONS.Colour[0]);
  const [decoration, setDecoration] = useState<(typeof PREVIEW_OPTIONS.Decoration)[number]>(PREVIEW_OPTIONS.Decoration[0]);
  const [qty, setQty] = useState<number>(250);

  const spec: Array<[string, string]> = [["Product", product.name], ["Fabric", fabric.name], ["Colour", colour.name], ["Decoration", decoration.name], ["Quantity", String(qty)]];

  return (
    <Section id="builder" labelledBy="builder-title" className="bg-pub-bg">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <SectionIntro eyebrow="04 — Sample builder" title={<span id="builder-title">Build it before we make it.</span>}>
          Choose the garment, fabric, colour and decoration. This is a preview — your real sample request starts in your account.
        </SectionIntro>
      </div>
      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] border border-pub-line sm:mt-14 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="order-2 space-y-7 border-pub-line p-6 sm:p-8 lg:order-1 lg:border-e">
          <Group label="Product">{PREVIEW_OPTIONS.Product.map((o) => <Choice key={o.name} label={o.name} selected={product.name === o.name} onSelect={() => setProduct(o)} />)}</Group>
          <Group label="Fabric">{PREVIEW_OPTIONS.Fabric.map((o) => <Choice key={o.name} label={o.name} selected={fabric.name === o.name} onSelect={() => setFabric(o)} />)}</Group>
          <Group label="Colour">{PREVIEW_OPTIONS.Colour.map((o) => <Choice key={o.name} label={o.name} swatch={o.hex} selected={colour.name === o.name} onSelect={() => setColour(o)} />)}</Group>
          <Group label="Decoration">{PREVIEW_OPTIONS.Decoration.map((o) => <Choice key={o.name} label={o.name} selected={decoration.name === o.name} onSelect={() => setDecoration(o)} />)}</Group>
          <Group label="Quantity">{QUANTITIES.map((q) => <Choice key={q} label={String(q)} selected={qty === q} onSelect={() => setQty(q)} />)}</Group>
          <div data-cta-end className="space-y-4 border-t border-pub-line pt-6 lg:hidden">
            <p data-testid="builder-summary-mobile" className="text-sm leading-relaxed text-pub-muted"><span className="text-pub-text">{product.name}</span> · {fabric.name} · {colour.name} · {decoration.name} · {qty} pcs</p>
            <StartSampleLink className="h-14 w-full">Build yours</StartSampleLink>
          </div>
        </div>
        <div className="order-1 grid gap-8 border-b border-pub-line bg-pub-surface p-3 max-lg:sticky max-lg:top-16 max-lg:z-20 sm:p-8 lg:order-2 lg:border-b-0 xl:grid-cols-[1fr_15rem]">
          <div className="mx-auto w-full max-w-lg max-lg:max-w-[min(100%,34svh)] sm:max-lg:max-w-lg">
            <BuilderGarmentPreview modelSrc={modelSrc} productType={product.kind} colour={colour.hex} fabric={fabric.key} decoration={decoration.key} />
          </div>
          <div className="flex flex-col justify-between gap-8 max-lg:hidden">
            <dl data-testid="builder-summary" className="divide-y divide-pub-line border-y border-pub-line text-sm">
              {spec.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted">{k}</dt><dd className="text-end text-pub-text">{v}</dd></div>)}
            </dl>
            <StartSampleLink>Build yours</StartSampleLink>
          </div>
        </div>
      </div>
    </Section>
  );
}
