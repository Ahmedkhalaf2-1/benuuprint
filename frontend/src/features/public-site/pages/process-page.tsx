import { FULL_PROCESS } from "../content-pages";
import { StartSampleLink } from "../cta";
import { ProcessGarmentVisual, type ProcessStage } from "../garment";
import { PageHero, PublicCta } from "../page-shell";
import { PhaseTabs } from "../phase-tabs";
import { ProcessBand } from "../process-band";
import { ProcessStep } from "../process-step";

const PHASES = [
  { name: "Sample", intro: "Prove the garment before you scale it.", stage: 3 },
  { name: "Production", intro: "Scale the approved sample.", stage: 4 },
  { name: "Delivery", intro: "Follow it to your door, and reorder when you are ready.", stage: 5 },
] as const;

/** The full eleven-step journey, in customer language. Each phase carries its own sticky garment visual (a 3D swap point via ProcessGarmentVisual). */
export function ProcessPage({ videoSrc }: { videoSrc: string | null }) {
  return (
    <main>
      <PageHero eyebrow="Process" title={<>Eleven steps, <span className="text-pub-brand">all visible.</span></>} lede="From the first idea to your next reorder. You always know which step you are on and what happens next." outline="Steps">
        <StartSampleLink />
      </PageHero>
      <div className="border-b border-pub-line"><div className="mx-auto w-full max-w-[88rem] px-5 py-8 sm:px-8 sm:py-12 lg:px-12"><ProcessBand videoSrc={videoSrc} /></div></div>
      <PhaseTabs phases={PHASES.map((p) => p.name)} />
      {PHASES.map((phase, pi) => {
        const steps = FULL_PROCESS.filter((s) => s.phase === phase.name);
        return (
          <section key={phase.name} aria-labelledby={`phase-${pi}`} className={pi % 2 ? "scroll-mt-28 border-b border-pub-line bg-pub-surface lg:scroll-mt-0" : "scroll-mt-28 border-b border-pub-line lg:scroll-mt-0"}>
            <div className="mx-auto grid w-full max-w-[88rem] gap-12 px-5 py-12 sm:px-8 sm:py-28 lg:grid-cols-[22rem_1fr] lg:gap-20 lg:px-12">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="font-mono text-sm text-pub-brand">Phase {pi + 1}</p>
                <h2 id={`phase-${pi}`} className="mt-3 text-[clamp(2.5rem,5vw,4.5rem)] font-semibold uppercase [line-height:0.92] tracking-[-0.045em]">{phase.name}</h2>
                <p className="mt-4 text-pub-muted">{phase.intro}</p>
                <div className="mt-8 hidden aspect-square w-full max-w-[16rem] border border-pub-line bg-pub-bg p-3 lg:block"><ProcessGarmentVisual stage={phase.stage as ProcessStage} /></div>
              </div>
              <ol className="border-t border-pub-line">
                {steps.map((s) => (
                  <ProcessStep key={s.title} n={FULL_PROCESS.indexOf(s) + 1} title={s.title} body={s.body} you={s.you} see={s.see} />
                ))}
              </ol>
            </div>
          </section>
        );
      })}
      <PublicCta />
    </main>
  );
}
