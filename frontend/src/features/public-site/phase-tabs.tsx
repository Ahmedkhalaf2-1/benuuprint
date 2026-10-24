"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

/** Phones: a sticky Sample / Production / Delivery tracker under the header. Tapping jumps to the phase; scrolling updates it. */
export function PhaseTabs({ phases }: { phases: readonly string[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = phases.map((_, i) => document.getElementById(`phase-${i}`)?.closest("section")).filter(Boolean) as Element[];
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(els.indexOf(e.target)); }), { rootMargin: "-30% 0px -60% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [phases]);
  return (
    <nav aria-label="Process phases" className="sticky top-16 z-30 border-b border-pub-line bg-pub-bg/95 backdrop-blur lg:hidden" data-testid="phase-tabs">
      <ol className="mx-auto flex max-w-[88rem]">
        {phases.map((p, i) => (
          <li key={p} className="flex-1">
            <a href={`#phase-${i}`} aria-current={i === active ? "step" : undefined} className={cn("flex h-12 items-center justify-center gap-2 border-b-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors active:bg-white/5", i === active ? "border-pub-brand text-pub-text" : "border-transparent text-pub-muted")}>
              <span className="font-mono text-pub-brand">{i + 1}</span>{p}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
