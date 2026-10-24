import { CanvasTexture, RepeatWrapping, type Texture } from "three";
import type { FabricVisualKey } from "../types";

/** Basic, decorative material tokens per fabric look. NOT measured data: no real weight, composition or PBR scans. */
export const FABRIC_MATERIAL: Record<FabricVisualKey, { roughness: number; sheen: number; bump: number; repeat: number }> = {
  jersey: { roughness: 0.82, sheen: 0.35, bump: 0.35, repeat: 28 },
  rib: { roughness: 0.88, sheen: 0.3, bump: 0.7, repeat: 22 },
  fleece: { roughness: 1, sheen: 0.7, bump: 0.9, repeat: 34 },
  brushed: { roughness: 0.95, sheen: 0.8, bump: 0.5, repeat: 40 },
  twill: { roughness: 0.78, sheen: 0.25, bump: 0.8, repeat: 24 },
};

const cache = new Map<FabricVisualKey, Texture>();

/** Small procedural bump map for each fabric look (generated once, cached). */
export function fabricBump(kind: FabricVisualKey): Texture {
  const hit = cache.get(kind);
  if (hit) return hit;
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, s, s);
  g.strokeStyle = "#fff";
  g.fillStyle = "#fff";
  g.lineWidth = 2;
  if (kind === "jersey") for (let x = 0; x < s; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 4, s); g.stroke(); }
  else if (kind === "rib") for (let x = 0; x < s; x += 8) g.fillRect(x, 0, 4, s);
  else if (kind === "twill") for (let i = -s; i < s * 2; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); }
  else { for (let i = 0; i < (kind === "fleece" ? 260 : 420); i++) { g.globalAlpha = 0.25 + Math.random() * 0.5; g.fillRect(Math.random() * s, Math.random() * s, kind === "fleece" ? 2 : 1, kind === "fleece" ? 2 : 3); } g.globalAlpha = 1; }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  cache.set(kind, t);
  return t;
}
