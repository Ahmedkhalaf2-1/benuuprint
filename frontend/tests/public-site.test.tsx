import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname = "/account/samples/new";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/portal/auth/customer-auth-provider", () => ({ useCustomerAuth: () => ({ status: "unauthenticated", customer: null, login: vi.fn(), logout: vi.fn() }) }));

import { BuilderPreview } from "@/features/public-site/builder-preview";
import { CUSTOMER_LOGIN_HREF, NAV_LINKS, PORTAL_ORDER_STEPS, PORTAL_SAMPLES, START_SAMPLE_HREF, WHAT_WE_MAKE } from "@/features/public-site/content";
import { PUBLIC_ROUTES } from "@/features/public-site/routes";
import { PublicFooter } from "@/features/public-site/public-footer";
import { PublicHeader } from "@/features/public-site/public-header";
import { Hero } from "@/features/public-site/hero";
import { BuilderGarmentPreview, GarmentPreview, ProcessGarmentVisual } from "@/features/public-site/garment";
import { LoopVideo } from "@/features/public-site/loop-video";
import { ProcessStory } from "@/features/public-site/process-story";
import { QualityLine } from "@/features/public-site/quality-line";
import { WhatWeMake } from "@/features/public-site/what-we-make";
import { FinalCta, PortalShowcase } from "@/features/public-site/sections-static";
import { shouldPlayHeroVideo } from "@/features/public-site/video-policy";
import { VideoHero } from "@/features/public-site/video-hero";
import { safePortalNext } from "@/features/portal/auth/forms";
import { PortalGuard } from "@/features/portal/shell";
import { CUSTOMER_STATUSES } from "@/features/portal/types";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); replace.mockClear(); });

const hrefs = (el: HTMLElement) => Array.from(el.querySelectorAll("a")).map((a) => a.getAttribute("href"));

describe("public homepage CTAs and navigation", () => {
  it("every Start a Sample CTA enters the real sample flow and every login CTA the customer login", () => {
    const { container } = render(<><PublicHeader /><Hero /><FinalCta /><PublicFooter /></>);
    for (const a of Array.from(container.querySelectorAll("a"))) {
      const text = a.textContent ?? "";
      if (/start (a|your) sample|request a sample/i.test(text)) expect(a).toHaveAttribute("href", START_SAMPLE_HREF);
      if (/customer login|^login$/i.test(text.trim())) expect(a).toHaveAttribute("href", CUSTOMER_LOGIN_HREF);
    }
    expect(START_SAMPLE_HREF).toBe("/account/samples/new");
    expect(CUSTOMER_LOGIN_HREF).toBe("/account/login");
  });

  it("never links to staff routes", () => {
    const { container } = render(<><PublicHeader /><Hero /><FinalCta /><PortalShowcase /><PublicFooter /></>);
    const publicPaths = PUBLIC_ROUTES.map((r) => r.path) as string[];
    for (const h of hrefs(container)) expect(publicPaths.includes(h ?? "") || h?.startsWith("#") || h?.startsWith("/account")).toBe(true);
  });

  it("header exposes the main anchors and a keyboard-operable mobile menu", async () => {
    render(<PublicHeader />);
    const main = screen.getByRole("navigation", { name: "Main" });
    expect(within(main).getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(NAV_LINKS.map((l) => l.href));
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
  });
});

describe("auth next/redirect", () => {
  it("the portal guard sends a visitor to the customer login with the sample flow as next", () => {
    pathname = START_SAMPLE_HREF;
    render(<PortalGuard><p>secret</p></PortalGuard>);
    expect(replace).toHaveBeenCalledWith(`/account/login?next=${encodeURIComponent(START_SAMPLE_HREF)}`);
    expect(screen.queryByText("secret")).toBeNull();
  });
  it("login honours the sample flow as a post-login target but not external or staff paths", () => {
    expect(safePortalNext(START_SAMPLE_HREF)).toBe(START_SAMPLE_HREF);
    expect(safePortalNext("//evil.test")).toBe("/account");
    expect(safePortalNext("/dashboard")).toBe("/account");
  });
});

describe("builder preview is a demo only", () => {
  it("updates the summary locally and makes no network or storage writes", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    render(<BuilderPreview />);
    await userEvent.click(screen.getByRole("radio", { name: "T-Shirt" }));
    await userEvent.click(screen.getByRole("radio", { name: "Screen Print" }));
    await userEvent.click(screen.getByRole("radio", { name: "500" }));
    const summary = screen.getByTestId("builder-summary");
    for (const v of ["T-Shirt", "Heavyweight Cotton", "Black", "Screen Print", "500"]) expect(summary).toHaveTextContent(v);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    for (const l of screen.getAllByRole("link", { name: /build yours/i })) expect(l).toHaveAttribute("href", START_SAMPLE_HREF);
  });
});

