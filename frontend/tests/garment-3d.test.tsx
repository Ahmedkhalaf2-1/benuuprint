import { act, render, screen } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chestPlacement } from "@/features/public-site/garment/3d/placement";
import { FABRIC_MATERIAL } from "@/features/public-site/garment/3d/fabric-materials";
import { BuilderGarmentPreview } from "@/features/public-site/garment";
import { InteractiveGarment } from "@/features/public-site/garment/interactive-garment";
import { decideRenderer, has3dModel } from "@/features/public-site/garment/renderer-policy";
import { FABRIC_VISUAL_KEYS, GARMENT_KINDS } from "@/features/public-site/garment/types";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("renderer policy", () => {
  const ok = { webgl: true, narrow: false };
  it("uses 3D only where WebGL exists and the device is capable and unconstrained", () => {
    expect(decideRenderer(ok)).toBe("3d");
    expect(decideRenderer({ ...ok, webgl: false })).toBe("2d");
    expect(decideRenderer({ ...ok, narrow: true })).toBe("2d");
    expect(decideRenderer({ ...ok, saveData: true })).toBe("2d");
    expect(decideRenderer({ ...ok, effectiveType: "3g" })).toBe("2d");
    expect(decideRenderer({ ...ok, deviceMemory: 2 })).toBe("2d");
    expect(decideRenderer({ ...ok, cores: 2 })).toBe("2d");
  });
  it("lets a visitor opt in on phones and constrained devices, but never without WebGL", () => {
    expect(decideRenderer({ ...ok, narrow: true, optIn: true })).toBe("3d");
    expect(decideRenderer({ ...ok, saveData: true, optIn: true })).toBe("3d");
    expect(decideRenderer({ webgl: false, narrow: false, optIn: true })).toBe("2d");
  });
  it("only the T-shirt has a 3D model today", () => {
    expect(GARMENT_KINDS.filter(has3dModel)).toEqual(["tshirt"]);
  });
});

describe("3D tokens", () => {
  it("every fabric look has material tokens, and decoration placement shares the 2D zone", () => {
    expect(Object.keys(FABRIC_MATERIAL).sort()).toEqual([...FABRIC_VISUAL_KEYS].sort());
    const p = chestPlacement("tshirt");
    expect(Math.abs(p.x)).toBeLessThan(0.05);
    expect(p.y).toBeGreaterThan(-1.15);
    expect(p.y).toBeLessThan(1.15);
    expect(p.size).toBeGreaterThan(0.3);
  });
});

describe("InteractiveGarment fallbacks", () => {
  const env = (o: { webgl: boolean; wide: boolean }) => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("min-width") ? o.wide : false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => (o.webgl ? {} : null)) as never);
  };
  it("stays 2D without WebGL (no canvas, no 3D controls, no opt-in)", async () => {
    env({ webgl: false, wide: true });
    let c!: HTMLElement;
    await act(async () => { c = render(<InteractiveGarment productType="tshirt" colour="#17191a" fabric="twill" decoration="embroidery" />).container; });
    expect(c.querySelector("[data-garment-renderer]")).toHaveAttribute("data-garment-renderer", "2d");
    expect(c.querySelector("canvas")).toBeNull();
    expect(c.querySelector("[data-garment-visual]")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /3d/i })).toBeNull();
  });
  it("offers an explicit 'View in 3D' on narrow screens instead of loading the viewer", async () => {
    env({ webgl: true, wide: false });
    let c!: HTMLElement;
    await act(async () => { c = render(<InteractiveGarment productType="tshirt" />).container; });
    expect(c.querySelector("[data-garment-renderer]")).toHaveAttribute("data-garment-renderer", "2d");
    expect(screen.getByRole("button", { name: "View in 3D" })).toBeInTheDocument();
  });
  it("never offers 3D for garments without a model, and keeps the 2D visual underneath", async () => {
    env({ webgl: true, wide: true });
    let c!: HTMLElement;
    await act(async () => { c = render(<BuilderGarmentPreview productType="hoodie" colour="#12453a" fabric="fleece" decoration="puff" />).container; });
    expect(c.querySelector("[data-garment-renderer]")).toHaveAttribute("data-garment-renderer", "2d");
    expect(screen.queryByRole("button", { name: /3d/i })).toBeNull();
    expect(c.querySelector("[data-garment-visual]")).toHaveAttribute("data-garment-kind", "hoodie");
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
