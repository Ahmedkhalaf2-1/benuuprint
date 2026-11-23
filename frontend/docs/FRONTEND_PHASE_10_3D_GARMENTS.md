# Frontend Phase 10 — Real 3D garments, colour and print preview

Replaces the Phase 9 procedural stand-in tee with the supplied GLB garments, and adds colour + artwork preview to the public
builder and to the authenticated sample request. No backend, schema or API contract changes.

## Assets

Source files (left untouched): `~/Downloads/*.glb`. Optimized copies: `public/models/garments/`.

| Category | File | Source | Size (src → web) | Triangles (src → web) | Colour | Notes |
|---|---|---|---|---|---|---|
| T-Shirt | `tshirt.glb` | `t_shirt.glb` | 6.8 MB → 0.73 MB | 238k → 119k | recolour (`Body_FRONT_2664`) | Sketchfab root rotation reset to upright/front (+Z) |
| Hoodie | `hoodie.glb` | `hoodiebasemodel_reload.glb` | 234 MB → 3.9 MB | 1.19M → 172k | recolour terry + rib | drawcord tips/labels keep material |
| Polo | `polo.glb` | `short_sleeve_polo.glb` | 12 MB → 1.8 MB | 179k → 107k | recolour canvas | buttons + woven label keep material |
| Jacket | `jacket.glb` | `black_jacket_coat.glb` | 45 MB → 2.6 MB | 172k → 121k | recolour fleece | albedo normalized to neutral grey detail (was near-black, could not take colour); BLEND → OPAQUE (alpha only marked unused atlas space) |
| Bottoms | `bottoms-jeans.glb` | `jnco_twin_cannon_baggy_jeans.glb` | 70 MB → 2.9 MB | 195k → 117k | original only | washed denim is baked in the texture; the texture carries a third-party brand patch (JNCO) on the back pocket |
| Sportswear | `sportswear-suit.glb` | `sport_suit.glb` | 146 MB → 3.9 MB | 3.35M → 197k | original only | anorak + trousers with a baked lime/black graphic |

Not used: `coustme.glb` is a full human avatar (head, skin, cap, mask, shoes) wearing an outfit — excluded (no avatars).
Missing: **Sweatshirt** and **Custom pieces** have no model; they keep the 2D visual.

Pipeline (glTF-Transform 4 + meshoptimizer + sharp): dedup → prune → weld → meshopt simplify (only where far over budget) →
WebP textures (≤1024 px; jacket/jeans ≤2048; suit ≤512) → `EXT_meshopt_compression`. Unused UV sets (TEXCOORD_1/2) dropped.
three.js decodes meshopt with its bundled decoder (no CDN/Draco download).

## Architecture

```
src/features/garment-3d/          pure data + state (no three.js)
  model-registry.ts               kind → GLB url, recolourable materials, printable surface materials
  placement-config.ts             per-model calibrated print placements (+ labels, backend side mapping)
  print-design.ts                 local design state (artwork object URLs, size/offset/rotation, clamping), session store per sample
src/features/public-site/garment/
  interactive-garment.tsx         2D ⇄ 3D shell (policy, lazy chunk, debounced model switch, view/zoom/reset controls)
  print-controls.tsx              placement chips, upload/replace/remove, size/move/rotate sliders, restore
  3d/garment-viewer.tsx           Canvas, lights, rig, model, decals (dynamic import, own chunk)
  3d/prepare-model.ts             clone, normalize (height 2.6, centred), matte fabric, per-instance recolour materials
  3d/print-decal.ts               ray-cast anchor + DecalGeometry projection with facing filter
src/features/portal/garment-customizer.tsx   Fabric-step colour preview, Decoration-step design preview
```

### Loading (GLB is the only garment visual)
Viewers never render a 2D garment drawing. SSR and the first client render are an empty dark stage of fixed size with a small
"Loading 3D…" line; the canvas appears as soon as the model has rendered its first frame (no fade). States: `loading` → `ready`,
`error` (message + Try again; the failed load is evicted from the loader cache), `no-model` (garments without a GLB), `no-webgl`,
`opt-in` (Save-Data / 2G / ≤1 GB devices: "View in 3D"), `deferred` (off-centre carousel cards: empty stage, nothing loaded).
Switching garment hides the previous model immediately (never shown under the new name), reuses the same canvas, and loads the
next GLB (instant when cached). What We Make waits 150 ms on hover so a quick sweep doesn't download every model; clicks switch at once.
The 2D drawings remain only for static thumbnails (portal product picker, review card, catalogue grid) and the process/hero
illustrations — not in any garment viewer.

### Viewer
Drag/touch rotation (horizontal; vertical pans scroll the page — canvas `touch-action: pan-y`), no wheel zoom, +/− zoom, Front /
Back / Reset view, eased camera along the orbit sphere, auto-rotate until first interaction (off when prints exist or reduced motion),
procedural environment (no HDR download), one-frame contact shadow, `dpr ≤ 1.5` on phones / `1.75` otherwise, rendering paused
off-screen, WebGL context loss or load errors show the error state with Retry.

### Placement calibration
Anchors are fractions of garment height in the normalized space. Each was ray-cast against the real mesh and rendered with a test
decal from four sides. At runtime the first ray hit must be printable fabric, otherwise the placement reports `blocked` and nothing
is drawn. Unsupported: jacket centre chest (zip), any back/side placement on bottoms (only left/right leg front).

### Colour
Only `colour.materials` are tinted (trims keep theirs). Recolourable textures are near-white (or were normalized), so the tint
multiplies without flattening the weave/normal detail. Denim and the printed suit are shown in their original material.

## Persistence (sample request)
| Preview data | Saved? |
|---|---|
| Garment type | existing `productTypeId` (the preview reads it) |
| Colour | existing fabric colour / custom hex (the preview reads it) |
| Placement name + side | yes, when the customer clicks **Add as decoration** → existing decoration dialog (`placement`, `side`) |
| Artwork file | yes, only if kept ticked in that dialog → existing `POST /customer/samples/:id/files` (`ARTWORK`, `decorationId`) |
| Preview size / offset / rotation | **no** — no backend field; visual only. Width/height stay customer-entered. |

## Known limits
Physical-device FPS (iOS Safari, low-end Android) not measured; verified in desktop Chrome (Metal) and mobile emulation.
Preview sizes are not print dimensions. The jeans texture shows a third-party logo patch; replace the model/texture before launch if
that is not acceptable.

## Sample studio (customer sample request)
`/account/samples/[id]/edit` is laid out as a studio: configuration (the existing steps, unchanged ids/order/saves) on the left, one
shared live 3D viewer on the right (`src/features/portal/studio.tsx`). The frame widens to `max-w-7xl` on this route only.

- **One viewer, never re-created between steps.** Shown from Product onward; full stage on Product / Fabric / Decoration, compact on
  later steps (desktop sticky; phones show it above the form on the customization steps, pinned small on Decoration).
- **Source of truth.** Saved sample values, plus the current step's unsaved picks pushed as live overrides (`useLiveProduct`,
  `useLiveColour`); overrides are dropped as soon as the saved sample changes. Artwork/placement/size/position come from the
  existing per-sample design store, shared by the decoration controls and the viewer (picking a back placement turns the garment).
- **Product picker.** Compact radio list of the real catalogue product types with a "3D" tag where a model exists — no garment
  drawings, no extra canvases. Products without a model: "3D preview isn't available for this garment yet."; the request works as before.
- **Persistence.** Unchanged: placements become decorations only via the existing dialog; artwork uploads only through the existing
  files endpoint when ticked there. Preview size/offset/rotation are not saved (no backend field).
