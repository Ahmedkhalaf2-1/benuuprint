"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { type BufferGeometry, Color, Mesh, MeshStandardMaterial, SRGBColorSpace, Spherical, type Texture, TextureLoader, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { modelFor, type GarmentModelSpec } from "@/features/garment-3d/model-registry";
import { placementSpec, type PlacementId, type PlacementStatus, type ViewFace } from "@/features/garment-3d/placement-config";
import type { PrintLayer, PrintSource } from "@/features/garment-3d/print-design";
import { readableOn } from "../garment-2d";
import type { FabricVisualKey, GarmentKind } from "../types";
import { decorationTexture, puffBump, sublimationTexture } from "./decal-textures";
import { FABRIC_MATERIAL } from "./fabric-materials";
import { buildDecal, findAnchor } from "./print-decal";
import { MODEL_HEIGHT, prepareModel, toColour, type PreparedModel } from "./prepare-model";

/** The slice of OrbitControls the rig needs (drei types its ref with three-stdlib, which is not a direct dependency). */
interface ControlsLike { target: Vector3; update: () => void; enableRotate: boolean; domElement?: HTMLElement | null }

type ViewerPrint = PrintLayer;

export interface GarmentViewerProps {
  productType: GarmentKind;
  /** false while the selected garment differs from `productType` (its model is still being chosen/loaded): nothing is drawn. */
  showModel: boolean;
  /** Bumped by Retry: a failed load is dropped from the loader cache and fetched again. */
  attempt: number;
  /** Garment colour (hex). null = the model's own material colour. Ignored for models whose colour is baked (denim, printed suit). */
  colour: string | null;
  fabric: FabricVisualKey | null;
  /** Prints to project onto the garment (artwork or a decoration look). */
  prints: ViewerPrint[];
  /** Sublimation-style all-over colour field (marketing builder). */
  allOver: boolean;
  view: ViewFace;
  zoom: 0 | 1 | 2;
  resetKey: number;
  /** false pauses rendering (off-screen). */
  active: boolean;
  reducedMotion: boolean;
  /** "rotate": drag/touch rotates (vertical page scroll still passes through). "buttons": no drag; the page/carousel keeps all gestures. */
  interaction: "rotate" | "buttons";
  autoRotate: boolean;
  onReady: (kind: GarmentKind) => void;
  onLost: () => void;
  onPlacementStatus?: (s: PlacementStatus) => void;
}

const configureLoader = (l: GLTFLoader) => { l.setMeshoptDecoder(MeshoptDecoder); };

/* ------------------------------- print decal ------------------------------- */
function useSourceTexture(source: PrintSource, ink: string): { map: Texture | null; aspect: number; bump: Texture | null } {
  const [art, setArt] = useState<{ url: string; tex: Texture } | null>(null);
  const url = source.type === "artwork" ? source.url : null;
  useEffect(() => {
    if (!url) return;
    let live = true;
    let loaded: Texture | null = null;
    new TextureLoader().load(url, (tex) => {
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      loaded = tex;
      if (live) setArt({ url, tex }); else tex.dispose();
    });
    return () => { live = false; loaded?.dispose(); };
  }, [url]);
  const look = source.type === "look" ? source.key : null;
  const lookTex = useMemo(() => (look ? { map: decorationTexture(look, ink), bump: look === "puff" ? puffBump() : null } : null), [look, ink]);
  useEffect(() => () => { lookTex?.map.dispose(); lookTex?.bump?.dispose(); }, [lookTex]);
  if (source.type === "artwork") return { map: art && art.url === url ? art.tex : null, aspect: source.aspect, bump: null };
  return { map: lookTex?.map ?? null, aspect: 1, bump: lookTex?.bump ?? null };
}

