"use client";

import { useEffect, useState } from "react";
import { shouldPlayHeroVideo, shouldPlayMobileHeroVideo } from "./video-policy";

interface Options {
  /** Viewport width (px) from which video is allowed under the standard policy. Default 768. */
  minWidth?: number;
  /** Also allow the stricter phone policy below `minWidth` (used by the hero only). */
  allowMobile?: boolean;
}

/** Whether decorative autoplay video is welcome right now (reduced motion, width, Save-Data, network and device all respected, live). */
export function useVideoAllowed(enabled = true, { minWidth = 768, allowMobile = false }: Options = {}): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (!enabled || typeof window.matchMedia !== "function") return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia(`(min-width: ${minWidth}px)`);
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
    const evaluate = () => {
      const env = { reducedMotion: motion.matches, wide: wide.matches, saveData: nav.connection?.saveData, effectiveType: nav.connection?.effectiveType, deviceMemory: nav.deviceMemory, cores: navigator.hardwareConcurrency };
      setAllowed(wide.matches ? shouldPlayHeroVideo(env) : allowMobile && shouldPlayMobileHeroVideo(env));
    };
    evaluate();
    motion.addEventListener("change", evaluate);
    wide.addEventListener("change", evaluate);
    return () => { motion.removeEventListener("change", evaluate); wide.removeEventListener("change", evaluate); };
  }, [enabled, minWidth, allowMobile]);
  return enabled && allowed;
}
