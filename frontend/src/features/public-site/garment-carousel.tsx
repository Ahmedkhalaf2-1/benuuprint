"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { scrollChildToCenter } from "@/lib/utils/scroll";
import { START_SAMPLE_HREF } from "./content";
import { GarmentPreview, type FabricVisualKey, type GarmentKind } from "./garment";
import { useI18n } from "@/i18n/provider";

export interface CarouselItem { name: string; kind: GarmentKind; lines: string[] }

const FABRIC: Partial<Record<GarmentKind, FabricVisualKey>> = { hoodie: "fleece", sweatshirt: "fleece", jacket: "twill", bottoms: "twill" };

/**
 * Touch-first garment chooser for phones: a tappable chip row and a native scroll-snap row of garment cards, kept in sync.
 * Next card peeks in to signal swipe. Each card previews through `GarmentPreview` (the 3D-ready boundary) and ends in a quiet text action (no full-width button per card).
 * Swiping is never required: the chips and the normal page scroll reach everything.
 */
export function GarmentCarousel({ items, label, className, actionHref = START_SAMPLE_HREF, actionLabel }: { items: CarouselItem[]; label: string; className?: string; actionHref?: string; actionLabel?: (name: string) => string }) {
  const { t } = useI18n();
  const actionText = actionLabel ?? ((name: string) => t("site.startWithName", { name }));
  const track = useRef<HTMLUListElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset.index)); }), { root: el, threshold: [0.6] });
    Array.from(el.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [items.length]);

  useEffect(() => {
    const chip = chips.current?.children[active] as HTMLElement | undefined;
    chip?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "auto" });
  }, [active]);

  const select = (i: number) => {
    setActive(i);
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollChildToCenter(el, card, !reduce);
  };

  return (
    <div className={className} data-testid="garment-carousel">
      <div ref={chips} role="tablist" aria-label={t("site.labelChoose", { label })} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {items.map((it, i) => (
          <button key={it.kind} type="button" role="tab" aria-selected={i === active} onClick={() => select(i)} className={cn("h-11 shrink-0 border px-4 text-sm font-medium uppercase tracking-[0.04em] transition-colors active:scale-[0.97]", i === active ? "border-pub-brand bg-pub-brand-deep/25 text-pub-text" : "border-pub-line text-pub-muted")}>{it.name}</button>
        ))}
      </div>
      <ul ref={track} aria-label={label} tabIndex={0} className="-mx-5 mt-4 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {items.map((it, i) => (
          <li key={it.kind} data-index={i} aria-current={i === active} className={cn("w-[66vw] max-w-[17rem] shrink-0 snap-center border bg-pub-surface p-4 transition-[border-color,opacity] duration-300", i === active ? "border-pub-line opacity-100" : "border-pub-line/60 opacity-70")}>
            <div className="mx-auto w-[72%]"><GarmentPreview productType={it.kind} colour="#2b302e" fabric={FABRIC[it.kind] ?? "jersey"} /></div>
            <p className="mt-3 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-pub-muted"><span className="text-pub-brand">{String(i + 1).padStart(2, "0")}</span> / {String(items.length).padStart(2, "0")}</p>
            <h3 className="mt-1.5 text-2xl font-semibold uppercase leading-none tracking-[-0.04em]">{it.name}</h3>
            {it.lines.map((l, k) => <p key={k} className={cn("mt-1.5 text-sm leading-relaxed", k === 0 ? "text-pub-text/90" : "text-pub-muted")}>{l}</p>)}
            <Link href={actionHref} className="group mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-pub-brand"><span className="pub-link">{actionText(it.name)}</span><ArrowRight aria-hidden className="size-4 transition-transform ltr:group-active:translate-x-0.5 rtl:group-active:-translate-x-0.5 rtl:-scale-x-100" /></Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
