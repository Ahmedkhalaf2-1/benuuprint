# Frontend Phase 9 — 3D T-shirt viewer (Sample Builder first)

Scope: first 3D step. T-shirt viewer integrated into the public **Sample Builder preview** only. Products / Process / Hero are the next integrations (same boundary). No backend, Admin or Portal changes.

## Dependencies (new)
`three`, `@react-three/fiber`, `@react-three/drei` (+ `@types/three` dev). They are imported only inside `features/public-site/garment/3d/` and loaded through `next/dynamic` (`ssr: false`) from `interactive-garment.tsx`: its own ~288 KB gzip chunk, absent from the homepage's initial HTML and fetched only when a 3D garment is about to be shown (builder within 400 px of the viewport). Tests enforce both rules.

## Architecture
```
BuilderGarmentPreview(props)            public API, unchanged props
 └─ InteractiveGarment                  decides 2D vs 3D, lazy-loads, owns controls
     ├─ Garment2D                       ALWAYS rendered: SSR, loading poster, fallback
     └─ GarmentViewer (3d/, dynamic)    Canvas, lights, rig, material, decoration, model
```
`garment/renderer-policy.ts` (pure, tested): 3D automatically only with WebGL on a wide, capable, unconstrained device. Phones, Save-Data, 2G/3G, ≤2 GB / ≤2 cores get 2D plus an explicit **View in 3D** opt-in. No WebGL → 2D always. Only garments with a model (`GARMENT_KINDS_WITH_3D = ["tshirt"]`) ever use 3D; the builder now defaults to T-Shirt so 3D is the first thing seen. Viewer load/render errors and WebGL context loss fall back to 2D (`RenderBoundary`). Rendering pauses when off-screen (`frameloop: "never"`).

## Viewer features
- **Rotate:** OrbitControls (no pan), polar limits, damping, gentle auto-rotate until first interaction. Wheel zoom is disabled so page scroll is never hijacked; zoom is via **+/−** (3 steps).
- **Front / Back / Reset:** eased along the orbit sphere (never cuts through the garment).
- **Colour:** damped colour transition from the builder's colour state.
- **Fabric:** `MeshPhysicalMaterial` tokens per `FabricVisualKey` (roughness, sheen, procedural bump map). Decorative stand-ins, not measured data (`3d/fabric-materials.ts`).
- **Decoration:** embroidery, screen print, DTF and puff are projected decals (`DecalGeometry`) at the **same placement zone as the 2D visual** (`3d/placement.ts` maps `PLACEMENT_ZONE`); puff adds a height map; sublimation is an all-over colour map on the garment.
- **Lighting:** procedural `Environment` (Lightformers, no HDR download) + two directional lights + one-frame contact shadow.
- **Reduced motion:** 3D still renders; auto-rotate, damping and camera easing are off (instant moves).
- **A11y:** the canvas is `aria-hidden`; the 2D visual's label and the builder's spec table carry the meaning; controls are real buttons (`aria-pressed`, labelled zoom).

## Model: stand-in now, GLB later
No GLB was supplied, so the viewer renders a **procedural stand-in tee** (torso, two sleeves, neck rib). It is deliberately crude. To use a real model drop `public/models/tshirt.glb` and rebuild (`resolveGarmentModel()` checks at build time; no 404s). Loader contract (`GlbTee`): any meshes — all receive the garment material (give them UVs for the fabric bump); the model is centred and scaled to the stand-in's height; decoration is projected onto the largest mesh at the shared chest zone. If the GLB fails to load, the stand-in is used. The loader path was verified with a generated test GLB (loaded, centred, material + decal applied), then removed.

### What the real T-shirt GLB should provide
Clean optimized topology (mobile-friendly triangle budget), non-overlapping UVs, a neutral base colour, separate or named parts (body / sleeves / collar rib) so fabric can differ per part later, a defined front chest zone (and back/sleeve zones when needed), Draco/meshopt compression if large, a poster render for the fallback, and a stated target size (a few hundred KB).

## Performance notes
Chunk is lazy and off-screen-paused; `dpr` capped at 1.75; shadows rendered once; environment rendered once; textures cached/disposed; no frame work when hidden. Measured only in software WebGL (headless), so real-device FPS still needs checking.

## Verified (headless Chrome, software WebGL)
Viewer loads on the builder; colour, fabric and decoration changes (embroidery, screen print, sublimation) update live; Front/Back works; phone width shows 2D with **View in 3D** and the opt-in loads 3D; reduced motion renders 3D without auto-rotation; GLB path works; no console errors; initial HTML does not reference the 3D chunk.

## Next integrations (same boundary)
1. **Products:** one shared lazily-mounted viewer driven by the selected family instead of eight canvases.
2. **Process:** map `ProcessGarmentVisual` stage → camera/material/scene state.
3. **Hero:** optional 3D garment mode in the `VideoHero` fallback slot.
Each needs the corresponding GLBs (hoodie, sweatshirt, polo, jacket, bottoms, …).

## Known limits
Stand-in geometry is crude; only the T-shirt is 3D; no per-part materials, back/sleeve placement zones or user artwork; fabric look is procedural; physical-device performance and Safari/iOS not yet checked.