describe("portal showcase only shows real portal vocabulary", () => {
  it("uses statuses the customer portal actually has", () => {
    for (const smp of PORTAL_SAMPLES) expect(CUSTOMER_STATUSES).toContain(smp.status);
    const orderStatuses = ["READY_FOR_PRODUCTION", "IN_PRODUCTION", "PACKAGING", "READY_TO_SHIP", "PARTIALLY_SHIPPED", "SHIPPED", "DELIVERED", "COMPLETED"];
    for (const s of PORTAL_ORDER_STEPS) expect(orderStatuses).toContain(s.status);
  });
});

describe("hero video policy", () => {
  const ok = { reducedMotion: false, wide: true };
  it("plays only when motion is welcome, the screen is wide and the connection is not constrained", () => {
    expect(shouldPlayHeroVideo(ok)).toBe(true);
    expect(shouldPlayHeroVideo({ ...ok, reducedMotion: true })).toBe(false);
    expect(shouldPlayHeroVideo({ ...ok, wide: false })).toBe(false);
    expect(shouldPlayHeroVideo({ ...ok, saveData: true })).toBe(false);
    expect(shouldPlayHeroVideo({ ...ok, effectiveType: "3g" })).toBe(false);
    expect(shouldPlayHeroVideo({ ...ok, effectiveType: "4g" })).toBe(true);
  });

  const media = (matches: (q: string) => boolean) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: matches(q), addEventListener: vi.fn(), removeEventListener: vi.fn() }));

  it("renders the fallback and no <video> when there is no asset", () => {
    media(() => false);
    const { container } = render(<VideoHero videoSrc={null} posterSrc={null} fallback={<p>fallback</p>} />);
    expect(screen.getByText("fallback")).toBeInTheDocument();
    expect(container.querySelector("video")).toBeNull();
  });
  it("keeps the still under reduced motion even when a video exists", () => {
    media((q) => q.includes("reduce") || q.includes("min-width"));
    const { container } = render(<VideoHero videoSrc="/media/benue-hero.mp4" posterSrc={null} fallback={<p>fallback</p>} />);
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByTestId("hero-media")).toHaveAttribute("data-mode", "fallback");
  });
  it("renders a muted, inline, looping, control-less video on wide unconstrained screens", async () => {
    media((q) => q.includes("min-width"));
    let container!: HTMLElement;
    await act(async () => { container = render(<VideoHero videoSrc="/media/benue-hero.mp4" posterSrc={null} fallback={<p>fallback</p>} />).container; });
    await vi.waitFor(() => expect(container.querySelector("video")).not.toBeNull(), { timeout: 3000 });
    const v = container.querySelector("video")!;
    expect(v.muted).toBe(true);
    expect(v).toHaveAttribute("playsinline");
    expect(v).toHaveAttribute("loop");
    expect(v).not.toHaveAttribute("controls");
  });
});

describe("garment visual boundary", () => {
  it("exposes the presentation props as data attributes on the 2D fallback", () => {
    const { container } = render(<GarmentPreview productType="polo" colour="#12453a" fabric="rib" decoration="puff" caption="Polo Shirts" />);
    const el = container.querySelector("[data-garment-visual]")!;
    expect(el).toHaveAttribute("data-garment-kind", "polo");
    expect(el).toHaveAttribute("data-garment-colour", "#12453a");
    expect(el).toHaveAttribute("data-garment-fabric", "rib");
    expect(el).toHaveAttribute("data-garment-decoration", "puff");
  });

  it("builder state is passed straight through to the garment preview", async () => {
    const { container } = render(<BuilderPreview />);
    const props = () => { const el = container.querySelector("[data-garment-visual]")!; return ["kind", "colour", "fabric", "decoration"].map((k) => el.getAttribute(`data-garment-${k}`)); };
    expect(props()).toEqual(["tshirt", "#17191a", "twill", "embroidery"]);
    await userEvent.click(screen.getByRole("radio", { name: "Polo" }));
    await userEvent.click(screen.getByRole("radio", { name: "Forest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Brushed Fleece" }));
    await userEvent.click(screen.getByRole("radio", { name: "Puff" }));
    expect(props()).toEqual(["polo", "#12453a", "brushed", "puff"]);
  });

  it("the builder staging wraps the same garment visual", () => {
    const { container } = render(<BuilderGarmentPreview productType="tshirt" decoration="dtf" />);
    expect(container.querySelector("[data-builder-preview] [data-garment-visual]")).not.toBeNull();
  });

  it("What We Make drives the preview from hover and focus using local presentation kinds", async () => {
    const { container } = render(<WhatWeMake />);
    const kind = () => container.querySelector("[data-testid=make-preview] [data-garment-visual]")!.getAttribute("data-garment-kind");
    expect(kind()).toBe(WHAT_WE_MAKE[0]!.kind);
    await userEvent.hover(container.querySelector("a[data-kind=hoodie]")!);
    expect(kind()).toBe("hoodie");
    await act(async () => { (container.querySelector("a[data-kind=bottoms]") as HTMLElement).focus(); });
    expect(kind()).toBe("bottoms");
  });

  it("sections never embed raw garment SVG: only the garment folder draws garments", () => {
    const dir = path.join(process.cwd(), "src/features/public-site");
    for (const f of ["process-story.tsx", "builder-preview.tsx", "what-we-make.tsx", "hero.tsx"]) expect(readFileSync(path.join(dir, f), "utf8"), f).not.toMatch(/<svg|<path/);
  });
});

