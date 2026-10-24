"use client";

import { useCallback, useEffect, useState } from "react";
import { decideRenderer, type RendererEnv } from "./renderer-policy";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch { return false; }
}

/** Client-side renderer choice for a garment visual. Starts as "2d" (matches SSR), upgrades after capability detection. */
export function useGarmentRenderer(enabled: boolean) {
  const [env, setEnv] = useState<Omit<RendererEnv, "optIn"> | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number }).connection;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const wide = typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 768px)") : null;
    const read = () => setEnv({ webgl: hasWebGL(), saveData: conn?.saveData, effectiveType: conn?.effectiveType, narrow: wide ? !wide.matches : true, deviceMemory: mem, cores: navigator.hardwareConcurrency });
    read();
    wide?.addEventListener("change", read);
    return () => wide?.removeEventListener("change", read);
  }, [enabled]);

  const renderer = enabled && env && !failed ? decideRenderer({ ...env, optIn }) : "2d";
  return {
    renderer,
    /** 3D is possible here but not automatic (phone / constrained): offer an explicit button. */
    canOptIn: enabled && !!env?.webgl && !failed && renderer === "2d",
    requestOptIn: useCallback(() => setOptIn(true), []),
    reportFailure: useCallback(() => setFailed(true), []),
  };
}
