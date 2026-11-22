import { GARMENT_MODELS } from "@/features/garment-3d/model-registry";
import { GARMENT_KINDS, type GarmentKind } from "./types";

/** Garment families that have a real 3D model (see garment-3d/model-registry). Others show an explicit "no 3D model" state. */
export const GARMENT_KINDS_WITH_3D: readonly GarmentKind[] = GARMENT_KINDS.filter((k) => !!GARMENT_MODELS[k]);
export const has3dModel = (kind: GarmentKind) => GARMENT_KINDS_WITH_3D.includes(kind);

export interface RendererEnv {
  webgl: boolean;
  saveData?: boolean;
  /** navigator.connection.effectiveType */
  effectiveType?: string;
  /** navigator.deviceMemory (GB) and hardwareConcurrency, when the browser reports them. */
  deviceMemory?: number;
  cores?: number;
  /** The visitor explicitly asked for 3D. */
  optIn?: boolean;
}

/**
 * How a garment viewer starts. The real GLB is the only garment visual, so there is no illustration mode:
 *   "3d"     load the model now (any WebGL device, phones included; the viewer caps pixel ratio on phones);
 *   "opt-in" the visitor asked to save data / is on a very slow network / a very low-end device: a "View in 3D" button loads it;
 *   "none"   no WebGL: an explicit "3D isn't available on this device" state (never a fake garment).
 */
export type RendererMode = "3d" | "opt-in" | "none";
export function decideRenderer(env: RendererEnv): RendererMode {
  if (!env.webgl) return "none";
  if (env.optIn) return "3d";
  if (env.saveData || (env.effectiveType && /^(slow-2g|2g)$/.test(env.effectiveType))) return "opt-in";
  if ((env.deviceMemory !== undefined && env.deviceMemory <= 1) || (env.cores !== undefined && env.cores <= 1)) return "opt-in";
  return "3d";
}
