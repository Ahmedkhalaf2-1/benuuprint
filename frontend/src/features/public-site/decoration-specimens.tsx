import type { DecorationVisualKey } from "./garment/types";

const RAYS = Array.from({ length: 36 }, (_, i) => (i / 36) * Math.PI * 2);

/**
 * Close-up specimens, one distinct treatment per method (decorative, not production samples). `kind` is the same token a future
 * 3D viewer would map to a decal / texture / geometry.
 */
export function DecorationSpecimen({ kind }: { kind: DecorationVisualKey }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="size-full" fill="none" data-decoration-visual={kind}>
      <rect width="200" height="200" fill="#161a19" />
      <rect width="200" height="200" fill="url(#ds-cloth)" opacity="0.6" />
      <defs>
        <pattern id="ds-cloth" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="#222827" /></pattern>
        <pattern id="ds-halftone" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="2.6" fill="#2bb98c" /></pattern>
        <pattern id="ds-dtf" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="1.5" height="1.5" fill="#fff" opacity="0.08" /></pattern>
        <filter id="ds-puff" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="2" dy="5" stdDeviation="3" floodColor="#000" floodOpacity="0.7" /></filter>
        <linearGradient id="ds-sub" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#12332a" /><stop offset="0.45" stopColor="#1f6b57" /><stop offset="0.75" stopColor="#33425f" /><stop offset="1" stopColor="#12332a" /></linearGradient>
      </defs>
      {kind === "screen-print" ? (
        <g>
          <circle cx="100" cy="86" r="46" fill="#2bb98c" />
          <path d="M54 150 H146 V162 H54 Z" fill="#f2efe9" />
          <rect x="100" y="42" width="90" height="92" fill="url(#ds-halftone)" opacity="0.9" style={{ mixBlendMode: "screen" }} />
        </g>
      ) : null}
      {kind === "dtf" ? (
        <g>
          <circle cx="86" cy="92" r="46" fill="#0c7f5d" opacity="0.95" />
          <circle cx="118" cy="104" r="38" fill="#2bb98c" opacity="0.8" />
          <circle cx="96" cy="70" r="24" fill="#d9d2c3" opacity="0.8" />
          <circle cx="124" cy="78" r="14" fill="#5b7bd0" opacity="0.8" />
          <rect x="30" y="40" width="140" height="120" fill="url(#ds-dtf)" />
          <path d="M40 160 H160" stroke="#d9d2c3" strokeWidth="1" opacity="0.7" />
        </g>
      ) : null}
      {kind === "embroidery" ? (
        <g className="group-hover:opacity-100">
          {RAYS.map((a, i) => <path key={i} d={`M${100 + Math.cos(a) * 24} ${96 + Math.sin(a) * 24} L${100 + Math.cos(a) * 52} ${96 + Math.sin(a) * 52}`} stroke={i % 2 ? "#2bb98c" : "#d9d2c3"} strokeWidth="2" strokeLinecap="round" />)}
          <circle cx="100" cy="96" r="56" stroke="#2bb98c" strokeWidth="1.5" strokeDasharray="4 3.5" />
          <path d="M78 164 H122" stroke="#d9d2c3" strokeWidth="2" strokeDasharray="5 3" />
        </g>
      ) : null}
      {kind === "puff" ? (
        <g filter="url(#ds-puff)">
          <circle cx="100" cy="88" r="44" fill="#0c7f5d" />
          <rect x="58" y="146" width="84" height="14" rx="7" fill="#0c7f5d" />
          <path d="M66 70 A44 44 0 0 1 112 46" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : null}
      {kind === "sublimation" ? (
        <g>
          <rect width="200" height="200" fill="url(#ds-sub)" />
          <path d="M0 70 C 50 30, 90 120, 140 70 S 190 40, 200 60 M0 120 C 60 80, 100 170, 150 120 S 190 100, 200 110 M0 170 C 60 130, 110 210, 160 170" stroke="#2bb98c" strokeOpacity="0.5" strokeWidth="1.5" />
        </g>
      ) : null}
    </svg>
  );
}
