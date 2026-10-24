"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { START_SAMPLE_HREF } from "./content";
import { GarmentPreview, type FabricVisualKey, type GarmentKind } from "./garment";

export interface CarouselItem { name: string; kind: GarmentKind; lines: string[] }

const FABRIC: Partial<Record<GarmentKind, FabricVisualKey>> = { hoodie: "fleece", sweatshirt: "fleece", jacket: "twill", bottoms: "twill" };

/**
 * Touch-first garment chooser for phones: a tappable chip row and a native scroll-snap row of garment cards, kept in sync.
 * Next card peeks in to signal swipe. Each card previews through `GarmentPreview` (the 3D-ready boundary) and ends in Start a Sample.
 * Swiping is never required: the chips and the normal page scroll reach everything.
 */
export function GarmentCarousel({ items, label, className }: { items: CarouselItem[]; label: string; className?: string }) {
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
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className={className} data-testid="garment-carousel">
      <div ref={chips} role="tablist" aria-label={`${label} — choose`} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {items.map((it, i) => (
          <button key={it.kind} type="button" role="tab" aria-selected={i === active} onClick={() => select(i)} className={cn("h-11 shrink-0 border px-4 text-sm font-medium uppercase tracking-[0.04em] transition-colors active:scale-[0.97]", i === active ? "border-pub-brand bg-pub-brand-deep/25 text-pub-text" : "border-pub-line text-pub-muted")}>{it.name}</button>
        ))}
      </div>
      <ul ref={track} aria-label={label} tabIndex={0} className="-mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
        {items.map((it, i) => (
          <li key={it.kind} data-index={i} aria-current={i === active} className={cn("w-[78vw] max-w-sm shrink-0 snap-center border bg-pub-surface p-5 transition-[border-color,opacity] duration-300", i === active ? "border-pub-line opacity-100" : "border-pub-line/60 opacity-70")}>
            <div className="mx-auto w-[88%]"><GarmentPreview productType={it.kind} colour="#2b302e" fabric={FABRIC[it.kind] ?? "jersey"} /></div>
            <h3 className="mt-4 text-3xl font-semibold uppercase leading-none tracking-[-0.04em]">{it.name}</h3>
            {it.lines.map((l, k) => <p key={k} className={cn("mt-2 text-sm leading-relaxed", k === 0 ? "text-pub-text/90" : "text-pub-muted")}>{l}</p>)}
            <Link href={START_SAMPLE_HREF} className="mt-5 flex h-12 w-full items-center justify-center bg-pub-brand-deep text-sm font-medium text-white active:bg-pub-brand-deeper">Start a Sample</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