function PrintDecal({ model, kind, print, ink, onStatus }: { model: PreparedModel; kind: GarmentKind; print: ViewerPrint; ink: string; onStatus: (id: PlacementId, ok: boolean) => void }) {
  const spec = placementSpec(kind, print.placement);
  const { map, aspect, bump } = useSourceTexture(print.source, ink);
  const look = print.source.type === "look" ? print.source.key : null;
  const material = useMemo(() => new MeshStandardMaterial({ map, bumpMap: bump, bumpScale: bump ? 6 : 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: look === "embroidery" ? 0.9 : look === "puff" ? 0.7 : 0.75 }), [look, map, bump]);
  useEffect(() => () => material.dispose(), [material]);
  const anchor = useMemo(() => (spec ? findAnchor(model, spec, print.du, print.dv) : null), [model, spec, print.du, print.dv]);
  useEffect(() => { onStatus(print.placement, !!anchor); }, [anchor, onStatus, print.placement]);
  const geometries = useMemo<BufferGeometry[]>(() => (spec && anchor ? buildDecal(model, spec, anchor, print.size, aspect, print.rotation) : []), [model, spec, anchor, print.size, aspect, print.rotation]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  const meshes = useMemo(() => geometries.map((g) => { const m = new Mesh(g, material); m.renderOrder = 2; return m; }), [geometries, material]);
  if (!map) return null;
  return <>{meshes.map((m) => <primitive key={m.uuid} object={m} />)}</>;
}

/* ---------------------------------- model ---------------------------------- */
function GarmentModel({ spec, colour, fabric, allOver, prints, onReady, onPlacementStatus }: { spec: GarmentModelSpec; colour: string | null; fabric: FabricVisualKey | null; allOver: boolean; prints: ViewerPrint[]; onReady: (k: GarmentKind) => void; onPlacementStatus?: (s: PlacementStatus) => void }) {
  const gltf = useLoader(GLTFLoader, spec.src, configureLoader);
  const model = useMemo(() => prepareModel(gltf.scene, spec), [gltf.scene, spec]);
  useEffect(() => () => model.dispose(), [model]);

  // Colour: damped transition on the recolourable fabric materials only.
  const recolor = spec.colour.mode === "recolor";
  const target = useMemo(() => model.base.map((b) => (recolor && !allOver ? toColour(colour, b) : allOver ? new Color("#ffffff") : b.clone())), [model, colour, recolor, allOver]);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; model.fabric.forEach((m, i) => m.color.copy(target[i]!)); } }, [model, target]);
  useFrame((_, dt) => { const k = 1 - Math.exp(-dt * 10); model.fabric.forEach((m, i) => m.color.lerp(target[i]!, k)); });

  // Fabric look: roughness only (the models carry their own weave/normal detail).
  useEffect(() => {
    if (!fabric) return;
    const r = FABRIC_MATERIAL[fabric].roughness;
    model.fabric.forEach((m) => { if (!m.roughnessMap) m.roughness = Math.max(0.78, r); });
  }, [fabric, model]);

  // Sublimation preview: an all-over field through the model's own UVs.
  useEffect(() => {
    if (!allOver || !recolor) return;
    const tex = sublimationTexture();
    const prev = model.fabric.map((m) => m.map);
    model.fabric.forEach((m) => { m.map = tex; m.needsUpdate = true; });
    return () => { model.fabric.forEach((m, i) => { m.map = prev[i] ?? null; m.needsUpdate = true; }); tex.dispose(); };
  }, [allOver, recolor, model]);

  const ink = readableOn(recolor && colour ? colour : "#2b302e");
  const status = useRef<PlacementStatus>({});
  const report = useMemo(() => (id: PlacementId, ok: boolean) => {
    const next = ok ? "ok" : "blocked";
    if (status.current[id] === next) return;
    status.current = { ...status.current, [id]: next };
    onPlacementStatus?.(status.current);
  }, [onPlacementStatus]);

  const readied = useRef<object | null>(null);
  useFrame(() => { if (readied.current !== model) { readied.current = model; onReady(spec.kind); } });

  return (
    <group>
      <primitive object={model.root} />
      {prints.map((p) => <PrintDecal key={p.placement} model={model} kind={spec.kind} print={p} ink={ink} onStatus={report} />)}
    </group>
  );
}

/* ----------------------------------- rig ----------------------------------- */
const DIST = [8.2, 6.6, 4.8] as const;
const POLAR = 1.45;
const THETA: Record<ViewFace, number> = { front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };

/** Camera moves for views, zoom and reset: eased along the orbit sphere so the camera never cuts through the garment. */
function Rig({ view, zoom, resetKey, reducedMotion, controls }: { view: ViewFace; zoom: 0 | 1 | 2; resetKey: number; reducedMotion: boolean; controls: React.RefObject<ControlsLike | null> }) {
  const { camera } = useThree();
  const moving = useRef(true);
  useEffect(() => { moving.current = true; }, [view, zoom, resetKey]);
  useFrame(() => {
    const c = controls.current;
    if (!moving.current || !c) return;
    const s = new Spherical().setFromVector3(camera.position.clone().sub(c.target));
    const dTheta = Math.atan2(Math.sin(THETA[view] - s.theta), Math.cos(THETA[view] - s.theta));
    const k = reducedMotion ? 1 : 0.12;
    s.theta += dTheta * k;
    s.phi += (POLAR - s.phi) * k;
    s.radius += (DIST[zoom] - s.radius) * k;
    camera.position.copy(new Vector3().setFromSpherical(s).add(c.target));
    c.update();
    if (Math.abs(dTheta) < 0.004 && Math.abs(DIST[zoom] - s.radius) < 0.02 && Math.abs(POLAR - s.phi) < 0.004) moving.current = false;
  });
  return null;
}

function applyTouchPolicy(canvas: HTMLElement, controls: ControlsLike | null, interaction: "rotate" | "buttons") {
  canvas.style.touchAction = interaction === "rotate" ? "pan-y" : "pan-x pan-y";
  if (controls) controls.enableRotate = interaction === "rotate";
}

/** OrbitControls sets `touch-action: none` on the canvas; restore page scrolling: vertical pans always scroll the page. */
function TouchPolicy({ controls, interaction }: { controls: React.RefObject<ControlsLike | null>; interaction: "rotate" | "buttons" }) {
  const { gl } = useThree();
  useEffect(() => applyTouchPolicy(gl.domElement, controls.current, interaction));
  return null;
}

/* ---------------------------------- scene ---------------------------------- */
function Scene(p: GarmentViewerProps) {
  const spec = modelFor(p.productType);
  const controls = useRef<ControlsLike | null>(null);
  const [interacted, setInteracted] = useState(false);
  // Retry after a failed download/parse: the loader cache keeps the error, so drop it before the model is requested again.
  useMemo(() => { if (p.attempt > 0 && spec) useLoader.clear(GLTFLoader, spec.src); }, [p.attempt, spec]);
  if (!spec) return null;
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.7} />
      <Environment resolution={64} frames={1} environmentIntensity={0.75}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 4]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-5, 1, -3]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[5, 1, 2]} scale={[3, 6, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <group visible={p.showModel}>
        <GarmentModel key={spec.kind} spec={spec} colour={p.colour} fabric={p.fabric} allOver={p.allOver} prints={p.prints} onReady={p.onReady} onPlacementStatus={p.onPlacementStatus} />
        <ContactShadows key={`shadow-${spec.kind}`} position={[0, -MODEL_HEIGHT / 2 - 0.02, 0]} opacity={0.45} scale={8} blur={2.6} far={3.2} frames={1} />
        </group>
      </Suspense>
      <OrbitControls ref={controls as never} makeDefault target={[0, 0, 0]} enablePan={false} enableZoom={false} enableRotate={p.interaction === "rotate"} enableDamping={!p.reducedMotion} dampingFactor={0.08} minPolarAngle={POLAR - 0.35} maxPolarAngle={POLAR + 0.2} autoRotate={p.autoRotate && !p.reducedMotion && !interacted} autoRotateSpeed={1.1} onStart={() => setInteracted(true)} />
      <TouchPolicy controls={controls} interaction={p.interaction} />
      <Rig view={p.view} zoom={p.zoom} resetKey={p.resetKey} reducedMotion={p.reducedMotion} controls={controls} />
    </>
  );
}

export default function GarmentViewer(p: GarmentViewerProps) {
  // High-density phones: cap the pixel ratio (fill-rate is the bottleneck there, not geometry).
  const [maxDpr] = useState(() => (typeof window !== "undefined" && window.innerWidth < 768 ? 1.5 : 1.75));
  return (
    <Canvas
      dpr={[1, maxDpr]}
      frameloop={p.active ? "always" : "never"}
      camera={{ position: [0, 0.2, DIST[p.zoom]], fov: 32, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); p.onLost(); })}
      aria-hidden
    >
      <Scene {...p} />
    </Canvas>
  );
}
