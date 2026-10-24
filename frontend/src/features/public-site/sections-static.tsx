import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { BENUE, CAPABILITIES, DECORATIONS, FABRIC_ATTRIBUTES, FABRIC_FAMILIES, PORTAL_BENEFITS, PORTAL_NAV, PORTAL_ORDER_ACTIVE, PORTAL_ORDER_STEPS, PORTAL_SAMPLES, SELECTED_WORK, START_SAMPLE_HREF, TRADITIONAL, TRUST_ITEMS } from "./content";
import { ContactLink, CustomerLoginLink, StartSampleLink } from "./cta";
import { DecorationSpecimen } from "./decoration-specimens";
import { EditorialHeading, Eyebrow, MediaFrame, Section, SectionIntro, Texture } from "./primitives";
import { PortalPhone } from "./portal-mobile";
import { QualityLine } from "./quality-line";
import { SnapRow } from "./snap-row";

export function TrustStrip() {
  return (
    <section aria-label="What we handle" className="border-y border-pub-line bg-pub-surface">
      <ul className="mx-auto flex w-full max-w-[88rem] gap-x-8 overflow-x-auto px-5 py-5 [scrollbar-width:none] sm:flex-wrap sm:gap-x-10 sm:gap-y-3 sm:overflow-visible sm:px-8 sm:py-6 lg:justify-between lg:px-12">
        {TRUST_ITEMS.map((t, i) => (
          <li key={t} className="flex shrink-0 items-center gap-3 whitespace-nowrap text-xs uppercase tracking-[0.14em] text-pub-muted sm:text-sm">
            <span className="font-mono text-[0.6875rem] text-pub-brand">{String(i + 1).padStart(2, "0")}</span>{t}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Colour-field section: a deeper green-black ground and a cropped outline word give the page a change of pace. */
export function BrandStatement() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative isolate scroll-mt-20 overflow-hidden bg-pub-field">
      <p aria-hidden className="pub-outline-text pointer-events-none absolute -bottom-[0.18em] start-[-0.04em] -z-10 select-none whitespace-nowrap text-[clamp(8rem,26vw,26rem)] font-semibold uppercase leading-none tracking-[-0.06em]">Scale</p>
      <div className="mx-auto w-full max-w-[88rem] px-5 py-16 sm:px-8 sm:py-44 lg:px-12">
        <div className="grid gap-10 sm:gap-16 lg:grid-cols-[1.6fr_1fr] lg:items-end">
          <div className="pub-reveal">
            <Eyebrow>01 — Why Benuu Print</Eyebrow>
            <h2 id="about-title" className="mt-5 text-balance text-[clamp(2.5rem,8vw,7.5rem)] font-semibold uppercase [line-height:0.9] tracking-[-0.05em]">
              Your collection deserves more than <span className="text-pub-brand">a supplier.</span>
            </h2>
          </div>
          <ol className="border-t border-pub-brand/40">
            {["One manufacturing partner", "Sample to scale", "A clear process", "Quality control throughout", "Transparent production"].map((l, i) => (
              <li key={l} className="pub-seq flex items-baseline gap-4 border-b border-pub-line py-4 text-lg text-pub-text/90" style={{ "--i": i } as React.CSSProperties}>
                <span className="font-mono text-xs text-pub-brand">{String(i + 1).padStart(2, "0")}</span>{l}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Fabrics as a native horizontal strip of tall macro swatches (scroll-snap; keyboard scrollable). */
export function FabricStory() {
  return (
    <section id="fabrics" aria-labelledby="fabrics-title" className="scroll-mt-20 border-t border-pub-line bg-pub-surface">
      <div className="mx-auto w-full max-w-[88rem] px-5 pt-12 sm:px-8 sm:pt-32 lg:px-12">
        <SectionIntro eyebrow="05 — Fabrics" title={<span id="fabrics-title">Start with the cloth.</span>}>
          Weight, composition, texture and colour decide how a garment looks and lasts. We help you choose them before anything is cut.
        </SectionIntro>
      </div>
      <SnapRow label="Fabric families" className="mt-8 flex snap-x snap-mandatory scroll-ps-5 gap-px overflow-x-auto bg-pub-line ps-5 outline-offset-[-2px] [scrollbar-width:none] sm:mt-14 sm:scroll-ps-0 sm:ps-0">
        {FABRIC_FAMILIES.map((f) => (
          <li key={f.name} className="group relative aspect-[4/5] w-[58vw] max-w-[15rem] shrink-0 snap-start sm:aspect-[3/4] sm:max-w-none overflow-hidden bg-pub-surface sm:w-[38vw] lg:w-[24vw]">
            <figure className="size-full">
              <div className="size-full transition-transform duration-[1200ms] ease-out group-hover:scale-110 motion-reduce:transition-none"><Texture kind={f.visualKey} /></div>
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-pub-bg/90 via-pub-bg/50 to-transparent p-4 pt-16 sm:p-6 sm:pt-24">
                <h3 className="text-xl sm:text-2xl font-semibold uppercase tracking-tight">{f.name}</h3>
                <p className="mt-1 text-sm text-pub-muted">{f.use}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </SnapRow>
      <div className="mx-auto w-full max-w-[88rem] px-5 pb-12 sm:px-8 sm:pb-32 lg:px-12">
        <dl className="mt-px grid grid-cols-2 gap-px bg-pub-line sm:grid-cols-5 [&>div:last-child]:col-span-2 sm:[&>div:last-child]:col-span-1">
          {FABRIC_ATTRIBUTES.map((a) => (
            <div key={a.label} className="bg-pub-surface py-5 pe-5"><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-brand">{a.label}</dt><dd className="mt-2 text-sm text-pub-muted">{a.note}</dd></div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-pub-muted sm:mt-8">Visual studies only. Full specifications are shown per fabric when you build a sample.</p>
        <div className="mt-5"><Link href={START_SAMPLE_HREF} className="group inline-flex items-center gap-2 text-sm font-medium text-pub-brand"><span className="pub-link">Explore materials in the sample builder</span><ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" /></Link></div>
      </div>
    </section>
  );
}

export function Decoration() {
  return (
    <Section labelledBy="deco-title">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-end">
        <SectionIntro eyebrow="06 — Decoration" title={<span id="deco-title">Your artwork, <span className="text-pub-muted">made physical.</span></span>} />
        <p className="max-w-md text-base leading-relaxed text-pub-muted lg:justify-self-end">Several methods under one roof, so the technique follows the design — not the other way round.</p>
      </div>
      <SnapRow label="Decoration methods" dotsClassName="hidden" className="mt-8 flex flex-col border-t border-pub-line sm:mt-14 sm:grid sm:grid-cols-2 sm:gap-px sm:border-0 sm:bg-pub-line lg:grid-cols-5">
        {DECORATIONS.map((d, i) => (
          <li key={d.name} className="group flex items-center gap-4 border-b border-pub-line bg-pub-bg py-3 sm:block sm:border-0 sm:py-0">
            <div className="size-20 shrink-0 overflow-hidden border border-pub-line sm:aspect-square sm:size-auto sm:border-0"><div className="size-full transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transition-none"><DecorationSpecimen kind={d.visualKey} /></div></div>
            <div className="min-w-0 sm:p-5"><p className="font-mono text-[0.6875rem] text-pub-brand">{String(i + 1).padStart(2, "0")}</p><h3 className="mt-1 text-xl font-semibold uppercase leading-none tracking-tight sm:mt-2 sm:text-lg">{d.name}</h3><p className="mt-1.5 text-sm text-pub-muted sm:mt-1">{d.note}</p></div>
          </li>
        ))}
      </SnapRow>
    </Section>
  );
}

export function QualitySection() {
  return (
    <Section labelledBy="quality-title" className="bg-pub-surface">
      <SectionIntro eyebrow="07 — Quality" title={<span id="quality-title">Checked all the way through.</span>}>
        Quality is not a stamp at the end. Checks happen at every stage the garment passes through.
      </SectionIntro>
      <QualityLine />
    </Section>
  );
}

/** Interface moment: a browser-framed mock of the real customer account. Statuses use the portal's own vocabulary. */
export function PortalShowcase() {
  return (
    <section aria-labelledby="portal-title" className="relative isolate overflow-hidden border-t border-pub-line bg-pub-field">
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse 50% 60% at 75% 50%, rgb(12 127 93 / 0.22), transparent 70%)" }} />
      <div className="mx-auto grid w-full max-w-[88rem] gap-10 px-5 py-12 sm:gap-16 sm:px-8 sm:py-32 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-12">
        <div>
          <Eyebrow>08 — Customer account</Eyebrow>
          <EditorialHeading className="pub-reveal mt-5"><span id="portal-title">See your production. <span className="text-pub-muted">Not just the final box.</span></span></EditorialHeading>
          <ul className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 sm:mt-10">
            {PORTAL_BENEFITS.map((b) => <li key={b} className="flex items-center gap-2.5 border-t border-pub-line pt-3 text-sm text-pub-text/90"><span aria-hidden className="size-1.5 rounded-full bg-pub-brand" />{b}</li>)}
          </ul>
          <div className="mt-8 sm:mt-10"><CustomerLoginLink className="max-sm:border-0 max-sm:px-0 max-sm:text-pub-brand">Open your account</CustomerLoginLink></div>
        </div>
        <PortalPhone />
        <div role="img" aria-label="Preview of the customer account: a sample in production, a quotation ready to review, and an order's progress through to delivery" className="pub-reveal relative hidden lg:block">
          <div aria-hidden className="relative overflow-hidden border border-pub-line bg-pub-bg shadow-[0_50px_100px_-30px_rgb(0_0_0/0.9)]">
            <div className="flex items-center gap-1.5 border-b border-pub-line bg-pub-raise px-4 py-3">{[0, 1, 2].map((d) => <span key={d} className="size-2 rounded-full bg-pub-line" />)}<span className="ms-4 flex-1 truncate bg-pub-bg px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-pub-muted">Benuu Print · My account</span></div>
            <div className="grid sm:grid-cols-[9rem_1fr]">
              <ul className="hidden space-y-1 border-e border-pub-line p-3 sm:block">{PORTAL_NAV.map((n, i) => <li key={n} className={cn("px-2.5 py-1.5 text-xs", i === 1 ? "bg-pub-brand-deep/25 text-pub-brand" : "text-pub-muted")}>{n}</li>)}</ul>
              <div className="space-y-3 p-4 sm:p-5">
                {PORTAL_SAMPLES.map((s, i) => (
                  <div key={s.number} className="border border-pub-line bg-pub-surface p-4">
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-pub-muted">Sample · {s.number}</p>
                    <div className="mt-2 flex items-start justify-between gap-3"><p className="font-semibold">{s.product}</p><span className={cn("shrink-0 px-2 py-0.5 text-[0.6875rem]", i === 0 ? "bg-pub-brand-deep/30 text-pub-brand" : "bg-white/10 text-pub-text")}>{s.label}</span></div>
                    <p className="mt-1.5 text-xs text-pub-muted">{s.next}</p>
                  </div>
                ))}
                <div className="border border-pub-line bg-pub-surface p-4">
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-pub-muted">Order progress</p>
                  <ol className="relative mt-4 space-y-3.5">
                    <span className="absolute start-[9px] top-2 h-[calc(100%-1rem)] w-px bg-pub-line" />
                    {PORTAL_ORDER_STEPS.map((s, i) => (
                      <li key={s.status} className="relative flex items-center gap-3 text-xs">
                        <span className={cn("relative flex size-5 items-center justify-center rounded-full border text-[0.625rem]", i < PORTAL_ORDER_ACTIVE ? "border-pub-brand bg-pub-brand text-pub-bg" : i === PORTAL_ORDER_ACTIVE ? "border-pub-brand bg-pub-bg text-pub-brand" : "border-pub-line bg-pub-bg text-pub-muted")}>
                          {i === PORTAL_ORDER_ACTIVE ? <span className="pub-ping" /> : null}{i < PORTAL_ORDER_ACTIVE ? "✓" : ""}
                        </span>
                        <span className={cn(i <= PORTAL_ORDER_ACTIVE ? "text-pub-text" : "text-pub-muted")}>{s.label}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-pub-muted">Illustrative preview</p>
        </div>
      </div>
    </section>
  );
}

/** Left: a fragmented process. Right: one connected line. */
export function Transparency() {
  const offsets = ["ms-0", "sm:ms-10", "sm:ms-4", "sm:ms-14"];
  return (
    <Section labelledBy="transp-title" className="bg-pub-surface">
      <SectionIntro eyebrow="09 — Process transparency" title={<span id="transp-title">Know where it stands.</span>} />
      <div className="mt-10 grid gap-8 sm:mt-16 sm:gap-16 md:grid-cols-2">
        <div>
          <h3 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-muted">Typical manufacturing</h3>
          <ul className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
            {TRADITIONAL.map((t, i) => <li key={t} className={cn("w-fit max-w-full border border-dashed border-pub-line px-5 py-3 text-lg text-pub-muted", offsets[i])} style={{ transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}>{t}</li>)}
          </ul>
        </div>
        <div aria-hidden className="flex items-center gap-3 md:hidden"><span className="h-px flex-1 bg-pub-line" /><span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand">Instead</span><span className="h-px flex-1 bg-pub-line" /></div>
        <div>
          <h3 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand">With Benuu Print</h3>
          <ol className="relative mt-8 space-y-6 ps-10">
            <span aria-hidden className="absolute start-[7px] top-4 h-[calc(100%-2rem)] w-px bg-pub-brand" />
            {BENUE.map((t, i) => (
              <li key={t} className="relative border border-pub-brand/40 bg-pub-bg px-5 py-3 text-lg text-pub-text">
                <span aria-hidden className={cn("absolute -start-10 top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-pub-brand", i === BENUE.length - 1 ? "bg-pub-brand" : "bg-pub-surface")} />{t}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

/** Split screen: sticky intro on the left, a hover-responsive index of the eight capability areas on the right. */
export function Capabilities() {
  return (
    <Section labelledBy="cap-title">
      <div className="grid gap-10 sm:gap-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionIntro eyebrow="10 — Manufacturing capabilities" title={<span id="cap-title">Everything under one roof.</span>} />
        </div>
        <div className="border-t border-pub-line lg:hidden">
          {CAPABILITIES.map((c, i) => (
            <details key={c.name} className="group border-b border-pub-line">
              <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-center gap-4 py-4 [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-xs text-pub-brand">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-[1.375rem] font-semibold uppercase leading-tight tracking-tight">{c.name}</span>
                <span aria-hidden className="flex size-8 items-center justify-center border border-pub-line text-pub-muted transition-transform duration-300 group-open:rotate-45 group-open:border-pub-brand group-open:text-pub-brand">+</span>
              </summary>
              <div className="pb-6 ps-9 text-[0.9375rem] leading-relaxed text-pub-muted">
                <p>{c.body}</p>
                <Link href={`/capabilities#${c.name.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="pub-link mt-3 inline-block text-sm text-pub-brand">What this involves →</Link>
              </div>
            </details>
          ))}
        </div>
        <ul className="hidden border-t border-pub-line lg:block">
          {CAPABILITIES.map((c, i) => (
            <li key={c.name} className="group grid grid-cols-[3rem_1fr] items-baseline gap-x-4 border-b border-pub-line py-5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[3rem_1fr_1fr]">
              <span className="font-mono text-xs text-pub-muted transition-colors group-hover:text-pub-brand">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-xl font-semibold uppercase tracking-tight transition-transform duration-300 group-hover:translate-x-1.5 motion-reduce:transition-none">{c.name}</h3>
              <p className="col-start-2 text-sm text-pub-muted sm:col-start-auto">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/** Reduced to a compact band until approved projects exist. With real items it renders a project grid. */
export function WorkSection() {
  if (!SELECTED_WORK.length) {
    return (
      <section id="work" aria-labelledby="work-title" className="scroll-mt-20 border-t border-pub-line bg-pub-surface">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-6 px-5 py-10 sm:px-8 sm:py-16 md:flex-row md:items-center md:justify-between lg:px-12">
          <div>
            <Eyebrow>11 — Selected production</Eyebrow>
            <h2 id="work-title" className="mt-3 text-2xl font-semibold uppercase tracking-tight sm:text-3xl">Selected production, coming soon.</h2>
            <p className="mt-2 max-w-md text-sm text-pub-muted">Projects will be published here once they are approved for sharing.</p>
          </div>
          <ContactLink className="max-md:h-11 max-md:justify-start max-md:border-0 max-md:px-0 max-md:text-pub-brand">Talk to us about your project</ContactLink>
        </div>
      </section>
    );
  }
  return (
    <Section id="work" labelledBy="work-title" className="bg-pub-surface">
      <SectionIntro eyebrow="11 — Selected production" title={<span id="work-title">Work, in detail.</span>} />
      <ul className="mt-16 grid gap-4 lg:grid-cols-3">
        {SELECTED_WORK.map((w) => (
          <li key={w.title}>
            <MediaFrame className="aspect-[4/5]"><div className="size-full bg-pub-raise" /></MediaFrame>
            <h3 className="mt-4 text-lg font-semibold">{w.title}</h3>
            <p className="text-sm text-pub-muted">{w.category} · {w.techniques.join(", ")} · {w.material}{w.quantity ? ` · ${w.quantity}` : ""}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function FinalCta() {
  return (
    <section data-cta-end aria-labelledby="cta-title" className="relative isolate overflow-hidden border-t border-pub-line">
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse 60% 80% at 80% 100%, rgb(12 127 93 / 0.35), transparent 70%)" }} />
      <div className="mx-auto w-full max-w-[88rem] px-5 py-16 sm:px-8 sm:py-40 lg:px-12">
        <h2 id="cta-title" className="pub-reveal text-[clamp(3rem,11vw,10rem)] font-semibold uppercase [line-height:0.88] tracking-[-0.055em]">Ready to make it real?</h2>
        <p className="mt-6 max-w-md text-lg text-pub-muted sm:mt-8">Start with a sample. Scale when it&apos;s right.</p>
        <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row"><StartSampleLink className="h-14 w-full sm:h-12 sm:w-auto" /><CustomerLoginLink className="h-11 w-full max-sm:border-0 max-sm:text-pub-muted sm:h-12 sm:w-auto" /></div>
      </div>
    </section>
  );
}
