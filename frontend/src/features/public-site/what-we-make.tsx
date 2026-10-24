"use client";

import Link from "next/link";
import { useState } from "react";
import { WHAT_WE_MAKE, START_SAMPLE_HREF } from "./content";
import { GarmentCarousel } from "./garment-carousel";
import { GarmentPreview, type GarmentKind } from "./garment";
import { Section, SectionIntro } from "./primitives";

/**
 * Category list with a garment preview that follows hover/focus. The preview is `GarmentPreview`, so when 3D models exist
 * the right-hand panel changes implementation but this list and its state stay as they are.
 */
export function WhatWeMake() {
  const [kind, setKind] = useState<GarmentKind>(WHAT_WE_MAKE[0]!.kind);
  const active = WHAT_WE_MAKE.find((p) => p.kind === kind) ?? WHAT_WE_MAKE[0]!;
  return (
    <Section id="capabilities" labelledBy="make-title">
      <SectionIntro eyebrow="02 — What we make" title={<span id="make-title">Every piece, <span className="text-pub-muted">one partner.</span></span>}>
        Start with the garment. We handle everything between your idea and the box.
      </SectionIntro>
      <GarmentCarousel className="mt-10 lg:hidden" label="Garment families" items={WHAT_WE_MAKE.map((p) => ({ name: p.name, kind: p.kind, lines: [p.note] }))} />
      <div className="mt-16 hidden gap-x-16 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem]">
        <ul className="border-t border-pub-line" onMouseLeave={() => setKind(WHAT_WE_MAKE[0]!.kind)}>
          {WHAT_WE_MAKE.map((p, i) => (
            <li key={p.name} className="border-b border-pub-line">
              <Link href={START_SAMPLE_HREF} data-kind={p.kind} aria-describedby={`make-note-${p.kind}`} onMouseEnter={() => setKind(p.kind)} onFocus={() => setKind(p.kind)} className="group grid items-baseline gap-x-6 gap-y-1 py-6 sm:grid-cols-[3.5rem_1fr_minmax(0,16rem)] sm:py-7">
                <span className={`font-mono text-xs transition-colors ${kind === p.kind ? "text-pub-brand" : "text-pub-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className={`text-[clamp(2rem,5vw,4.5rem)] font-semibold uppercase leading-none tracking-[-0.04em] transition-all duration-500 motion-reduce:transition-none ${kind === p.kind ? "translate-x-3 text-pub-text" : "text-pub-text/55"}`}>{p.name}</span>
                <span id={`make-note-${p.kind}`} className="text-sm text-pub-muted">{p.note}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden lg:block">
          <div className="sticky top-28 border border-pub-line bg-pub-surface p-8" data-testid="make-preview">
            <GarmentPreview productType={active.kind} colour="#2b302e" fabric="jersey" caption={active.name} />
          </div>
        </div>
      </div>
    </Section>
  );
}
