"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";
import { DecorationMark } from "./garment-2d";
import { PLACEMENT_ZONE, SILHOUETTE } from "./silhouettes";
import type { GarmentKind, ProcessStage } from "./types";
import { useI18n } from "@/i18n/provider";

export const PROCESS_STAGE_LABELS = ["Your idea", "Fabric · colour · decoration", "Quotation", "Sample production", "Approved · scaling", "Packed · shipped"] as const;

const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };
const view: CSSProperties = { transformBox: "view-box", transformOrigin: "200px 200px" };
const layer = (on: boolean, transform?: string): CSSProperties => ({ ...view, opacity: on ? 1 : 0, transform: on ? transform : transform ? `${transform} scale(0.96)` : undefined });

const COPY_SLOTS = [[62, -100], [150, -100], [62, 0], [150, 0], [62, 100], [150, 100]] as const;

/**
 * TEMPORARY 2D FALLBACK for the How-It-Works garment. Each stage toggles layers (opacity / transform / clip), no JS animation.
 * A 3D version receives the same `stage` and drives camera, material and scene state instead.
 */
export function ProcessGarment2D({ stage, productType = "tshirt", className }: { stage: ProcessStage; productType?: GarmentKind; className?: string }) {
  const { t, locale } = useI18n();
  const shape = SILHOUETTE[productType];
  const zone = PLACEMENT_ZONE[productType];
  const garmentTransform = stage === 2 ? "translate(-76px, 8px) scale(0.72)" : stage === 4 ? "translate(-98px, 0px) scale(0.6)" : "translate(0px, 0px) scale(1)";
  const showGarment = stage <= 2 || stage === 4;
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label={t("site.stageV1Of6V2", { v1: stage + 1, v2: t.text(PROCESS_STAGE_LABELS[stage]) })} className={cn("size-full", className)} fill="none" data-process-stage={stage}>
      <defs>
        <pattern id="pg-weave" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#1b2420" /><rect width="3" height="6" fill="#26312c" /></pattern>
      </defs>

      {/* 01 idea: technical outline, dimension lines, brief callouts */}
      <g className="pub-layer" style={layer(stage === 0)}>
        <g stroke="var(--pub-muted)" strokeWidth="1" opacity="0.8">
          <path d="M112 366 H288 M112 360 V372 M288 360 V372" /><path d="M382 62 V346 M376 62 H388 M376 346 H388" />
          <path d="M262 150 L336 108 H372 M138 150 L64 108 H28 M200 222 L200 262 L240 290 H282" strokeDasharray="3 4" />
        </g>
        <g fontSize="8" letterSpacing="2" fill="var(--pub-muted)" style={MONO}><text x="200" y="381" textAnchor="middle">CHEST</text><text x="28" y="100">FIT</text><text x="338" y="100">FABRIC</text><text x="248" y="302">ARTWORK</text></g>
      </g>

      {/* the garment itself: outline (dashed until it is configured), fabric reveal, decoration placement */}
      <g className="pub-layer" style={layer(showGarment, garmentTransform)}>
        <g className="pub-layer" style={{ clipPath: stage >= 1 ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" }}>
          <path d={shape} fill="url(#pg-weave)" />
          <g className="pub-layer" style={{ opacity: stage === 1 ? 1 : stage >= 4 ? 1 : 0.9 }}><DecorationMark kind="screen-print" ink="#2bb98c" zone={zone} /></g>
        </g>
        <path d={shape} stroke={stage === 0 ? "var(--pub-muted)" : "var(--pub-text)"} strokeWidth="1.5" strokeDasharray={stage === 0 ? "5 6" : undefined} className="pub-layer" />
        <g className="pub-layer" style={{ opacity: stage === 1 ? 1 : 0 }} stroke="var(--pub-brand)" strokeWidth="1.2">
          <path d={`M${zone.x} ${zone.y + 10} V${zone.y} H${zone.x + 10} M${zone.x + zone.w - 10} ${zone.y} H${zone.x + zone.w} V${zone.y + 10} M${zone.x + zone.w} ${zone.y + zone.h - 10} V${zone.y + zone.h} H${zone.x + zone.w - 10} M${zone.x + 10} ${zone.y + zone.h} H${zone.x} V${zone.y + zone.h - 10}`} />
        </g>
        <g className="pub-layer" style={{ opacity: stage === 4 ? 1 : 0 }}><circle cx="318" cy="96" r="22" fill="var(--pub-brand-deep)" /><path d="M308 96 L316 104 L330 88" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></g>
      </g>

      {/* 02 swatches */}
      <g className="pub-layer" style={layer(stage === 1)}>
        {["#17191a", "#12453a", "#d9d2c3"].map((c, i) => <circle key={c} cx="376" cy={150 + i * 34} r="11" fill={c} stroke={i === 1 ? "var(--pub-brand)" : "var(--pub-line)"} strokeWidth={i === 1 ? 2 : 1} />)}
      </g>

      {/* 03 quotation card */}
      <g className="pub-layer" style={layer(stage === 2, "translate(0px, 0px)")}>
        <g style={{ transform: stage === 2 ? "none" : "translateY(14px)", transition: "transform 0.9s cubic-bezier(0.19,1,0.22,1)" }}>
          <rect x="226" y="80" width="150" height="230" fill="var(--pub-raise)" stroke="var(--pub-line)" />
          <rect x="242" y="98" width="62" height="6" fill="var(--pub-muted)" /><rect x="242" y="110" width="40" height="4" fill="var(--pub-line)" />
          {[140, 166, 192, 218].map((y) => <g key={y}><rect x="242" y={y} width="76" height="5" fill="var(--pub-line)" /><rect x="334" y={y} width="26" height="5" fill="var(--pub-line)" /></g>)}
          <path d="M242 246 H360" stroke="var(--pub-line)" />
          <rect x="242" y="262" width="62" height="8" fill="var(--pub-text)" opacity="0.85" /><rect x="242" y="280" width="118" height="18" fill="var(--pub-brand-deep)" />
        </g>
      </g>

      {/* 04 sample production: cut panels with construction marks, stitched together */}
      <g className="pub-layer" style={layer(stage === 3)} stroke="var(--pub-text)" strokeWidth="1.4">
        <path d="M122 124 Q200 168 278 124 L290 142 V334 H110 V142 Z" fill="url(#pg-weave)" />
        <path d="M30 128 L84 96 L104 176 L52 206 Z" fill="url(#pg-weave)" /><path d="M370 128 L316 96 L296 176 L348 206 Z" fill="url(#pg-weave)" />
        <path d="M148 84 Q200 118 252 84 L252 98 Q200 134 148 98 Z" fill="url(#pg-weave)" />
        <g stroke="var(--pub-brand)" strokeWidth="2" className="pub-stitch" fill="none"><path d="M104 176 L110 142" /><path d="M296 176 L290 142" /><path d="M122 124 Q200 168 278 124" /><path d="M150 112 Q200 146 250 112" /></g>
        <g stroke="var(--pub-muted)" strokeWidth="1"><path d="M200 218 V300 M194 226 L200 218 L206 226" /><path d="M110 200 h6 M290 200 h-6 M110 260 h6 M290 260 h-6" /></g>
        <text x="200" y="262" fontSize="8" letterSpacing="2" textAnchor="middle" fill="var(--pub-muted)" stroke="none" style={MONO}>GRAIN</text>
      </g>

      {/* 05 approve & scale: one approved garment becomes a run */}
      {COPY_SLOTS.map(([tx, ty], i) => (
        <g key={i} className="pub-layer" style={{ ...view, opacity: stage === 4 ? 1 : 0, transform: stage === 4 ? `translate(${tx}px, ${ty}px) scale(0.26)` : "translate(-98px, 0px) scale(0)", transitionDelay: stage === 4 ? `${i * 70}ms` : "0ms" }}>
          <path d={shape} fill="url(#pg-weave)" stroke="var(--pub-text)" strokeWidth="5" />
          <g transform="translate(0 0)"><DecorationMark kind="screen-print" ink="#2bb98c" zone={zone} /></g>
        </g>
      ))}

      {/* 06 delivery: folded garment, packed, in transit */}
      <g className="pub-layer" style={layer(stage === 5)}>
        <path d="M60 330 C 120 250, 240 372, 330 124" stroke="var(--pub-line)" strokeWidth="1.5" strokeDasharray="4 6" />
        <rect x="150" y="196" width="100" height="44" rx="3" fill="url(#pg-weave)" stroke="var(--pub-text)" strokeWidth="1.5" />
        <path d="M186 196 Q200 212 214 196" stroke="var(--pub-text)" strokeWidth="1.2" />
        <rect x="128" y="222" width="144" height="92" fill="var(--pub-raise)" stroke="var(--pub-text)" strokeWidth="1.5" />
        <path d="M128 244 H272 M192 222 V244 M208 222 V244" stroke="var(--pub-text)" strokeWidth="1.5" />
        <circle cx="330" cy="124" r="7" fill="var(--pub-brand)" /><circle cx="330" cy="124" r="14" stroke="var(--pub-brand)" strokeOpacity="0.4" />
        <rect x="288" y="82" width="72" height="22" fill="var(--pub-brand-deep)" /><text x="324" y="97" textAnchor="middle" fontSize="9" letterSpacing="2" fill="#fff" style={MONO}>SHIPPED</text>
      </g>

      <text x="200" y="394" textAnchor="middle" fontSize="9" letterSpacing={locale === "ar" ? 0 : 3} fill="var(--pub-muted)" style={MONO}>{locale === "ar" ? t.text(PROCESS_STAGE_LABELS[stage]) : PROCESS_STAGE_LABELS[stage].toUpperCase()}</text>
    </svg>
  );
}
