import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import { PLACEMENT_ZONE, SILHOUETTE, SeamDetails } from "./silhouettes";
import type { DecorationVisualKey, FabricVisualKey, GarmentVisualProps } from "./types";

/** Ink that stays legible on the garment colour. */
export function readableOn(hex: string): string {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 140 ? "#111312" : "#f2efe9";
}

function FabricOverlay({ id, fabric }: { id: string; fabric: FabricVisualKey }) {
  switch (fabric) {
    case "jersey": return <pattern id={id} width="4" height="6" patternUnits="userSpaceOnUse"><path d="M0 0 L2 6 M2 0 L4 6" stroke="#fff" strokeWidth="0.6" opacity="0.1" /></pattern>;
    case "rib": return <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="3" height="6" fill="#fff" opacity="0.07" /></pattern>;
    case "fleece": return <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#fff" opacity="0.09" /><circle cx="5.5" cy="5" r="0.8" fill="#000" opacity="0.12" /></pattern>;
    case "brushed": return <pattern id={id} width="5" height="9" patternUnits="userSpaceOnUse"><path d="M1 0 V9 M3.5 0 V9" stroke="#fff" strokeWidth="0.4" opacity="0.07" /></pattern>;
    default: return <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="#fff" opacity="0.07" /></pattern>;
  }
}

/** Decoration marks, drawn inside the placement zone (sublimation is a continuous field instead and is drawn over the whole garment). */
export function DecorationMark({ kind, ink, zone }: { kind: Exclude<DecorationVisualKey, "sublimation">; ink: string; zone: { x: number; y: number; w: number; h: number } }) {
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.h / 2;
  const r = Math.min(zone.w, zone.h) * 0.3;
  switch (kind) {
    case "embroidery":
      return (
        <g fill="none" stroke={ink} strokeLinecap="round">
          <circle cx={cx} cy={cy} r={r} strokeWidth="2.5" strokeDasharray="3 2.5" />
          <circle cx={cx} cy={cy} r={r * 0.62} strokeWidth="1.5" strokeDasharray="2 2.5" />
          <path d={`M${cx - r * 0.35} ${cy + r * 0.3} L${cx} ${cy - r * 0.4} L${cx + r * 0.35} ${cy + r * 0.3} Z`} strokeWidth="2" strokeDasharray="2.5 2" />
        </g>
      );
    case "screen-print":
      return <g fill={ink}><circle cx={cx} cy={cy} r={r} /><rect x={cx - r} y={cy + r + 6} width={r * 2} height="5" />{[0, 1, 2, 3].map((i) => <circle key={i} cx={cx - r + 4 + i * (r / 1.6)} cy={cy + r + 22} r={1 + i * 0.6} />)}</g>;
    case "dtf":
      return <g><circle cx={cx} cy={cy} r={r} fill="#0c7f5d" /><circle cx={cx + r * 0.45} cy={cy + r * 0.3} r={r * 0.7} fill="#2bb98c" opacity="0.85" /><circle cx={cx - r * 0.4} cy={cy - r * 0.4} r={r * 0.4} fill="#d9d2c3" opacity="0.85" /><path d={`M${cx - r} ${cy + r + 8} H${cx + r}`} stroke="#d9d2c3" strokeWidth="1.2" opacity="0.7" /></g>;
    default:
      return <g><circle cx={cx + 1.5} cy={cy + 2.5} r={r} fill="#000" opacity="0.45" /><circle cx={cx} cy={cy} r={r} fill={ink} /><path d={`M${cx - r * 0.7} ${cy - r * 0.45} A${r} ${r} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.92}`} stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.55" strokeLinecap="round" /></g>;
  }
}

/**
 * TEMPORARY 2D FALLBACK for the garment visual. This is the single file a future 3D viewer replaces; the props are the contract.
 */
export function Garment2D({ productType, colour = "#17191a", fabric = "twill", decoration = null, className, reducedMotion }: GarmentVisualProps) {
  const uid = useId().replace(/:/g, "");
  const shape = SILHOUETTE[productType];
  const zone = PLACEMENT_ZONE[productType];
  const ink = readableOn(colour);
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label={`${productType} preview${decoration ? ` with ${decoration.replace("-", " ")}` : ""}`}
      className={cn("size-full", reducedMotion && "pub-static", className)}
      style={{ color: ink }}
      fill="none"
      data-garment-visual="2d"
      data-garment-kind={productType}
      data-garment-colour={colour}
      data-garment-fabric={fabric}
      data-garment-decoration={decoration ?? "none"}
    >
      <defs>
        <FabricOverlay id={`${uid}-f`} fabric={fabric} />
        <linearGradient id={`${uid}-s`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.32" /><stop offset="0.35" stopColor="#fff" stopOpacity="0.07" /><stop offset="0.7" stopColor="#000" stopOpacity="0.06" /><stop offset="1" stopColor="#000" stopOpacity="0.34" />
        </linearGradient>
        <clipPath id={`${uid}-c`}><path d={shape} /></clipPath>
        <radialGradient id={`${uid}-g`} cx="0.5" cy="1" r="0.7"><stop offset="0" stopColor="#2bb98c" stopOpacity="0.12" /><stop offset="1" stopColor="#2bb98c" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="200" cy="372" rx="130" ry="9" fill="#000" opacity="0.35" />
      <path d={shape} fill={colour} style={{ transition: "fill 450ms ease" }} />
      <path d={shape} fill={`url(#${uid}-f)`} />
      <path d={shape} fill={`url(#${uid}-s)`} />
      <path d={shape} fill={`url(#${uid}-g)`} />
      <g clipPath={`url(#${uid}-c)`}>
        {decoration === "sublimation" ? (
          <g opacity="0.9">
            <path d="M0 150 C 90 100, 150 220, 260 160 S 380 120, 420 170 V420 H0 Z" fill="#0c7f5d" opacity="0.55" />
            <path d="M0 230 C 110 190, 170 300, 280 240 S 390 210, 420 250 V420 H0 Z" fill="#1a2b4a" opacity="0.6" />
            <path d="M0 300 C 100 270, 180 350, 290 300 S 380 290, 420 320 V420 H0 Z" fill="#2bb98c" opacity="0.4" />
          </g>
        ) : null}
      </g>
      <path d={shape} stroke={ink} strokeOpacity="0.28" strokeWidth="1.25" />
      <g style={{ color: ink }}><SeamDetails kind={productType} /></g>
      {decoration && decoration !== "sublimation" ? <DecorationMark kind={decoration} ink={ink} zone={zone} /> : null}
    </svg>
  );
}
