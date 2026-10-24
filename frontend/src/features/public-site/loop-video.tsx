"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Decorative background video: muted, looping, inline, no controls, aria-hidden. It stays invisible until frames are actually
 * playing, so whatever sits underneath (poster / 2D fallback) is never replaced by an empty box, and it removes itself on error.
 */
export function LoopVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const el = useRef<HTMLVideoElement | null>(null);
  // React does not reliably reflect the `muted` prop as an attribute, and browsers (iOS Safari especially) decide autoplay from the
  // element's muted state at play time. Set it explicitly, then ask to play; a refusal just leaves the still underneath.
  const attach = useCallback((node: HTMLVideoElement | null) => {
    el.current = node;
    if (!node) return;
    node.muted = true;
    node.defaultMuted = true;
    node.setAttribute("muted", "");
    node.setAttribute("playsinline", "");
    try { void Promise.resolve(node.play?.()).catch(() => undefined); } catch { /* autoplay refused: the still underneath stays */ }
  }, []);
  // Only the video that is on screen plays: a phone never decodes two at once, and scrolled-away video costs nothing.
  useEffect(() => {
    const node = el.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (!e) return;
      if (e.isIntersecting) void Promise.resolve(node.play?.()).catch(() => undefined); else node.pause?.();
    }, { threshold: 0.05 });
    io.observe(node);
    return () => io.disconnect();
  }, [failed]);
  if (failed) return null;
  return (
    <video
      ref={attach}
      className={cn("absolute inset-0 size-full object-cover transition-opacity duration-700", playing ? "opacity-100" : "opacity-0", className)}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      tabIndex={-1}
      disablePictureInPicture
      data-playing={playing}
      onPlaying={() => setPlaying(true)}
      onError={() => setFailed(true)}
    />
  );
}
