import type { GarmentKind } from "./types";

/** Garment families that have a 3D model today. Everything else stays on the 2D fallback. */
export const GARMENT_KINDS_WITH_3D: readonly GarmentKind[] = ["tshirt"];
export const has3dModel = (kind: GarmentKind) => GARMENT_KINDS_WITH_3D.includes(kind);

export interface RendererEnv {
  webgl: boolean;
  saveData?: boolean;
  /** navigator.connection.effectiveType */
  effectiveType?: string;
  /** Narrow viewport (phones). */
  narrow: boolean;
  /** navigator.deviceMemory (GB) and hardwareConcurrency, when the browser reports them. */
  deviceMemory?: number;
  cores?: number;
  /** The visitor explicitly asked for 3D. */
  optIn?: boolean;
}

/**
 * Which renderer to use. 3D automatically only on capable, unconstrained, wide screens. Phones, Save-Data, slow networks and
 * low-end devices get the 2D visual, with an explicit opt-in. No WebGL means 2D, always. (Reduced motion does not disable 3D;
 * it only turns off auto-rotation and animated camera moves inside the viewer.)
 */
export function decideRenderer(env: RendererEnv): "3d" | "2d" {
  if (!env.webgl) return "2d";
  if (env.optIn) return "3d";
  if (env.saveData || (env.effectiveType && /^(slow-2g|2g|3g)$/.test(env.effectiveType))) return "2d";
  if (env.narrow) return "2d";
  if ((env.deviceMemory !== undefined && env.deviceMemory <= 2) || (env.cores !== undefined && env.cores <= 2)) return "2d";
  return "3d";
}
