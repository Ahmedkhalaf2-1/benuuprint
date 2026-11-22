import { act, render, screen } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, statSync } from "node:fs";
import { GARMENT_MODELS } from "@/features/garment-3d/model-registry";
import { PLACEMENTS, PLACEMENT_SIDE, placementsFor } from "@/features/garment-3d/placement-config";
import { clampLayer, defaultLayer, readArtwork } from "@/features/garment-3d/print-design";
import { FABRIC_MATERIAL } from "@/features/public-site/garment/3d/fabric-materials";
import { BuilderGarmentPreview } from "@/features/public-site/garment";
import { InteractiveGarment } from "@/features/public-site/garment/interactive-garment";
import { decideRenderer, has3dModel } from "@/features/public-site/garment/renderer-policy";
import { FABRIC_VISUAL_KEYS, GARMENT_KINDS } from "@/features/public-site/garment/types";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("renderer policy", () => {
  const ok = { webgl: true };
  it("loads the real model on every WebGL device, phones included; no illustration mode exists", () => {
    expect(decideRenderer(ok)).toBe("3d");
    expect(decideRenderer({ ...ok, deviceMemory: 2, cores: 2, effectiveType: "3g" })).toBe("3d");
    expect(decideRenderer({ ...ok, webgl: false })).toBe("none");
  });
  it("asks first only when the visitor saves data or the device/network is very constrained", () => {
    expect(decideRenderer({ ...ok, saveData: true })).toBe("opt-in");
    expect(decideRenderer({ ...ok, effectiveType: "2g" })).toBe("opt-in");
    expect(decideRenderer({ ...ok, deviceMemory: 1 })).toBe("opt-in");
    expect(decideRenderer({ ...ok, saveData: true, optIn: true })).toBe("3d");
    expect(decideRenderer({ webgl: false, optIn: true })).toBe("none");
  });
  it("3D is offered exactly for the garments that have a real model", () => {
    expect(GARMENT_KINDS.filter(has3dModel)).toEqual(["tshirt", "hoodie", "polo", "jacket", "bottoms", "sportswear"]);
  });
});

describe("3D tokens", () => {
  it("every fabric look has material tokens", () => {
    expect(Object.keys(FABRIC_MATERIAL).sort()).toEqual([...FABRIC_VISUAL_KEYS].sort());
  });
});

describe("model registry", () => {
  it("every model is a site-relative file that exists in /public and stays within the web budget", () => {
    for (const m of Object.values(GARMENT_MODELS)) {
      expect(m!.src).toMatch(/^\/models\/garments\/[\w-]+\.glb$/);
      const file = path.join(process.cwd(), "public", m!.src);
      expect(existsSync(file), m!.src).toBe(true);
      expect(statSync(file).size).toBe(m!.bytes);
      expect(m!.bytes).toBeLessThan(5 * 1024 * 1024);
    }
  });
  it("has no model for garments nobody supplied one for (no stand-ins)", () => {
    expect(GARMENT_MODELS.sweatshirt).toBeUndefined();
    expect(GARMENT_MODELS.custom).toBeUndefined();
  });
});

