import { PRODUCT_DETAILS } from "../content-pages";
import { StartSampleLink } from "../cta";
import { GarmentCarousel } from "../garment-carousel";
import { GarmentPreview } from "../garment";
import { PageHero, PublicCta } from "../page-shell";

/** Garment families. Each visual is a `GarmentPreview`, so future 3D models arrive through the same boundary. */
export function ProductsPage() {
  return (
    <main>
      <PageHero eyebrow="Products" title={<>Start with <span className="text-pub-brand">the garment.</span></>} lede="Eight families we make. Pick the closest one for your idea, or start with a custom piece." outline="Wear" field />
      <section aria-labelledby="prod-families" className="border-b border-pub-line px-5 py-10 sm:px-8 lg:hidden">
        <h2 id="prod-families" className="sr-only">Garment families</h2>
        <GarmentCarousel label="Garment families" items={PRODUCT_DETAILS.map((p) => ({ name: p.name, kind: p.kind, lines: [p.useCase, p.customise] }))} />
      </section>
      <ol className="hidden lg:block">
        {PRODUCT_DETAILS.map((p, i) => (
          <li key={p.kind} id={p.kind} className="scroll-mt-20 border-b border-pub-line">
            <article aria-labelledby={`prod-${p.kind}`} className="mx-auto grid w-full max-w-[88rem] items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-24 lg:px-12">
              <div className={i % 2 ? "lg:order-2" : undefined}>
                <div className="relative border border-pub-line bg-pub-surface p-8 sm:p-12">
                  <span className="absolute start-4 top-4 font-mono text-xs text-pub-muted">{String(i + 1).padStart(2, "0")}</span>
                  <GarmentPreview productType={p.kind} colour="#2b302e" fabric={p.kind === "jacket" || p.kind === "bottoms" ? "twill" : p.kind === "hoodie" || p.kind === "sweatshirt" ? "fleece" : "jersey"} />
                </div>
              </div>
              <div>
                <h2 id={`prod-${p.kind}`} className="text-[clamp(2.5rem,6vw,5.5rem)] font-semibold uppercase [line-height:0.92] tracking-[-0.045em]">{p.name}</h2>
                <p className="mt-6 text-xl text-pub-text/90">{p.useCase}</p>
                <div className="mt-8 border-t border-pub-line pt-5"><p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-brand">Make it yours</p><p className="mt-2 max-w-md text-sm leading-relaxed text-pub-muted">{p.customise}</p></div>
                <div className="mt-8"><StartSampleLink>Start a Sample</StartSampleLink></div>
              </div>
            </article>
          </li>
        ))}
      </ol>
      <PublicCta title="Not sure which fits?" text="Describe the idea in a sample request and we will confirm what can be made." />
    </main>
  );
}
