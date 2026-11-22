"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import type { GarmentKind } from "@/features/public-site/garment/types";
import { placementSpec, type PlacementId, type PlacementSpec, type PrintTechnique, type ViewFace } from "./placement-config";

/**
 * Local, visual-only print design state: which artwork sits where, at what preview size/offset/rotation.
 * Nothing here is sent anywhere. Artwork is a local object URL (revoked when replaced/removed); files are only uploaded by the
 * existing sample workflow when the customer explicitly adds the artwork to a decoration.
 */
export type PrintSource =
  | { type: "artwork"; url: string; name: string; aspect: number; file: File }
  | { type: "look"; key: PrintTechnique };

export interface PrintLayer {
  placement: PlacementId;
  source: PrintSource;
  /** Longest edge, fraction of garment height (clamped to the placement's min/max). */
  size: number;
  /** Offset from the placement anchor, fraction of garment height (clamped to the placement's range). */
  du: number;
  dv: number;
  /** Degrees (clamped to ±maxRotation). */
  rotation: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clampLayer(spec: PlacementSpec, l: PrintLayer): PrintLayer {
  return { ...l, size: clamp(l.size, spec.minSize, spec.maxSize), du: clamp(l.du, -spec.range.u, spec.range.u), dv: clamp(l.dv, -spec.range.y, spec.range.y), rotation: clamp(l.rotation, -spec.maxRotation, spec.maxRotation) };
}
export const defaultLayer = (spec: PlacementSpec, source: PrintSource): PrintLayer => ({ placement: spec.id, source, size: spec.size, du: 0, dv: 0, rotation: 0 });

/* ---------------------------------- artwork intake ---------------------------------- */
/** Raster only: SVG is never accepted (no untrusted markup in the page). PDF artwork still goes through the Files step. */
export const ARTWORK_ACCEPT = "image/png,image/jpeg,image/webp";
/** Mirrors the default server upload limit (the server stays the authority). */
export const ARTWORK_MAX_BYTES = 20 * 1024 * 1024;
export type ArtworkError = "type" | "size" | "read";

export async function readArtwork(file: File): Promise<{ ok: true; source: Extract<PrintSource, { type: "artwork" }> } | { ok: false; error: ArtworkError }> {
  if (!ARTWORK_ACCEPT.split(",").includes(file.type)) return { ok: false, error: "type" };
  if (file.size > ARTWORK_MAX_BYTES) return { ok: false, error: "size" };
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("empty");
    return { ok: true, source: { type: "artwork", url, name: file.name, aspect: img.naturalWidth / img.naturalHeight, file } };
  } catch {
    URL.revokeObjectURL(url);
    return { ok: false, error: "read" };
  }
}

const release = (l: PrintLayer | undefined) => { if (l?.source.type === "artwork") URL.revokeObjectURL(l.source.url); };

/* --------------------------------------- store --------------------------------------- */
export interface DesignState { active: PlacementId | null; layers: Partial<Record<PlacementId, PrintLayer>> }
const EMPTY: DesignState = { active: null, layers: {} };

/** In-memory stores keyed by e.g. a sample id, so the design survives moving between wizard steps (never persisted to disk). */
const stores = new Map<string, { state: DesignState; subs: Set<() => void> }>();
function storeFor(key: string) {
  let s = stores.get(key);
  if (!s) { s = { state: EMPTY, subs: new Set() }; stores.set(key, s); }
  return s;
}
export const hasDesign = (key: string) => Object.keys(stores.get(key)?.state.layers ?? {}).length > 0;

/**
 * `key`: a persistent key (sample id) keeps the design for the session; without one the design lives with the component and
 * its object URLs are revoked on unmount.
 */
export function usePrintDesign(kind: GarmentKind, key?: string) {
  const localKey = `local:${useId()}`;
  const k = key ?? localKey;
  const store = storeFor(k);
  const state = useSyncExternalStore(
    useCallback((cb) => { const s = storeFor(k); s.subs.add(cb); return () => { s.subs.delete(cb); }; }, [k]),
    () => storeFor(k).state,
    () => EMPTY,
  );
  const set = useCallback((fn: (s: DesignState) => DesignState) => { const s = storeFor(k); s.state = fn(s.state); s.subs.forEach((cb) => cb()); }, [k]);

  // Switching garment: layers it cannot show are dropped (different garments have different calibrated print areas), the rest
  // are re-clamped to the new garment's limits.
  useEffect(() => {
    const cur = store.state;
    let changed = false;
    const layers: DesignState["layers"] = {};
    for (const [id, l] of Object.entries(cur.layers) as Array<[PlacementId, PrintLayer]>) {
      const spec = placementSpec(kind, id);
      if (!spec) { release(l); changed = true; continue; }
      const c = clampLayer(spec, l);
      if (c.size !== l.size || c.du !== l.du || c.dv !== l.dv || c.rotation !== l.rotation) changed = true;
      layers[id] = c;
    }
    const activeValid = !cur.active || !!placementSpec(kind, cur.active);
    if (!changed && activeValid) return;
    set(() => ({ active: activeValid ? cur.active : (Object.keys(layers)[0] as PlacementId | undefined) ?? null, layers }));
  }, [kind, set, store]);

  // Component-owned designs free their object URLs on unmount.
  useEffect(() => {
    if (key) return;
    const id = localKey;
    return () => { const s = stores.get(id); if (s) { Object.values(s.state.layers).forEach(release); stores.delete(id); } };
  }, [key, localKey]);

  const update = useCallback((id: PlacementId, patch: Partial<PrintLayer>) => set((s) => {
    const spec = placementSpec(kind, id);
    const cur = s.layers[id];
    if (!spec || !cur) return s;
    return { ...s, layers: { ...s.layers, [id]: clampLayer(spec, { ...cur, ...patch }) } };
  }), [kind, set]);

  return {
    state,
    active: state.active,
    layers: state.layers,
    select: useCallback((id: PlacementId | null) => set((s) => ({ ...s, active: id })), [set]),
    /** Puts (or replaces) the source at a placement, keeping the current size/offset when replacing. */
    place: useCallback((id: PlacementId, source: PrintSource) => set((s) => {
      const spec = placementSpec(kind, id);
      if (!spec) return s;
      const cur = s.layers[id];
      if (cur && cur.source !== source) release(cur);
      return { active: id, layers: { ...s.layers, [id]: cur ? { ...cur, source } : defaultLayer(spec, source) } };
    }), [kind, set]),
    update,
    restore: useCallback((id: PlacementId) => set((s) => {
      const spec = placementSpec(kind, id);
      const cur = s.layers[id];
      return spec && cur ? { ...s, layers: { ...s.layers, [id]: defaultLayer(spec, cur.source) } } : s;
    }), [kind, set]),
    remove: useCallback((id: PlacementId) => set((s) => {
      const layers = { ...s.layers };
      release(layers[id]);
      delete layers[id];
      return { ...s, layers };
    }), [set]),
  };
}

/** Camera face that follows the selected placement (front prints → front, back prints → back, sleeves → that side). */
export function usePlacementView(kind: GarmentKind, active: PlacementId | null) {
  const [view, setView] = useState<ViewFace>("front");
  const sig = active ? `${kind}:${active}` : null;
  const [seen, setSeen] = useState(sig);
  if (sig !== seen) {
    setSeen(sig);
    const s = active ? placementSpec(kind, active) : null;
    if (s) setView(s.face);
  }
  return [view, setView] as const;
}
