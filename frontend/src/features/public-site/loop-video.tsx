"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Decorative background video: muted, looping, inline, no controls, aria-hidden, never asks for a click.
 *
 * - `priority` (the above-the-fold hero) preloads the whole file and starts as soon as the browser can; everything else only fetches
 *   metadata until it is about to be seen.
 * - Playback follows the viewport: it plays when on (or just about to be on) screen and pauses when scrolled away, so a phone never
 *   decodes two videos at once. If the browser refuses autoplay the failure is swallowed and playback is retried on the next safe
 *   moment (data loaded, tab visible again, re-entering the viewport).
 * - It is invisible until frames are really playing and then fades in quickly over whatever neutral background sits behind it; it
 *   deliberately shows no poster. `onFail` fires only on a real load error so the parent can choose a fallback.
 */
export function LoopVideo({ src, className, priority = false, onFail }: { src: string; className?: string; priority?: boolean; onFail?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const el = useRef<HTMLVideoElement | null>(null);
  const visible = useRef(true);

  const tryPlay = useCallback(() => {
    const node = el.current;
    if (!node || !visible.current) return;
    node.muted = true; // iOS Safari decides autoplay from the muted state at play time
    try { void Promise.resolve(node.play?.()).catch(() => undefined); } catch { /* refused: retried on the next lifecycle event */ }
  }, []);

  // React does not reliably reflect `muted` as an attribute; browsers need it before they will autoplay.
  const attach = useCallback((node: HTMLVideoElement | null) => {
    el.current = node;
    if (!node) return;
    node.muted = true;
    node.defaultMuted = true;
    node.setAttribute("muted", "");
    node.setAttribute("playsinline", "");
    node.setAttribute("webkit-playsinline", "");
    tryPlay();
  }, [tryPlay]);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const onVisibility = () => { if (document.visibilityState === "visible") tryPlay(); };
    document.addEventListener("visibilitychange", onVisibility);
    node.addEventListener("loadeddata", tryPlay);
    node.addEventListener("canplay", tryPlay);
    if (typeof IntersectionObserver === "undefined") tryPlay();
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([e]) => {
      if (!e) return;
      visible.current = e.isIntersecting;
      if (e.isIntersecting) tryPlay(); else node.pause?.();
    }, { rootMargin: priority ? "0px" : "200px 0px", threshold: 0.01 });
    io?.observe(node);
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      node.removeEventListener("loadeddata", tryPlay);
      node.removeEventListener("canplay", tryPlay);
    };
  }, [priority, tryPlay]);

  return (
    <video
      ref={attach}
      className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", playing ? "opacity-100" : "opacity-0", className)}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload={priority ? "auto" : "metadata"}
      aria-hidden
      tabIndex={-1}
      controls={false}
      disablePictureInPicture
      disableRemotePlayback
      data-playing={playing}
      onPlaying={() => setPlaying(true)}
      onError={() => onFail?.()}
    />
  );
}
