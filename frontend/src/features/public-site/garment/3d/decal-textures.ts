import { CanvasTexture, SRGBColorSpace } from "three";
import type { DecorationVisualKey } from "../types";

/** Canvas artwork for each decoration look. Same visual language as the 2D marks; stand-ins until real artwork placement exists. */
export function decorationTexture(kind: Exclude<DecorationVisualKey, "sublimation">, ink: string): CanvasTexture {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, s, s);
  const cx = s / 2, cy = s / 2, r = 150;
  g.lineCap = "round";
  if (kind === "embroidery") {
    g.strokeStyle = ink; g.lineWidth = 14; g.setLineDash([18, 12]);
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 9; g.setLineDash([12, 12]);
    g.beginPath(); g.arc(cx, cy, r * 0.62, 0, Math.PI * 2); g.stroke();
    g.setLineDash([14, 10]);
    g.beginPath(); g.moveTo(cx - 52, cy + 45); g.lineTo(cx, cy - 60); g.lineTo(cx + 52, cy + 45); g.closePath(); g.stroke();
  } else if (kind === "screen-print") {
    g.fillStyle = ink; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.fillRect(cx - r, cy + r + 24, r * 2, 22);
  } else if (kind === "dtf") {
    const dot = (x: number, y: number, rad: number, col: string, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); };
    dot(cx, cy, r, "#0c7f5d"); dot(cx + 70, cy + 50, r * 0.72, "#2bb98c", 0.85); dot(cx - 60, cy - 60, r * 0.42, "#d9d2c3", 0.85); g.globalAlpha = 1;
  } else {
    const grad = g.createRadialGradient(cx - 50, cy - 60, 10, cx, cy, r);
    grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.35, ink); grad.addColorStop(1, ink);
    g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Height map for puff (raised centre). */
export function puffBump(): CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000"; g.fillRect(0, 0, s, s);
  const grad = g.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, 76);
  grad.addColorStop(0, "#fff"); grad.addColorStop(1, "#000");
  g.fillStyle = grad; g.beginPath(); g.arc(s / 2, s / 2, 76, 0, Math.PI * 2); g.fill();
  return new CanvasTexture(c);
}

/** All-over field for sublimation, applied as the garment's colour map. */
export function sublimationTexture(): CanvasTexture {
  const w = 512, h = 512;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#12332a"); grad.addColorStop(0.45, "#1f6b57"); grad.addColorStop(0.75, "#33425f"); grad.addColorStop(1, "#12332a");
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#2bb98c"; g.globalAlpha = 0.5; g.lineWidth = 3;
  for (let y = 80; y < h; y += 90) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(130, y - 70, 260, y + 70, w, y - 20); g.stroke(); }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
