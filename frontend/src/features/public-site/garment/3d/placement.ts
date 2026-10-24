import { PLACEMENT_ZONE } from "../silhouettes";
import type { GarmentKind } from "../types";

/**
 * Maps the shared 2D placement zone (400×400 canvas) onto the stand-in tee's front surface, so the 2D and 3D visuals use ONE
 * placement definition. Torso: height 2.3 (y 1.15 … -1.15), half-width 0.95, 2D body spans y 62…346 and x 112…288.
 */
export function chestPlacement(kind: GarmentKind) {
  const z = PLACEMENT_ZONE[kind];
  const cx = z.x + z.w / 2;
  const cy = z.y + z.h / 2;
  return { x: (cx - 200) * (0.95 / 88), y: 1.15 - ((cy - 62) / 284) * 2.3, size: z.w * (0.95 / 88) };
}
