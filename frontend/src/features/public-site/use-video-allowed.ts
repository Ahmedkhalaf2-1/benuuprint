"use client";

import { useEffect, useState } from "react";
import { shouldPlayHeroVideo, shouldPlayMobileHeroVideo } from "./video-policy";

interface Options {
  /** Viewport width (px) from which video is allowed under the standard policy. Default 768. */
  minWidth?: number;
  /** Also allow the stricter phone policy below `minWidth` (used by the hero only). */
  allowMobile?: boolean;
}

export type VideoDecision = "pending" | "allow" | "deny";

/**
 * Same policy as `useVideoAllowed`, but distinguishes "not decided yet" (first render, before the effect can read the device) from a
 * real "deny". Callers mount the video during "pending" so it starts loading with the page and only fall back on "deny".
 */
export function useVideoDecision(enabled = true, { minWidth = 768, allowMobile = false }: Options = {}): VideoDecision {
  const [decision, setDecision] = useState<VideoDecision>("pending");
  useEffect(() => {
    if (!enabled) return;
    if (typeof window.matchMedia !== "function") { const settle = () => setDecision("allow"); settle(); return; }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia(`(min-width: ${minWidth}px)`);
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
    const evaluate = () => {
      const env = { reducedMotion: motion.matches, wide: wide.matches, saveData: nav.connection?.saveData, effectiveType: nav.connection?.effectiveType, deviceMemory: nav.deviceMemory, cores: navigator.hardwareConcurrency };
      setDecision((wide.matches ? shouldPlayHeroVideo(env) : allowMobile && shouldPlayMobileHeroVideo(env)) ? "allow" : "deny");
    };
    evaluate();
    motion.addEventListener("change", evaluate);
    wide.addEventListener("change", evaluate);
    return () => { motion.removeEventListener("change", evaluate); wide.removeEventListener("change", evaluate); };
  }, [enabled, minWidth, allowMobile]);
  return enabled ? decision : "deny";
}

/** Whether decorative autoplay video is welcome right now (reduced motion, width, Save-Data, network and device all respected, live). */
export function useVideoAllowed(enabled = true, options: Options = {}): boolean {
  return useVideoDecision(enabled, options) === "allow";
}
