"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { scrollChildToCenter } from "@/lib/utils/scroll";
import { JOURNEY as JOURNEY_SRC } from "./content";
import { ProcessGarmentVisual, type ProcessStage } from "./garment";
import { LoopVideo } from "./loop-video";
import { EditorialHeading, Eyebrow } from "./primitives";
import { useVideoAllowed } from "./use-video-allowed";
import { useI18n } from "@/i18n/provider";

/**
 * Phone version of the journey: one shared garment visual that transforms with the step, a segmented progress bar you can tap, and
 * swipeable step cards (native scroll-snap) with Back / Next buttons. Always shows where you are ("02 / 06") and what comes next.
 * No sticky layout, no video (the CSS/SVG visual carries the motion).
 */
export function MobileProcess({ videoSrc = null }: { videoSrc?: string | null }) {
  const { t, loc } = useI18n();
  const JOURNEY = loc(JOURNEY_SRC);
  const [active, setActive] = useState(0);
  const track = useRef<HTMLOListElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const allowed = useVideoAllowed(!!videoSrc, { minWidth: 1024, allowMobile: true });
  const playVideo = !!videoSrc && allowed && near;

  // Fetch the (5 MB) video only when its panel is about to be seen.
  useEffect(() => {
    const el = panel.current;
    if (!allowed || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [allowed]);

  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset.step)); }), { root: el, threshold: [0.6] });
    Array.from(el.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(JOURNEY_SRC.length - 1, i));
    setActive(next);
    const el = track.current;
    const card = el?.children[next] as HTMLElement | undefined;
    if (!el || !card) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollChildToCenter(el, card, !reduce);
  }, []);

  return (
    <div className="lg:hidden" data-testid="mobile-process" data-active-step={active} data-process-media={playVideo ? "video" : "2d"}>
      <div ref={panel} className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden border border-pub-line bg-pub-bg p-3">
        {/* The step-driven drawing is the base and the fallback; the shared loop covers it when playback is appropriate. */}
        <ProcessGarmentVisual stage={active as ProcessStage} />
        {playVideo ? <LoopVideo src={videoSrc} className="object-[88%_center]" /> : null}
        <span aria-hidden className="pointer-events-none absolute -start-px -top-px z-10 size-5 border-s-2 border-t-2 border-pub-brand" />
        <span aria-hidden className="pointer-events-none absolute -end-px -bottom-px z-10 size-5 border-e-2 border-b-2 border-pub-brand" />
      </div>
      <div role="group" aria-label={t("site.processSteps")} className="mt-5 flex gap-1.5">
        {JOURNEY.map((s, i) => (
          <button key={s.title} type="button" aria-label={t("site.stepV1Title", { v1: i + 1, title: s.title })} aria-current={i === active ? "step" : undefined} onClick={() => go(i)} className="group flex h-11 flex-1 items-center">
            <span className={cn("h-1 w-full transition-colors duration-500", i <= active ? "bg-pub-brand" : "bg-pub-line")} />
          </button>
        ))}
      </div>
      <ol ref={track} aria-label={t("site.stepDetails")} tabIndex={0} className="-mx-5 mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
        {JOURNEY.map((s, i) => (
          <li key={s.title} data-step={i} className={cn("w-[86vw] max-w-md shrink-0 snap-center border border-pub-line p-5 transition-opacity duration-300", i === active ? "opacity-100" : "opacity-60")}>
            <p className="font-mono text-xs text-pub-brand">{String(i + 1).padStart(2, "0")} / {String(JOURNEY.length).padStart(2, "0")} · {s.stage}</p>
            <h3 className="mt-3 text-balance text-[1.75rem] font-semibold uppercase [line-height:1] tracking-[-0.035em]">{s.title}</h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-pub-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => go(active - 1)} disabled={active === 0} className="h-12 flex-1 border border-pub-line text-sm text-pub-text transition-colors active:border-pub-muted disabled:opacity-40">{t("common.back")}</button>
        <button type="button" onClick={() => go(active + 1)} disabled={active === JOURNEY.length - 1} className="h-12 flex-[2] bg-pub-brand-deep text-sm font-medium text-white transition-colors active:bg-pub-brand-deeper disabled:opacity-40">{active === JOURNEY.length - 1 ? t("site.thatSTheJourney") : t("site.nextStep")}</button>
      </div>
    </div>
  );
}

/** Sticky garment visual + scrolling steps. The visual is `ProcessGarmentVisual`, driven only by the active step. */
export function ProcessStory({ videoSrc = null }: { videoSrc?: string | null }) {
  const { t, loc } = useI18n();
  const JOURNEY = loc(JOURNEY_SRC);
  const [active, setActive] = useState(0);
  const playVideo = useVideoAllowed(!!videoSrc, { minWidth: 1024 });
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step)); }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="process" aria-labelledby="process-title" className="scroll-mt-20 border-t border-pub-line bg-pub-surface">
      <div className="mx-auto w-full max-w-[88rem] px-5 pt-12 sm:px-8 sm:pt-32 lg:px-12">
        <Eyebrow>{t("site.n03Process")}</Eyebrow>
        <EditorialHeading className="mt-5"><span id="process-title">{t("site.fromIdea")}{" "}<span className="text-pub-brand">{t("site.toDelivery")}</span></span></EditorialHeading>
      </div>
      <div className="mx-auto w-full max-w-[88rem] px-5 pb-12 pt-8 sm:px-8 lg:hidden"><MobileProcess videoSrc={videoSrc} /></div>
      <div className="mx-auto hidden w-full max-w-[88rem] gap-x-20 px-5 sm:px-8 lg:grid lg:grid-cols-[1.05fr_1fr] lg:px-12">
        <div className="sticky top-16 z-10 -mx-5 h-[36vh] border-b border-pub-line bg-pub-surface/95 px-5 pt-3 backdrop-blur sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:h-auto lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-none">
          <div className="mx-auto aspect-square h-full max-h-[36vh] lg:sticky lg:top-24 lg:mt-14 lg:h-auto lg:max-h-none lg:w-full">
            <div className="relative size-full lg:border lg:border-pub-line lg:bg-pub-bg lg:p-6">
              <span aria-hidden className="pointer-events-none absolute -start-px -top-px z-10 hidden size-5 border-s-2 border-t-2 border-pub-brand lg:block" />
              <span aria-hidden className="pointer-events-none absolute -end-px -bottom-px z-10 hidden size-5 border-e-2 border-b-2 border-pub-brand lg:block" />
              {/* The stage-driven 2D visual is always the base (and the fallback); the shared loop fades in over it only when playback is appropriate. */}
              <div className="size-full" data-process-media={videoSrc && playVideo ? "video" : "2d"}><ProcessGarmentVisual stage={active as ProcessStage} /></div>
              {videoSrc && playVideo ? <div className="absolute inset-0 overflow-hidden"><LoopVideo src={videoSrc} className="object-[82%_center]" /></div> : null}
              <ol aria-hidden className="absolute end-4 top-4 hidden flex-col gap-1.5 lg:flex">
                {JOURNEY.map((s, i) => <li key={s.title} className={cn("h-0.5 transition-all duration-500", i === active ? "w-8 bg-pub-brand" : i < active ? "w-4 bg-pub-brand/50" : "w-4 bg-pub-line")} />)}
              </ol>
            </div>
          </div>
        </div>
        <ol className="pb-24 lg:pb-40">
          {JOURNEY.map((s, i) => (
            <li key={s.title} data-step={i} ref={(el) => { refs.current[i] = el; }} className={cn("flex min-h-[60vh] flex-col justify-center transition-opacity duration-500 motion-reduce:transition-none lg:min-h-[85vh]", active === i ? "opacity-100" : "opacity-35")} aria-current={active === i ? "step" : undefined}>
              <span className="font-mono text-sm text-pub-brand">{String(i + 1).padStart(2, "0")} / {String(JOURNEY.length).padStart(2, "0")} · {s.stage}</span>
              <h3 className="mt-4 text-balance text-[clamp(1.875rem,4vw,3.5rem)] font-semibold uppercase [line-height:0.98] tracking-[-0.035em]">{s.title}</h3>
              <p className="mt-4 max-w-md text-base leading-relaxed text-pub-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
