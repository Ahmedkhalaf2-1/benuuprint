"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { CUSTOMER_LOGIN_HREF, NAV_LINKS, START_SAMPLE_HREF } from "./content";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="Benuu Print — home" className={cn("font-semibold uppercase tracking-[0.22em] text-pub-text", className)}>
      Benuu Print
    </Link>
  );
}

/**
 * Floating header: transparent over the hero, solid once the page scrolls. Desktop (>= lg) is the approved bar.
 * Phones get a compact bar (wordmark and 44px menu button only; Start a Sample lives in the menu panel, the hero and the closing section), a thin page-progress line, and a full-height
 * dark menu panel that eases in. The panel is always mounted (so it can animate) and inert/aria-hidden while closed.
 */
export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className={cn("fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300", scrolled || open ? "border-pub-line bg-pub-bg/90 backdrop-blur" : "border-transparent bg-transparent")}>
        <div className="mx-auto flex h-16 w-full max-w-[88rem] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
          <Wordmark className="text-sm" />
          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((l) => <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined} className={cn("pub-link text-sm hover:text-pub-text", pathname === l.href ? "text-pub-text" : "text-pub-muted")}>{l.label}</Link>)}
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            <Link href={CUSTOMER_LOGIN_HREF} className="pub-link text-sm text-pub-muted hover:text-pub-text">Customer Login</Link>
            <Link href={START_SAMPLE_HREF} className="inline-flex h-10 items-center bg-pub-brand-deep px-5 text-sm font-medium text-white transition-colors hover:bg-pub-brand-deeper active:translate-y-px">Start a Sample</Link>
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <button type="button" className="inline-flex size-11 items-center justify-center text-pub-text active:bg-white/5" aria-expanded={open} aria-controls="pub-mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
              {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
            </button>
          </div>
        </div>
        <span ref={bar} aria-hidden className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-pub-brand lg:hidden" />
      </header>
      <nav
        id="pub-mobile-nav"
        aria-label="Mobile"
        aria-hidden={!open}
        inert={!open}
        className={cn("fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col overflow-y-auto bg-pub-bg px-5 pb-8 pt-6 transition-[opacity,transform,visibility] duration-300 ease-out motion-reduce:transition-none lg:hidden", open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0")}
      >
        <ul className="flex-1">
          {NAV_LINKS.map((l, i) => (
            <li key={l.href} className={cn("border-b border-pub-line transition-[opacity,transform] duration-300 motion-reduce:transition-none", open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")} style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }}>
              <Link href={l.href} onClick={() => setOpen(false)} aria-current={pathname === l.href ? "page" : undefined} className={cn("flex min-h-16 items-center justify-between text-[2.25rem] font-semibold uppercase leading-none tracking-[-0.03em] active:text-pub-brand", pathname === l.href ? "text-pub-brand" : "text-pub-text")}>
                {l.label}<span aria-hidden className="font-mono text-xs text-pub-muted">{String(i + 1).padStart(2, "0")}</span>
              </Link>
            </li>
          ))}
          <li className="border-b border-pub-line"><Link href="/track" onClick={() => setOpen(false)} className="flex min-h-14 items-center text-lg text-pub-muted active:text-pub-text">Track an order</Link></li>
        </ul>
        <div className="mt-8 flex flex-col gap-3">
          <Link href={START_SAMPLE_HREF} onClick={() => setOpen(false)} className="inline-flex h-14 items-center justify-center bg-pub-brand-deep text-sm font-medium text-white active:bg-pub-brand-deeper">Start a Sample</Link>
          <Link href={CUSTOMER_LOGIN_HREF} onClick={() => setOpen(false)} className="inline-flex h-14 items-center justify-center border border-pub-line text-sm text-pub-text active:border-pub-muted">Customer Login</Link>
        </div>
      </nav>
    </>
  );
}
