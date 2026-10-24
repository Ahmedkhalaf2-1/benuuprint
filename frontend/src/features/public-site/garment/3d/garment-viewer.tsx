"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Box3, BufferGeometry, Color, CylinderGeometry, DoubleSide, Euler, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Spherical, Vector3, type Group, type Object3D, type Texture } from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
/** The slice of OrbitControls the rig needs (drei types its ref with three-stdlib, which is not a direct dependency). */
interface ControlsLike { target: Vector3; update: () => void }
import { RenderBoundary } from "../render-boundary";
import { readableOn } from "../garment-2d";
import { PLACEMENT_ZONE } from "../silhouettes";
import type { DecorationVisualKey, FabricVisualKey, GarmentKind } from "../types";
import { decorationTexture, puffBump, sublimationTexture } from "./decal-textures";
import { FABRIC_MATERIAL, fabricBump } from "./fabric-materials";
import { chestPlacement } from "./placement";

export type ViewerView = "front" | "back";
export interface GarmentViewerProps {
  productType: GarmentKind;
  colour: string;
  fabric: FabricVisualKey;
  decoration: DecorationVisualKey | null;
  /** Optional real model. When absent (or it fails to load) the procedural stand-in tee is used. */
  modelSrc?: string | null;
  view: ViewerView;
  zoom: 0 | 1 | 2;
  resetKey: number;
  /** false pauses rendering (off-screen). */
  active: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onLost: () => void;
}

/* ------------------------------ material ------------------------------ */
function applyFabric(material: MeshPhysicalMaterial, fabric: FabricVisualKey) {
  const f = FABRIC_MATERIAL[fabric];
  const bump = fabricBump(fabric);
  bump.repeat.set(f.repeat, f.repeat);
  material.roughness = f.roughness;
  material.sheen = f.sheen;
  material.bumpMap = bump;
  material.bumpScale = f.bump * 1.2;
  material.needsUpdate = true;
}
function applyMap(material: MeshPhysicalMaterial, map: Texture | null) {
  material.map = map;
  material.needsUpdate = true;
}

function useGarmentMaterial(colour: string, fabric: FabricVisualKey, decoration: DecorationVisualKey | null) {
  const material = useMemo(() => new MeshPhysicalMaterial({ side: DoubleSide, sheenColor: new Color("#ffffff"), sheenRoughness: 0.6 }), []);
  const target = useRef(new Color(colour));
  useEffect(() => { target.current.set(colour); }, [colour]);
  useEffect(() => { applyFabric(material, fabric); }, [fabric, material]);
  useEffect(() => {
    const tex = decoration === "sublimation" ? sublimationTexture() : null;
    applyMap(material, tex);
    return () => tex?.dispose();
  }, [decoration, material]);
  useFrame((_, dt) => {
    if (decoration === "sublimation") material.color.set("#ffffff");
    else material.color.lerp(target.current, 1 - Math.exp(-dt * 10));
  });
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

/* ------------------------------- decal ------------------------------- */
/** Projects the decoration onto the garment surface (world-space geometry; the garment does not move). */
function Decoration({ target, decoration, colour, position, size, depth }: { target: Mesh | null; decoration: DecorationVisualKey | null; colour: string; position: Vector3; size: number; depth: number }) {
  const kind = decoration && decoration !== "sublimation" ? decoration : null;
  const decal = useMemo(() => {
    if (!target || !kind) return null;
    target.updateMatrixWorld(true);
    const geometry = new DecalGeometry(target, position, new Euler(0, 0, 0), new Vector3(size, size, depth));
    const map = decorationTexture(kind, readableOn(colour));
    const bump = kind === "puff" ? puffBump() : null;
    const material = new MeshStandardMaterial({ map, transparent: true, roughness: kind === "embroidery" ? 0.9 : kind === "puff" ? 0.7 : 0.55, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false, bumpMap: bump, bumpScale: kind === "puff" ? 6 : 0 });
    return { mesh: new Mesh(geometry, material), dispose: () => { geometry.dispose(); map.dispose(); bump?.dispose(); material.dispose(); } };
  }, [target, kind, colour, position, size, depth]);
  useEffect(() => () => decal?.dispose(), [decal]);
  return decal ? <primitive object={decal.mesh} /> : null;
}

/* ------------------------- stand-in procedural tee ------------------------- */
function buildTorso(): BufferGeometry {
  const g = new CylinderGeometry(0.95, 1.0, 2.3, 64, 40, true);
  const pos = g.attributes.position!;
  const A = 0.82;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 1.15) / 2.3;
    const u = t > A ? (t - A) / (1 - A) : 0;
    const k = 1 - 0.58 * u * u * (3 - 2 * u);
    const flare = 1 + 0.03 * (1 - t);
    pos.setXYZ(i, pos.getX(i) * k * flare, pos.getY(i) + 0.1 * u, pos.getZ(i) * 0.55 * k * flare);
  }
  g.computeVertexNormals();
  return g;
}

function ProceduralTee({ material, decoration, colour }: { material: MeshPhysicalMaterial; decoration: DecorationVisualKey | null; colour: string }) {
  const torso = useMemo(() => buildTorso(), []);
  const sleeve = useMemo(() => new CylinderGeometry(0.3, 0.37, 0.95, 40, 8, true), []);
  const [mesh, setMesh] = useState<Mesh | null>(null);
  const p = chestPlacement("tshirt");
  const position = useMemo(() => new Vector3(p.x, p.y, 0.56), [p.x, p.y]);
  return (
    <group>
      <mesh ref={setMesh} geometry={torso} material={material} />
      <mesh geometry={sleeve} material={material} position={[1.27, 0.42, 0]} rotation={[0, 0, -2.27]} scale={[1, 1, 0.85]} />
      <mesh geometry={sleeve} material={material} position={[-1.27, 0.42, 0]} rotation={[0, 0, 2.27]} scale={[1, 1, 0.85]} />
      <mesh material={material} position={[0, 1.13, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.6, 1]}><torusGeometry args={[0.41, 0.05, 16, 48]} /></mesh>
      <Decoration target={mesh} decoration={decoration} colour={colour} position={position} size={p.size} depth={0.6} />
    </group>
  );
}

