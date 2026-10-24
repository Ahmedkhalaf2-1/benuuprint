"use client";

import Image from "next/image";
import { LoopVideo } from "@/features/public-site/loop-video";
import { useVideoAllowed } from "@/features/public-site/use-video-allowed";

/**
 * Brand panel shared by the staff and customer sign-in screens (right side from lg, a short band under the form on phones).
 * Reuses the public site's video helpers: the loop plays only where the hero would (wide screen, motion allowed, no Save-Data / slow
 * network) and fades in over the poster; any failure leaves the poster, or the technical grid + stitch fallback when there is no poster.
 * Decorative (aria-hidden); its size never depends on the media, so nothing shifts.
 */
export function AuthVisual({ videoSrc, posterSrc, eyebrow, headline }: { videoSrc: string | null; posterSrc: string | null; eyebrow: string; headline: [string, string] }) {
  const play = useVideoAllowed(!!videoSrc, { minWidth: 1024 });
  const mode = videoSrc && play ? "video" : posterSrc ? "poster" : "fallback";
  return (
    <aside aria-hidden className="relative h-64 overflow-hidden border-t bg-surface-sunken sm:h-80 lg:h-auto lg:border-s lg:border-t-0" data-testid="auth-visual" data-mode={mode}>
      {mode === "fallback" ? <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:32px_32px]" /> : null}
      {mode === "fallback" ? <svg className="absolute inset-0 size-full" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" fill="none"><path d="M-40 520 C 200 420, 380 640, 640 470 S 860 320, 900 360" stroke="var(--brand)" strokeWidth="2" strokeDasharray="6 7" strokeLinecap="round" /></svg> : null}
      {posterSrc ? <Image src={posterSrc} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" priority className="object-cover object-[55%_center]" /> : null}
      {videoSrc && play ? <LoopVideo src={videoSrc} poster={posterSrc ?? undefined} className="object-[55%_center]" /> : null}
      {/* blend into the page: emerald tint, a floor for the caption, (the technical grid is only used by the no-media fallback) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_85%_100%,rgb(12_127_93/0.22),transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface-sunken/95 via-surface-sunken/5 to-surface-sunken/25" />
      <div className="absolute inset-x-6 bottom-6 sm:inset-x-10 lg:inset-x-12 lg:bottom-12">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
        <p className="mt-2 text-xl font-semibold leading-tight tracking-[-0.03em] sm:text-2xl lg:mt-3 lg:text-3xl">{headline[0]}<br />{headline[1]}</p>
      </div>
    </aside>
  );
}
