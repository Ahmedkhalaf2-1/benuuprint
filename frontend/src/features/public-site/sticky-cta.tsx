"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { START_SAMPLE_HREF } from "./content";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/i18n/provider";

/** Pages where a floating Start-a-Sample would be redundant or in the way (forms, legal text, order tracking). The homepage is excluded exactly: it has its own deliberate CTA sequence. */
const EXCLUDED = ["/contact", "/privacy", "/terms", "/track"];

export function stickyCtaVisible(o: { pastHero: boolean; endInView: boolean; pathname: string }): boolean {
  if (o.pathname === "/") return false;
  if (EXCLUDED.some((p) => o.pathname === p || o.pathname.startsWith(`${p}/`))) return false;
  return o.pastHero && !o.endInView;
}

/**
 * Restrained phone-only bottom action. Appears after the first screen, leaves when the closing CTA / footer is on screen
 * (anything marked data-cta-end), and never shows on desktop. Padded for the iOS home indicator; the footer reserves matching space.
 */
export function StickyMobileCta() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [pastHero, setPastHero] = useState(false);
  const [endInView, setEndInView] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ends = Array.from(document.querySelectorAll("[data-cta-end]"));
    if (!ends.length) return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      setEndInView(seen.size > 0);
    });
    ends.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  const show = stickyCtaVisible({ pastHero, endInView, pathname });
  return (
    <div aria-hidden={!show} inert={!show} className={cn("fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity] duration-300 motion-reduce:transition-none lg:hidden", show ? "translate-y-0 opacity-100" : "translate-y-full opacity-0")} data-testid="sticky-cta" data-visible={show}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-full bg-gradient-to-t from-pub-bg via-pub-bg/90 to-transparent" />
      <Link href={START_SAMPLE_HREF} className="flex h-14 w-full items-center justify-center bg-pub-brand-deep text-sm font-medium tracking-wide text-white shadow-[0_8px_30px_-8px_rgb(0_0_0/0.8)] active:bg-pub-brand-deeper">{t("site.startASample")}</Link>
    </div>
  );
}
