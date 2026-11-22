"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { decideRenderer, type RendererEnv, type RendererMode } from "./renderer-policy";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch { return false; }
}

/** A visitor's "View in 3D" applies to every garment viewer on the page (e.g. each card of the phone carousel), for this visit. */
let optedIn = false;
const optInSubs = new Set<() => void>();
const subscribeOptIn = (cb: () => void) => { optInSubs.add(cb); return () => { optInSubs.delete(cb); }; };
const setOptedIn = () => { optedIn = true; optInSubs.forEach((cb) => cb()); };

/**
 * Client-side capability check for a garment viewer. "pending" until it has run (that is also what the server renders: the empty,
 * dark viewer with a loading indicator), then "3d" | "opt-in" | "none". There is no illustration mode.
 */
export function useGarmentRenderer(enabled: boolean): { mode: RendererMode | "pending"; requestOptIn: () => void } {
  const [env, setEnv] = useState<Omit<RendererEnv, "optIn"> | null>(null);
  const optIn = useSyncExternalStore(subscribeOptIn, () => optedIn, () => false);

  useEffect(() => {
    if (!enabled) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
    // Capability detection can only run in the browser: one state update after mount.
    const read = () => setEnv({ webgl: hasWebGL(), saveData: nav.connection?.saveData, effectiveType: nav.connection?.effectiveType, deviceMemory: nav.deviceMemory, cores: navigator.hardwareConcurrency });
    read();
  }, [enabled]);

  return { mode: env ? decideRenderer({ ...env, optIn }) : "pending", requestOptIn: useCallback(() => setOptedIn(), []) };
}
