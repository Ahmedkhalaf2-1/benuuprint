import { BufferGeometry, Euler, Float32BufferAttribute, Matrix4, type Mesh, Quaternion, Raycaster, Vector3 } from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import type { PlacementSpec, ViewFace } from "@/features/garment-3d/placement-config";
import { MODEL_HEIGHT, type PreparedModel } from "./prepare-model";

const AXIS: Record<ViewFace, Vector3> = { front: new Vector3(0, 0, 1), back: new Vector3(0, 0, -1), left: new Vector3(1, 0, 0), right: new Vector3(-1, 0, 0) };

export interface Anchor { point: Vector3; dir: Vector3 }

/**
 * Finds where a placement lands on the garment: a ray from outside, along the placement's face axis, through the anchor.
 * The FIRST surface hit must be printable fabric: if a hood, zip or button is in front, the placement is rejected (null) instead
 * of printing onto the wrong part.
 */
export function findAnchor(model: PreparedModel, spec: PlacementSpec, du: number, dv: number): Anchor | null {
  const axis = AXIS[spec.face];
  const u = (spec.u + du) * MODEL_HEIGHT;
  const y = (spec.y + dv - 0.5) * MODEL_HEIGHT;
  const origin = spec.face === "front" || spec.face === "back" ? new Vector3(u, y, axis.z * 10) : new Vector3(axis.x * 10, y, u);
  const rc = new Raycaster(origin, axis.clone().negate(), 0, 20);
  const hit = rc.intersectObjects(model.meshes, false)[0];
  if (!hit || !hit.face || !model.printMeshes.includes(hit.object as Mesh)) return null;
  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  if (normal.dot(axis) < 0) normal.negate(); // double-sided cloth: use the outward side
  // Chest/back prints project straight on (like a screen); sleeves follow the sleeve's own angle.
  const dir = spec.face === "front" || spec.face === "back" ? axis.clone() : axis.clone().add(normal).normalize();
  return { point: hit.point.clone(), dir };
}

/** Keeps only triangles facing the projector, so a print never wraps onto side seams or an inner layer. */
function facing(g: BufferGeometry, dir: Vector3, min: number): BufferGeometry {
  const pos = g.getAttribute("position"), nor = g.getAttribute("normal"), uv = g.getAttribute("uv");
  const P: number[] = [], N: number[] = [], U: number[] = [];
  const n = new Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    n.set(0, 0, 0);
    for (let k = 0; k < 3; k++) n.add(new Vector3(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k)));
    if (Math.abs(n.normalize().dot(dir)) < min) continue;
    for (let k = 0; k < 3; k++) {
      P.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
      N.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k));
      U.push(uv.getX(i + k), uv.getY(i + k));
    }
  }
  g.dispose();
  const out = new BufferGeometry();
  out.setAttribute("position", new Float32BufferAttribute(P, 3));
  out.setAttribute("normal", new Float32BufferAttribute(N, 3));
  out.setAttribute("uv", new Float32BufferAttribute(U, 2));
  return out;
}

/**
 * Projects a print (DecalGeometry) onto every printable mesh around the anchor, in world space. `aspect` is the artwork's
 * width/height; `size` its longest edge (fraction of garment height); `rotation` in degrees.
 */
export function buildDecal(model: PreparedModel, spec: PlacementSpec, anchor: Anchor, size: number, aspect: number, rotation: number): BufferGeometry[] {
  const s = size * MODEL_HEIGHT;
  const w = aspect >= 1 ? s : s * aspect;
  const h = aspect >= 1 ? s / aspect : s;
  const depth = spec.depth * MODEL_HEIGHT;
  const look = new Matrix4().lookAt(anchor.point.clone().add(anchor.dir), anchor.point, new Vector3(0, 1, 0));
  const q = new Quaternion().setFromRotationMatrix(look).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (-rotation * Math.PI) / 180));
  const orientation = new Euler().setFromQuaternion(q);
  const reach = Math.hypot(w, h, depth) / 2;
  const out: BufferGeometry[] = [];
  for (const mesh of model.printMeshes) {
    const g = mesh.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const c = g.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld);
    const r = g.boundingSphere!.radius * mesh.matrixWorld.getMaxScaleOnAxis();
    if (c.distanceTo(anchor.point) > r + reach) continue;
    // Chest/back prints are flat screens: drop anything turning away from them. Sleeves curve more, so allow more.
    const decal = facing(new DecalGeometry(mesh, anchor.point, orientation, new Vector3(w, h, depth)), anchor.dir, spec.face === "front" || spec.face === "back" ? 0.45 : 0.3);
    if (decal.getAttribute("position").count) out.push(decal); else decal.dispose();
  }
  return out;
}