describe("placement calibration", () => {
  it("every model has calibrated placements, inside the garment, with sane limits", () => {
    for (const kind of Object.keys(GARMENT_MODELS) as Array<keyof typeof GARMENT_MODELS>) {
      const list = placementsFor(kind);
      expect(list.length, kind).toBeGreaterThan(0);
      for (const p of list) {
        expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(1);
        expect(Math.abs(p.u)).toBeLessThan(0.3);
        expect(p.minSize).toBeLessThanOrEqual(p.size); expect(p.size).toBeLessThanOrEqual(p.maxSize);
        expect(PLACEMENT_SIDE[p.id]).toBeTruthy();
      }
    }
    expect(Object.keys(PLACEMENTS).sort()).toEqual(Object.keys(GARMENT_MODELS).sort());
  });
  it("does not offer placements that could not be calibrated", () => {
    expect(placementsFor("jacket").map((p) => p.id)).not.toContain("center-chest"); // split by the zip
    expect(placementsFor("bottoms").map((p) => p.face)).not.toContain("back");
    expect(placementsFor("sweatshirt")).toEqual([]);
  });
  it("keeps artwork inside the print area", () => {
    const spec = placementsFor("tshirt").find((p) => p.id === "center-chest")!;
    const l = clampLayer(spec, { ...defaultLayer(spec, { type: "look", key: "dtf" }), size: 9, du: 9, dv: -9, rotation: 400 });
    expect(l.size).toBe(spec.maxSize); expect(l.du).toBe(spec.range.u); expect(l.dv).toBe(-spec.range.y); expect(l.rotation).toBe(spec.maxRotation);
  });
  it("accepts only raster artwork within the size limit (never SVG)", async () => {
    expect(await readArtwork(new File(["<svg/>"], "a.svg", { type: "image/svg+xml" }))).toEqual({ ok: false, error: "type" });
    const big = new File(["x"], "a.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    expect(await readArtwork(big)).toEqual({ ok: false, error: "size" });
  });
});

describe("InteractiveGarment never shows a 2D garment", () => {
  const env = (webgl: boolean) => vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => (webgl ? {} : null)) as never);
  it("without WebGL: an explicit unavailable message, no canvas, no drawing", async () => {
    env(false);
    let c!: HTMLElement;
    await act(async () => { c = render(<InteractiveGarment productType="tshirt" colour="#17191a" fabric="twill" decoration="embroidery" />).container; });
    expect(c.querySelector("[data-garment-renderer]")).toHaveAttribute("data-garment-renderer", "no-webgl");
    expect(c.querySelector("canvas")).toBeNull();
    expect(c.querySelector("[data-garment-visual]")).toBeNull();
    expect(screen.getByText("3D preview isn't available on this device.")).toBeInTheDocument();
  });
  it("while the model loads: an empty stage with a status line, never the illustration", async () => {
    env(true);
    let c!: HTMLElement;
    await act(async () => { c = render(<InteractiveGarment productType="tshirt" />).container; });
    expect(c.querySelector("[data-garment-renderer]")).toHaveAttribute("data-garment-renderer", "loading");
    expect(c.querySelector("[data-garment-visual]")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Loading 3D");
  });
  it("garments without a model show an intentional 'no 3D model' state", async () => {
    env(true);
    let c!: HTMLElement;
    await act(async () => { c = render(<BuilderGarmentPreview productType="sweatshirt" colour="#12453a" fabric="fleece" decoration="puff" />).container; });
    expect(c.querySelector("[data-garment-renderer]")).toHaveAttribute("data-garment-renderer", "no-model");
    expect(c.querySelector("[data-garment-visual]")).toBeNull();
  });
  it("a deferred carousel card stays an empty stage and loads nothing", async () => {
    env(true);
    let c!: HTMLElement;
    await act(async () => { c = render(<InteractiveGarment productType="hoodie" deferred />).container; });
    expect(c.querySelector("[data-garment-renderer]")).toHaveAttribute("data-garment-renderer", "deferred");
    expect(c.querySelector("[data-garment-visual]")).toBeNull();
  });
});

describe("3D code isolation", () => {
  const dir = path.join(process.cwd(), "src/features/public-site");
  const files = readdirSync(dir, { recursive: true }).map(String).filter((n) => /\.tsx?$/.test(n));
  it("three.js / react-three are imported only inside garment/3d", () => {
    for (const f of files) {
      const src = readFileSync(path.join(dir, f), "utf8");
      if (f.startsWith("garment/3d")) continue;
      expect(src, f).not.toMatch(/from "three|@react-three/);
    }
  });
  it("the viewer is reached only through a dynamic import (its own chunk)", () => {
    for (const f of files) {
      if (f.startsWith("garment/3d")) continue;
      const src = readFileSync(path.join(dir, f), "utf8");
      expect(src, f).not.toMatch(/^import .* from ".*3d\/garment-viewer/m);
    }
    expect(readFileSync(path.join(dir, "garment/interactive-garment.tsx"), "utf8")).toMatch(/dynamic\(\(\) => import\("\.\/3d\/garment-viewer"\)/);
  });
});
