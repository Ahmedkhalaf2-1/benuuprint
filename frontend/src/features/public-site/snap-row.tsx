"use client";

import { Children, useCallback, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Native CSS scroll-snap row with a position indicator. Children are the items (`<li>`s with their own snap/width classes).
 * Works with normal scrolling, keyboard (focusable, arrow keys scroll) and screen readers; the dots are decorative but tappable
 * and move the row. `dotsClassName` controls where the dots are visible (e.g. phones only).
 */
export function SnapRow({ label, className, dotsClassName = "lg:hidden", children }: { label: string; className?: string; dotsClassName?: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const items = Children.toArray(children);
  const [active, setActive] = useState(0);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setActive(max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (items.length - 1)));
  }, [items.length]);

  const go = (i: number) => {
    const el = ref.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: child.offsetLeft - el.offsetLeft - (el.clientWidth - child.clientWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      <ul ref={ref} aria-label={label} tabIndex={0} onScroll={onScroll} className={className}>{children}</ul>
      <div className={cn("mt-5 flex items-center justify-center gap-1", dotsClassName)} data-testid="snap-dots">
        {items.map((_, i) => (
          <button key={i} type="button" aria-label={`Show item ${i + 1} of ${items.length}`} aria-current={i === active} onClick={() => go(i)} className="flex size-6 items-center justify-center">
            <span className={cn("h-1 rounded-full transition-all duration-300", i === active ? "w-6 bg-pub-brand" : "w-1.5 bg-pub-line")} />
          </button>
        ))}
      </div>
    </>
  );
}