describe("decorative loop video", () => {
  it("stays invisible until frames play, then shows; and removes itself on error", async () => {
    const { container, rerender } = render(<LoopVideo src="/media/x.mp4" />);
    const v = container.querySelector("video")!;
    expect(v).toHaveAttribute("aria-hidden", "true");
    expect(v).not.toHaveAttribute("controls");
    expect(v.className).toContain("opacity-0");
    await act(async () => { v.dispatchEvent(new Event("playing")); });
    expect(container.querySelector("video")!.className).toContain("opacity-100");
    rerender(<LoopVideo src="/media/x.mp4" />);
    await act(async () => { container.querySelector("video")!.dispatchEvent(new Event("error")); });
    expect(container.querySelector("video")).toBeNull();
  });
});

describe("process media", () => {
  const media = (reduce: boolean) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") ? reduce : true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  it("uses the shared loop video when allowed, keeping the 2D visual underneath", async () => {
    media(false);
    let container!: HTMLElement;
    await act(async () => { container = render(<ProcessStory videoSrc="/media/benue-process.mp4" />).container; });
    expect(Array.from(container.querySelectorAll("[data-process-media]")).map((e) => e.getAttribute("data-process-media"))).toContain("video");
    expect(container.querySelector("video")).not.toBeNull();
    expect(container.querySelector("[data-process-stage]")).not.toBeNull();
  });
  it("falls back to the 2D visual under reduced motion or with no video", async () => {
    media(true);
    let container!: HTMLElement;
    await act(async () => { container = render(<ProcessStory videoSrc="/media/benue-process.mp4" />).container; });
    expect(Array.from(container.querySelectorAll("[data-process-media]")).every((e) => e.getAttribute("data-process-media") === "2d")).toBe(true);
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThanOrEqual(6);
  });
});

describe("process garment visual", () => {
  it("reflects the stage it is given and names it for assistive tech", () => {
    const { container, rerender } = render(<ProcessGarmentVisual stage={3} />);
    expect(container.querySelector("[data-process-stage]")).toHaveAttribute("data-process-stage", "3");
    expect(screen.getByRole("img")).toHaveAccessibleName("Stage 4 of 6: Sample production");
    rerender(<ProcessGarmentVisual stage={5} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Stage 6 of 6: Packed · shipped");
  });
});

describe("quality line", () => {
  it("shows the checkpoints complete immediately under reduced motion", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    let container!: HTMLElement;
    await act(async () => { container = render(<QualityLine />).container; });
    expect(container.querySelector("ol")).toHaveAttribute("data-active", "true");
  });
  it("waits for the section to be visible when motion is allowed", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("min-width"), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    let cb!: IntersectionObserverCallback;
    vi.stubGlobal("IntersectionObserver", class { constructor(c: IntersectionObserverCallback) { cb = c; } observe() {} disconnect() {} });
    let container!: HTMLElement;
    await act(async () => { container = render(<QualityLine />).container; });
    expect(container.querySelector("ol")).toHaveAttribute("data-active", "false");
    await act(async () => { cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); });
    expect(container.querySelector("ol")).toHaveAttribute("data-active", "true");
  });
});

describe("public site never touches internal endpoints", () => {
  it("has no network calls, API clients or staff/admin references in its source", () => {
    const dir = path.join(process.cwd(), "src/features/public-site");
    for (const f of readdirSync(dir, { recursive: true }).map(String).filter((n) => /\.tsx?$/.test(n))) {
      const src = readFileSync(path.join(dir, f), "utf8");
      expect(src, f).not.toMatch(/fetch\(|customerApi|@\/lib\/api|@\/lib\/customer|@\/lib\/auth|tanstack|\/api\//);
      if (!f.startsWith("garment/3d")) expect(src, f).not.toMatch(/from "three|@react-three|<canvas/);
    }
  });
});
