"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { QUALITY_STAGES as QUALITY_STAGES_SRC } from "./content";
import { useI18n } from "@/i18n/provider";

/**
 * Four production stages joined by one line.
 * Desktop (>= lg): when the section scrolls into view the line fills and each checkpoint activates in order (unchanged).
 * Phones: a vertical journey where each checkpoint lights up as ITS stage scrolls into view, and the line fills down to it.
 * Reduced motion / no IntersectionObserver: shown complete immediately.
 */
export function QualityLine() {
  const { t, loc } = useI18n();
  const QUALITY_STAGES = loc(QUALITY_STAGES_SRC);
  const ref = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(false);
  const [perItem, setPerItem] = useState(false);
  const [reached, setReached] = useState<boolean[]>(() => QUALITY_STAGES.map(() => false));

  useEffect(() => {
    const el = ref.current;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduced || typeof IntersectionObserver === "undefined") { setActive(true); return; }
    const phone = !window.matchMedia("(min-width: 1024px)").matches;
    if (phone) {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        setPerItem(true);
        if (!e.isIntersecting) return;
        const i = Number((e.target as HTMLElement).dataset.index);
        setReached((r) => r.map((v, k) => v || k <= i));
        setActive(true);
        io.unobserve(e.target);
      }), { rootMargin: "0px 0px -30% 0px", threshold: 0.4 });
      Array.from(el.children).forEach((c) => io.observe(c));
      return () => io.disconnect();
    }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setActive(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ol ref={ref} data-active={active} data-mode={perItem ? "per-item" : "sequence"} className="mt-12 grid gap-0 sm:mt-16 lg:grid-cols-4">
      {QUALITY_STAGES.map((q, i) => {
        const last = i === QUALITY_STAGES.length - 1;
        const on = perItem ? reached[i] : active;
        const next = perItem ? reached[i + 1] : active;
        const delay = perItem ? undefined : { transitionDelay: active ? `${i * 650}ms` : "0ms" };
        return (
          <li key={q.stage} data-index={i} className="relative pb-12 ps-9 lg:pb-0 lg:ps-0 lg:pe-8 lg:pt-12">
            <span aria-hidden className={cn("absolute start-0 top-1 flex size-3 items-center justify-center rounded-full border transition-colors duration-500 lg:top-0", on ? "border-pub-brand bg-pub-brand" : "border-pub-line bg-pub-surface")} style={delay}>
              <span className={cn("absolute size-3 rounded-full", on && "pub-ping")} style={{ animationDelay: perItem ? "0ms" : `${i * 650}ms`, animationIterationCount: 1 }} />
            </span>
            {last ? null : (
              <span aria-hidden className="absolute start-[5px] top-4 h-full w-px bg-pub-line lg:start-4 lg:top-[5px] lg:h-px lg:w-[calc(100%-1rem)]">
                <span className={cn("block size-full origin-top bg-pub-brand transition-transform ease-out lg:origin-left", perItem ? "duration-1000" : "duration-700", next ? "scale-100" : "scale-y-0 lg:scale-x-0 lg:scale-y-100")} style={perItem ? undefined : { ...delay, transitionDelay: active ? `${i * 650 + 250}ms` : "0ms" }} />
              </span>
            )}
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted">{t("site.stageV1", { v1: String(i + 1).padStart(2, "0") })}</p>
            <h3 className="mt-3 text-3xl font-semibold uppercase tracking-tight sm:mt-4 sm:text-4xl">{q.stage}</h3>
            <p className="mt-2 max-w-xs text-sm text-pub-muted sm:mt-3">{q.check}</p>
            <p className={cn("mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.14em] transition-colors duration-500 sm:mt-6", on ? "text-pub-brand" : "text-pub-muted/60")} style={delay}>{t("site.qualityCheck")}</p>
          </li>
        );
      })}
    </ol>
  );
}
