import { Box3, Color, type Material, type Mesh, MeshStandardMaterial, type Object3D, Vector3 } from "three";
import type { GarmentModelSpec } from "@/features/garment-3d/model-registry";

/** Every model is shown at this height (scene units), centred on its bounding box. Placement fractions are relative to it. */
export const MODEL_HEIGHT = 2.6;

export interface PreparedModel {
  root: Object3D;
  /** Every mesh (for occlusion tests) and the printable outer fabric meshes. */
  meshes: Mesh[];
  printMeshes: Mesh[];
  /** Per-instance clones of the recolourable fabric materials (originals in the loader cache are never mutated). */
  fabric: MeshStandardMaterial[];
  /** The recolourable materials' original colour factor (white for these models), to restore "original". */
  base: Color[];
  dispose: () => void;
}

/** Fabric should read as cloth, not plastic: no metalness without a metalness map, and a matte floor on roughness. */
function matte(m: MeshStandardMaterial, floor: number) {
  if (!m.metalnessMap && m.metalness > 0) m.metalness = 0;
  if (!m.roughnessMap) m.roughness = Math.max(m.roughness, floor);
}

/** Clones the cached glTF scene, normalizes scale/centre, prepares materials. Geometry and textures stay shared with the cache. */
export function prepareModel(scene: Object3D, spec: GarmentModelSpec): PreparedModel {
  const root = scene.clone(true);
  root.position.set(0, 0, 0);
  root.scale.setScalar(1);
  root.updateMatrixWorld(true);
  const size = new Box3().setFromObject(root).getSize(new Vector3());
  root.scale.setScalar(MODEL_HEIGHT / (size.y || 1));
  root.updateMatrixWorld(true);
  root.position.sub(new Box3().setFromObject(root).getCenter(new Vector3()));
  root.updateMatrixWorld(true);

  const recolor = spec.colour.mode === "recolor" ? new Set(spec.colour.materials) : new Set<string>();
  const print = new Set(spec.printSurface);
  const clones = new Map<Material, MeshStandardMaterial>();
  const owned: Material[] = [];
  const meshes: Mesh[] = [];
  const printMeshes: Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    meshes.push(mesh);
    const src = mesh.material as Material;
    if (print.has(src.name)) printMeshes.push(mesh);
    let m = clones.get(src);
    if (!m) {
      m = (src as MeshStandardMaterial).clone();
      // Fabric gets a matte floor; trims (buttons, sliders, stoppers) only lose spurious metalness.
      matte(m, recolor.has(src.name) || print.has(src.name) ? 0.82 : 0.4);
      clones.set(src, m);
      owned.push(m);
    }
    mesh.material = m;
  });
  const fabric = [...clones.entries()].filter(([src]) => recolor.has(src.name)).map(([, m]) => m);
  return { root, meshes, printMeshes, fabric, base: fabric.map((m) => m.color.clone()), dispose: () => owned.forEach((m) => m.dispose()) };
}

export const toColour = (hex: string | null, fallback: Color) => (hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? new Color(hex) : fallback.clone());
