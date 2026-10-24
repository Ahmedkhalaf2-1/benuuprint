import type { GarmentKind } from "./types";

/** Temporary flat outlines on a 400×400 canvas. They exist only until 3D models replace them. */
export const SILHOUETTE: Record<GarmentKind, string> = {
  tshirt: "M138 62 L92 84 L36 142 L78 184 L112 160 L112 346 L288 346 L288 160 L322 184 L364 142 L308 84 L262 62 Q200 108 138 62 Z",
  sportswear: "M138 62 L92 84 L36 142 L78 184 L112 160 L112 346 L288 346 L288 160 L322 184 L364 142 L308 84 L262 62 Q200 108 138 62 Z",
  polo: "M138 62 L92 84 L40 138 L80 178 L112 156 L112 346 L288 346 L288 156 L320 178 L360 138 L308 84 L262 62 Q200 100 138 62 Z",
  sweatshirt: "M138 62 L96 82 L56 130 L40 322 L84 328 L112 196 L112 346 L288 346 L288 196 L316 328 L360 322 L344 130 L304 82 L262 62 Q200 106 138 62 Z",
  hoodie: "M138 62 L96 82 L56 130 L40 322 L84 328 L112 196 L112 346 L288 346 L288 196 L316 328 L360 322 L344 130 L304 82 L262 62 Q200 112 138 62 Z",
  jacket: "M144 60 L96 80 L56 130 L40 330 L86 336 L112 200 L112 350 L288 350 L288 200 L314 336 L360 330 L344 130 L304 80 L256 60 L200 84 Z",
  bottoms: "M128 40 L272 40 L286 362 L212 362 L200 160 L188 362 L114 362 Z",
  custom: "M138 62 L92 84 L36 142 L78 184 L112 160 L112 346 L288 346 L288 160 L322 184 L364 142 L308 84 L262 62 Q200 108 138 62 Z",
};

/** Where a chest-level decoration sits on each flat outline. A 3D viewer would expose the same zones as placement areas. */
export const PLACEMENT_ZONE: Record<GarmentKind, { x: number; y: number; w: number; h: number; label: string }> = {
  tshirt: { x: 156, y: 140, w: 88, h: 88, label: "Front chest" },
  sportswear: { x: 156, y: 140, w: 88, h: 88, label: "Front chest" },
  polo: { x: 224, y: 148, w: 48, h: 48, label: "Left chest" },
  sweatshirt: { x: 156, y: 140, w: 88, h: 88, label: "Front chest" },
  hoodie: { x: 156, y: 130, w: 88, h: 64, label: "Front chest" },
  jacket: { x: 222, y: 140, w: 44, h: 44, label: "Left chest" },
  bottoms: { x: 130, y: 96, w: 52, h: 52, label: "Left thigh" },
  custom: { x: 156, y: 140, w: 88, h: 88, label: "Placement" },
};

/** Thin construction lines that make each outline read as its garment (hood, placket, zip, raglan, pockets). */
export function SeamDetails({ kind }: { kind: GarmentKind }) {
  const line = { stroke: "currentColor", strokeWidth: 1, opacity: 0.35, fill: "none" } as const;
  switch (kind) {
    case "hoodie":
      return (
        <g {...line}>
          <path d="M138 62 Q142 6 200 6 Q258 6 262 62" />
          <path d="M170 74 Q200 120 230 74" />
          <path d="M150 262 H250 L238 312 H162 Z" />
          <path d="M112 328 H288" /><path d="M64 318 L84 322" />
        </g>
      );
    case "sweatshirt":
      return <g {...line}><path d="M112 332 H288" /><path d="M46 306 L84 312" /><path d="M356 306 L316 312" /><path d="M170 66 Q200 104 230 66" /></g>;
    case "polo":
      return <g {...line}><path d="M138 62 L172 50 L200 100 L228 50 L262 62" /><path d="M200 100 V190" /><circle cx="200" cy="124" r="2.5" /><circle cx="200" cy="152" r="2.5" /></g>;
    case "jacket":
      return <g {...line}><path d="M200 84 V350" /><path d="M144 60 L180 92 M256 60 L220 92" /><path d="M132 270 H172 M228 270 H268" /></g>;
    case "sportswear":
      return <g {...line}><path d="M138 62 L170 150 M262 62 L230 150" /><path d="M112 200 V346 M288 200 V346" strokeDasharray="3 4" /></g>;
    case "bottoms":
      return <g {...line}><path d="M128 64 H272" /><path d="M200 64 V160" /><path d="M150 120 L164 156" /></g>;
    case "custom":
      return <g {...line}><path d="M138 62 Q200 108 262 62" strokeDasharray="4 5" /></g>;
    default:
      return <g {...line}><path d="M138 62 Q200 108 262 62" /><path d="M112 336 H288" /></g>;
  }
}