/* ------------------------------ real model ------------------------------ */
/**
 * Real GLB. Contract: any meshes; they all receive the garment material (so they should have UVs for the fabric bump). The model is
 * centred and scaled to the stand-in's height, and the decoration is projected onto its largest mesh at the shared chest zone.
 */
function GlbTee({ src, material, decoration, colour, kind }: { src: string; material: MeshPhysicalMaterial; decoration: DecorationVisualKey | null; colour: string; kind: GarmentKind }) {
  const gltf = useGLTF(src);
  const prepared = useMemo(() => {
    const root = gltf.scene.clone(true);
    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const scale = 2.6 / (size.y || 1);
    root.scale.multiplyScalar(scale);
    root.updateMatrixWorld(true);
    const nb = new Box3().setFromObject(root);
    const c = nb.getCenter(new Vector3());
    root.position.sub(c);
    root.updateMatrixWorld(true);
    let biggest: Mesh | null = null;
    let most = 0;
    root.traverse((o: Object3D) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.material = material;
      const n = m.geometry.attributes.position?.count ?? 0;
      if (n > most) { most = n; biggest = m; }
    });
    const fb = new Box3().setFromObject(root);
    return { root, biggest: biggest as Mesh | null, box: fb };
  }, [gltf.scene, material]);
  const zone = PLACEMENT_ZONE[kind];
  const h = prepared.box.max.y - prepared.box.min.y;
  const w = h * 0.62;
  const position = useMemo(() => new Vector3(prepared.box.min.x + (prepared.box.max.x - prepared.box.min.x) / 2 + (zone.x + zone.w / 2 - 200) * (w / 176), prepared.box.max.y - ((zone.y + zone.h / 2 - 62) / 284) * h, prepared.box.max.z), [prepared, zone, h, w]);
  return (
    <group>
      <primitive object={prepared.root} />
      <Decoration target={prepared.biggest} decoration={decoration} colour={colour} position={position} size={zone.w * (w / 176)} depth={h * 0.3} />
    </group>
  );
}

/* --------------------------------- rig --------------------------------- */
const DIST = [8.2, 6.6, 4.8] as const;
const POLAR = 1.45;

/** Camera moves for Front/Back, zoom and reset: eased along the orbit sphere so the camera never cuts through the garment. */
function Rig({ view, zoom, resetKey, reducedMotion, controls }: { view: ViewerView; zoom: 0 | 1 | 2; resetKey: number; reducedMotion: boolean; controls: React.RefObject<ControlsLike | null> }) {
  const { camera } = useThree();
  const moving = useRef(true);
  useEffect(() => { moving.current = true; }, [view, zoom, resetKey]);
  useFrame(() => {
    const c = controls.current;
    if (!moving.current || !c) return;
    const goalTheta = view === "front" ? 0 : Math.PI;
    const s = new Spherical().setFromVector3(camera.position.clone().sub(c.target));
    let dTheta = goalTheta - s.theta;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
    const k = reducedMotion ? 1 : 0.12;
    s.theta += dTheta * k;
    s.phi += (POLAR - s.phi) * k;
    s.radius += (DIST[zoom] - s.radius) * k;
    camera.position.copy(new Vector3().setFromSpherical(s).add(c.target));
    c.update();
    if (Math.abs(dTheta) < 0.005 && Math.abs(DIST[zoom] - s.radius) < 0.02) moving.current = false;
  });
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => { if (!done.current) { done.current = true; onReady(); } });
  return null;
}

/* --------------------------------- scene --------------------------------- */
function Scene(p: GarmentViewerProps) {
  const material = useGarmentMaterial(p.colour, p.fabric, p.decoration);
  const controls = useRef<ControlsLike | null>(null);
  const [interacted, setInteracted] = useState(false);
  const group = useRef<Group>(null);
  const stand = <ProceduralTee material={material} decoration={p.decoration} colour={p.colour} />;
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 4]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1, -3]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 1, 2]} scale={[3, 6, 1]} />
      </Environment>
      <group ref={group}>
        {p.modelSrc ? (
          <RenderBoundary fallback={stand}><Suspense fallback={null}><GlbTee src={p.modelSrc} material={material} decoration={p.decoration} colour={p.colour} kind={p.productType} /></Suspense></RenderBoundary>
        ) : stand}
      </group>
      <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={9} blur={2.6} far={3.2} frames={1} />
      <OrbitControls ref={controls as never} makeDefault target={[0, 0.1, 0]} enablePan={false} enableZoom={false} enableDamping={!p.reducedMotion} dampingFactor={0.08} minPolarAngle={Math.PI / 3} maxPolarAngle={(2 * Math.PI) / 3} autoRotate={!p.reducedMotion && !interacted && p.view === "front"} autoRotateSpeed={1.1} onStart={() => setInteracted(true)} />
      <Rig view={p.view} zoom={p.zoom} resetKey={p.resetKey} reducedMotion={p.reducedMotion} controls={controls} />
      <Ready onReady={p.onReady} />
    </>
  );
}

export default function GarmentViewer(p: GarmentViewerProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={p.active ? "always" : "never"}
      camera={{ position: [0, 0.2, DIST[p.zoom]], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); p.onLost(); })}
      aria-hidden
    >
      <Scene {...p} />
    </Canvas>
  );
}
