"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Entrance reveals are normally CSS scroll-driven animations. Browsers without them (notably iOS Safari before 26) would show no
 * motion at all, so there an IntersectionObserver adds the same "rise in" to `.pub-reveal` / `.pub-seq` elements. Where scroll-driven
 * animations exist, or motion is reduced, this does nothing and content is simply visible.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const supportsTimeline = typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()");
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (supportsTimeline || reduced || typeof IntersectionObserver === "undefined") return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".pub-reveal, .pub-seq")).filter((e) => !e.dataset.io);
    els.forEach((e) => { e.dataset.io = "pending"; });
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).dataset.io = "in"; io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
