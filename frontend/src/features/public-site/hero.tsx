import { ArrowDown } from "lucide-react";
import { GhostAnchor, StartSampleLink } from "./cta";
import { HeroGarmentVisual } from "./garment";
import { resolveHeroMedia } from "./hero-media";
import { VideoHero } from "./video-hero";

const LINES = ["From idea", "to production."];

/**
 * The hero background is a slot: approved video (with poster) when it exists, otherwise `HeroGarmentVisual`.
 * Nothing in this layout assumes video, so a future 3D hero mode can take the same slot.
 * Below lg the hero is a dedicated phone layout (headline, short copy, two full-width actions, visual visible beneath);
 * from lg up it is the approved desktop composition, class for class.
 */
export function Hero() {
  const media = resolveHeroMedia();
  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] items-start overflow-hidden lg:min-h-dvh lg:items-end">
      <VideoHero videoSrc={media.video} posterSrc={media.poster} fallback={<HeroGarmentVisual />} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-pub-bg/90 via-pub-bg/45 to-pub-bg/5 lg:bg-gradient-to-t lg:from-pub-bg lg:via-pub-bg/55 lg:to-pub-bg/20" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-pub-bg to-transparent lg:hidden" />
      <div className="pub-hero-fade relative mx-auto w-full max-w-[88rem] px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32 lg:px-12">
        <p className="pub-fade mb-5 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-pub-brand sm:mb-8" style={{ "--d": "100ms" } as React.CSSProperties}><span className="sm:hidden">Sample to delivery</span><span className="hidden sm:inline">Apparel manufacturing · Sample to delivery</span></p>
        <h1 id="hero-title" className="font-semibold uppercase leading-[0.86] tracking-[-0.055em] text-[clamp(3.25rem,13.5vw,12.5rem)]">
          {LINES.map((line, i) => (
            <span key={line} className="pub-clip block pb-[0.06em]">
              <span className="pub-line block" style={{ "--i": i } as React.CSSProperties}>{line}</span>
            </span>
          ))}
        </h1>
        <div className="pub-fade mt-7 flex flex-col gap-7 sm:mt-14 sm:gap-8 lg:flex-row lg:items-end lg:justify-between" style={{ "--d": "700ms" } as React.CSSProperties}>
          <p className="max-w-lg text-base leading-relaxed text-pub-text/80 sm:text-lg">
            <span className="sm:hidden">From first sample to full-scale production, with every step visible.</span>
            <span className="hidden sm:inline">Custom apparel manufacturing from first sample to full-scale production — built around quality, visibility, and control.</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <StartSampleLink className="h-14 w-full sm:h-12 sm:w-auto"><span className="sm:hidden">Start a Sample</span><span className="hidden sm:inline">Start your sample</span></StartSampleLink>
            <GhostAnchor href="#process" className="h-12 w-full border border-pub-line sm:w-auto sm:border-0"><span className="sm:hidden">See the Process</span><span className="hidden sm:inline">See how it works</span><ArrowDown aria-hidden className="size-4" /></GhostAnchor>
          </div>
        </div>
      </div>
    </section>
  );
}
