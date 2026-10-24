# Frontend Phase 8A.1 — Creative polish + 3D-ready garment architecture

Scope: visual polish of the existing homepage and isolation of the garment visual layer. No 3D, no new dependencies, no backend/auth/Admin/Portal changes, no new public pages.

## Creative polish
- **Hero:** same headline. Fallback environment is now a flat-pattern study (front panel with seam allowance, grain arrow, notches, sleeve piece, registration marks), textile light, a macro twill layer and the running stitch, at two parallax speeds. No photography.
- **Brand statement:** colour-field ground (`--pub-field`), a cropped outline word ("Scale"), value list revealed in sequence (CSS scroll-driven, staggered by `--i`).
- **What We Make:** category rows now drive a sticky garment preview on hover/focus.
- **How It Works:** redesigned stage (below). Section on a raised ground with corner brackets and a step rail.
- **Builder:** spec-sheet layout (controls | grid-staged preview | spec table), 4 products, 3 fabrics, 4 colours, 5 decorations, 4 quantities.
- **Fabrics:** a native horizontal scroll-snap strip of five tall macro swatches (jersey, rib, fleece, brushed, twill); decorative only, no GSM/composition.
- **Decoration:** five distinct specimens: screen print (solid + halftone), DTF (fine multicolour layer), embroidery (radial thread/stitch), puff (raised, shadowed), sublimation (continuous field).
- **Quality:** one line joins the four stages; checkpoints activate in order when the section is visible.
- **Portal showcase:** browser-framed mock with the portal's real left navigation, two samples (In sample production, Quotation ready), order progress with a pulsing active step. Labelled "Illustrative preview".
- **Transparency:** left = fragmented dashed items at offsets/tilts; right = one connected line with nodes.
- **Capabilities:** split screen, sticky intro + hover index. **Work:** reduced to a compact "coming soon" band (the grid renders only when `SELECTED_WORK` has items).
- **Transitions/microinteractions:** colour-field shifts, cropped type, a self-drawing stitch divider, section numbering (01–11), animated underline on nav links, button press state, category/selector transitions.

## Section rhythm
Hero → trust strip → 01 statement (green field, cropped type) → 02 categories (list + preview) → 03 process (raised, split sticky) → 04 builder (dense interface) → 05 fabrics (full-bleed horizontal) → 06 decoration (tight 5-up) → stitch divider → 07 quality (horizontal line) → 08 portal (green field, depth) → 09 transparency (two forms) → 10 capabilities (split index) → 11 work (compact band) → CTA → footer.

## Garment visual abstraction (`features/public-site/garment/`)
Sections import only from `garment/index.tsx` and pass presentation props; no section contains garment SVG (a test enforces this).

| Export | Used by | Future 3D swap point |
|---|---|---|
| `GarmentVisual` | base for the others | the viewer itself |
| `GarmentPreview` | What We Make | **B** product preview |
| `BuilderGarmentPreview` | Sample builder | **D** configurator |
| `ProcessGarmentVisual` (`stage`) | How It Works | **C** transformation (camera/material/scene state from `stage`) |
| `HeroGarmentVisual` | Hero fallback slot | **A** hero garment mode |

Props (`GarmentVisualProps`): `productType`, `colour`, `fabric`, `decoration`, `className`, `reducedMotion`. Local presentation vocabulary in `garment/types.ts`: `GarmentKind` (tshirt, hoodie, sweatshirt, polo, jacket, bottoms, sportswear, custom), `FabricVisualKey`, `DecorationVisualKey`, `ProcessStage`. These are not backend enums. The 2D fallback exposes the props as `data-garment-*` attributes, which is also how tests assert state → props.

## Current 2D fallback
`garment-2d.tsx` (outline + fabric pattern + shading + decoration mark), `silhouettes.tsx` (outlines, placement zones, seam details), `process-2d.tsx` (six stage layers: spec marks → fabric reveal + placement → quotation card → cut panels + stitches → approval + run of units → folded/boxed/shipped), `hero-2d.tsx`. Deliberately temporary: proportions and shading are "premium enough", not final assets. Process state changes are opacity/transform/clip-path transitions driven by one IntersectionObserver; no scroll-jacking.

## 3D readiness
- **Builder:** state is already `{ productType, colour, fabric, decoration }` → same props a viewer needs. Future: model swap, material by fabric key, colour, decals per `decoration`, front/back camera, placement zones (`PLACEMENT_ZONE`), lighting presets.
- **Process:** `stage` (0–5) is the whole interface.
- **Hero:** `<VideoHero fallback={…}>` is a slot; nothing assumes video. Video behavior unchanged: `/media/benue-hero.mp4` + `/media/benue-hero-poster.webp` resolved at build (no broken requests), muted/loop/inline/no controls, off for reduced motion, Save-Data, 2G/3G and narrow screens.
- A 3D implementation should be dynamically imported inside the swap, with the 2D visual as the poster/low-power/reduced-motion fallback. None of that is built now.

## Performance
CSS + inline SVG + three small client islands (header, process story, builder; what-we-make and quality line are tiny). No new dependencies, no canvas/WebGL, no images. Process and builder remain `next/dynamic` chunks. Scroll-driven CSS animations are inside `prefers-reduced-motion: no-preference` and `@supports`.

## Reduced motion
Keyframe animations and scroll-driven effects are off; layer transitions collapse via the global rule; `QualityLine` renders complete immediately; video disabled; all content readable without motion. `reducedMotion` on garment props forces `.pub-static`.

## Future 3D asset requirements (not created)
One GLB/GLTF per garment family (the 8 `GarmentKind`s); clean optimized topology; non-overlapping UVs; named material slots (body, rib/trim, lining, hood); neutral base colour so colour is applied at runtime; defined front/back print zones and embroidery placement zones matching `PLACEMENT_ZONE`; per-fabric texture sets (only once real fabric data exists); LOD/budget plan for mobile.

## Remaining real content/assets
Hero film + poster; photography; approved case studies; logo; contact details; Privacy/Terms; `NEXT_PUBLIC_SITE_URL`; confirmation of the approved decoration methods and fabric families shown; 3D models.
