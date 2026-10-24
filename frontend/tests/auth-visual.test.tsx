import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthVisual } from "@/components/layout/auth-visual";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const media = (o: { wide: boolean; reduce: boolean }) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") ? o.reduce : o.wide, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
const mount = async (props: { videoSrc: string | null; posterSrc: string | null }) => {
  let c!: HTMLElement;
  await act(async () => { c = render(<AuthVisual {...props} eyebrow="Customer account" headline={["a", "b"]} />).container; });
  return c;
};

describe("shared sign-in brand panel", () => {
  it("plays the muted looping video on wide, motion-allowed screens and stays decorative", async () => {
    media({ wide: true, reduce: false });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const c = await mount({ videoSrc: "/media/benue-hero.mp4", posterSrc: null });
    const v = c.querySelector("video")!;
    expect(v.muted).toBe(true);
    expect(v).toHaveAttribute("loop");
    expect(v).toHaveAttribute("playsinline");
    expect(v).not.toHaveAttribute("controls");
    expect(c.querySelector("aside")).toHaveAttribute("aria-hidden", "true");
    expect(c.querySelector("[data-testid=auth-visual]")).toHaveAttribute("data-mode", "video");
  });
  it("shows the technical fallback (no media) under reduced motion, on narrow screens, or with no asset", async () => {
    media({ wide: true, reduce: true });
    expect((await mount({ videoSrc: "/media/benue-hero.mp4", posterSrc: null })).querySelector("video")).toBeNull();
    media({ wide: false, reduce: false });
    expect((await mount({ videoSrc: "/media/benue-hero.mp4", posterSrc: null })).querySelector("video")).toBeNull();
    media({ wide: true, reduce: false });
    const c = await mount({ videoSrc: null, posterSrc: null });
    expect(c.querySelector("video")).toBeNull();
    expect(c.querySelector("[data-testid=auth-visual]")).toHaveAttribute("data-mode", "fallback");
    expect(c.querySelector("svg")).not.toBeNull();
  });
  it("drops a video that fails to load and keeps the panel intact", async () => {
    media({ wide: true, reduce: false });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const c = await mount({ videoSrc: "/media/missing.mp4", posterSrc: null });
    await act(async () => { c.querySelector("video")!.dispatchEvent(new Event("error")); });
    expect(c.querySelector("video")).toBeNull();
    expect(c.querySelector("[data-testid=auth-visual]")).not.toBeNull();
  });
});
