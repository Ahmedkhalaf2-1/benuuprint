import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams() }));

import { GarmentCarousel } from "@/features/public-site/garment-carousel";
import { LoopVideo } from "@/features/public-site/loop-video";
import { ProcessStep } from "@/features/public-site/process-step";
import { MobileProcess } from "@/features/public-site/process-story";
import { PublicHeader } from "@/features/public-site/public-header";
import { QualityLine } from "@/features/public-site/quality-line";
import { RevealObserver } from "@/features/public-site/reveal-observer";
import { SnapRow } from "@/features/public-site/snap-row";
import { StickyMobileCta, stickyCtaVisible } from "@/features/public-site/sticky-cta";
import { shouldPlayHeroVideo, shouldPlayMobileHeroVideo } from "@/features/public-site/video-policy";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.documentElement.style.overflow = ""; pathname = "/"; });

const scrollTo = () => { Element.prototype.scrollTo = vi.fn() as never; };

describe("mobile navigation", () => {
  it("keeps the phone bar to brand + menu (no CTA competing with the hero) and opens an inert-while-closed menu panel that locks scroll and closes on Escape", async () => {
    render(<PublicHeader />);
    const panel = document.getElementById("pub-mobile-nav")!;
    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(panel).toHaveAttribute("inert");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
    const phoneBar = screen.getByRole("button", { name: "Open menu" }).parentElement!;
    expect(phoneBar.querySelectorAll("a")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menuCta = within(screen.getByRole("navigation", { name: "Mobile" })).getByRole("link", { name: /start a sample/i });
    expect(menuCta).toHaveAttribute("href", "/account/samples/new");
    expect(panel).toHaveAttribute("aria-hidden", "false");
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(within(screen.getByRole("navigation", { name: "Mobile" })).getAllByRole("link").length).toBeGreaterThanOrEqual(7);
    await userEvent.keyboard("{Escape}");
    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(document.documentElement.style.overflow).toBe("");
  });
});

describe("sticky mobile CTA", () => {
  it("appears after the hero, hides near closing CTAs and on form/legal/tracking pages", () => {
    expect(stickyCtaVisible({ pastHero: false, endInView: false, pathname: "/" })).toBe(false);
    expect(stickyCtaVisible({ pastHero: true, endInView: false, pathname: "/" })).toBe(false); // the homepage has its own deliberate CTA sequence
    expect(stickyCtaVisible({ pastHero: true, endInView: true, pathname: "/products" })).toBe(false);
    for (const p of ["/contact", "/privacy", "/terms", "/track", "/track/abc"]) expect(stickyCtaVisible({ pastHero: true, endInView: false, pathname: p })).toBe(false);
    expect(stickyCtaVisible({ pastHero: true, endInView: false, pathname: "/products" })).toBe(true);
  });
  it("is hidden from assistive tech and focus while not visible, and links to the sample flow", () => {
    render(<StickyMobileCta />);
    const bar = screen.getByTestId("sticky-cta");
    expect(bar).toHaveAttribute("data-visible", "false");
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar.querySelector("a")).toHaveAttribute("href", "/account/samples/new");
  });
});

describe("garment carousel (touch-first What We Make / Products)", () => {
  const items = [{ name: "T-Shirts", kind: "tshirt" as const, lines: ["a"] }, { name: "Hoodies", kind: "hoodie" as const, lines: ["b"] }, { name: "Polos", kind: "polo" as const, lines: ["c"] }];
  it("tapping a chip selects that garment and scrolls its card into view; every card ends in a quiet text action, not a green button", async () => {
    scrollTo();
    render(<GarmentCarousel items={items} label="Garments" />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    await userEvent.click(tabs[2]!);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
    const links = screen.getAllByRole("link", { name: /start with/i });
    expect(links).toHaveLength(3);
    for (const l of links) expect(l).toHaveAttribute("href", "/account/samples/new");
    expect(screen.queryByRole("link", { name: "Start a Sample" })).toBeNull();
  });
  it("does not animate the scroll under reduced motion", async () => {
    scrollTo();
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<GarmentCarousel items={items} label="Garments" />);
    await userEvent.click(screen.getAllByRole("tab")[1]!);
    expect((Element.prototype.scrollTo as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toMatchObject({ behavior: "auto" });
  });
});

describe("snap row", () => {
  it("renders a focusable labelled scroller with one tappable dot per item", async () => {
    scrollTo();
    render(<SnapRow label="Fabrics"><li>a</li><li>b</li><li>c</li></SnapRow>);
    expect(screen.getByLabelText("Fabrics")).toHaveAttribute("tabindex", "0");
    const dots = screen.getAllByRole("button", { name: /show item/i });
    expect(dots).toHaveLength(3);
    await userEvent.click(dots[1]!);
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });
});

describe("mobile process", () => {
  it("Next / Back and the progress segments move the step, and the shared visual follows", async () => {
    scrollTo();
    const { container } = render(<MobileProcess />);
    const stage = () => container.querySelector("[data-process-stage]")!.getAttribute("data-process-stage");
    expect(stage()).toBe("0");
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(stage()).toBe("1");
    await userEvent.click(screen.getByRole("button", { name: /Step 4:/ }));
    expect(stage()).toBe("3");
    expect(screen.getByRole("button", { name: /Step 4:/ })).toHaveAttribute("aria-current", "step");
    for (let i = 0; i < 4; i++) await userEvent.click(screen.getByRole("button", { name: /Next step|That's the journey/ }));
    expect(stage()).toBe("5");
    expect(screen.getByRole("button", { name: "That's the journey" })).toBeDisabled();
    expect(container.querySelector("video")).toBeNull();
  });
});

describe("mobile process video", () => {
  const io = () => vi.stubGlobal("IntersectionObserver", class { constructor(private cb: IntersectionObserverCallback) {} observe(t: Element) { this.cb([{ isIntersecting: true, target: t, intersectionRatio: 1 } as unknown as IntersectionObserverEntry], this as never); } unobserve() {} disconnect() {} });
  const media = (reduce: boolean) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") ? reduce : false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  it("replaces the garment drawing with the shared loop on a phone when playback is appropriate, keeping the drawing underneath", async () => {
    scrollTo(); io(); media(false);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    let container!: HTMLElement;
    await act(async () => { container = render(<MobileProcess videoSrc="/media/benue-process.mp4" />).container; });
    expect(container.querySelector("[data-process-media]")).toHaveAttribute("data-process-media", "video");
    expect(container.querySelector("video")).toHaveAttribute("src", "/media/benue-process.mp4");
    expect(container.querySelector("[data-process-stage]")).not.toBeNull();
  });
  it("keeps the drawing under reduced motion", async () => {
    scrollTo(); io(); media(true);
    let container!: HTMLElement;
    await act(async () => { container = render(<MobileProcess videoSrc="/media/benue-process.mp4" />).container; });
    expect(container.querySelector("[data-process-media]")).toHaveAttribute("data-process-media", "2d");
    expect(container.querySelector("video")).toBeNull();
  });
});

describe("process step (collapsed on phones)", () => {
  it("expands on tap and exposes aria-expanded", async () => {
    render(<ProcessStep n={3} title="Review quotation" body="Body text" you="Accept" see="A quote" />);
    const btn = screen.getByRole("button", { name: /Review quotation/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    const detail = document.getElementById("step-3-detail")!;
    expect(detail.className).toContain("hidden");
    await userEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(detail.className).toContain("block");
    expect(detail.className).toContain("lg:block");
  });
});

describe("quality line on phones", () => {
  it("lights each checkpoint only when its own stage scrolls into view", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    let cb!: IntersectionObserverCallback;
    vi.stubGlobal("IntersectionObserver", class { constructor(c: IntersectionObserverCallback) { cb = c; } observe() {} unobserve() {} disconnect() {} });
    let container!: HTMLElement;
    await act(async () => { container = render(<QualityLine />).container; });
    const items = Array.from(container.querySelectorAll("li"));
    expect(items).toHaveLength(4);
    await act(async () => { cb([{ isIntersecting: true, target: items[1] } as unknown as IntersectionObserverEntry], {} as IntersectionObserver); });
    const ol = container.querySelector("ol")!;
    expect(ol).toHaveAttribute("data-mode", "per-item");
    const dots = items.map((li) => li.querySelector("span")!.className);
    expect(dots[0]).toContain("bg-pub-brand");
    expect(dots[1]).toContain("bg-pub-brand");
    expect(dots[2]).not.toContain("border-pub-brand");
  });
});

describe("video policy (phones and desktop)", () => {
  const base = { reducedMotion: false, wide: false };
  it("phones may play the one hero video unless motion is reduced, Save-Data is on, the network is slow or the device is weak", () => {
    expect(shouldPlayMobileHeroVideo(base)).toBe(true);
    expect(shouldPlayMobileHeroVideo({ ...base, effectiveType: "4g" })).toBe(true);
    expect(shouldPlayMobileHeroVideo({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldPlayMobileHeroVideo({ ...base, saveData: true })).toBe(false);
    expect(shouldPlayMobileHeroVideo({ ...base, effectiveType: "3g" })).toBe(false);
    expect(shouldPlayMobileHeroVideo({ ...base, deviceMemory: 2 })).toBe(false);
    expect(shouldPlayMobileHeroVideo({ ...base, cores: 2 })).toBe(false);
  });
  it("desktop policy is unchanged", () => {
    expect(shouldPlayHeroVideo({ reducedMotion: false, wide: true })).toBe(true);
    expect(shouldPlayHeroVideo({ reducedMotion: false, wide: false })).toBe(false);
    expect(shouldPlayHeroVideo({ reducedMotion: false, wide: true, saveData: true })).toBe(false);
  });
});

describe("decorative video element", () => {
  it("is explicitly muted (property and attribute), inline, looping and tries to play", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { container } = render(<LoopVideo src="/media/x.mp4" />);
    const v = container.querySelector("video")!;
    expect(v.muted).toBe(true);
    expect(v).toHaveAttribute("muted");
    expect(v).toHaveAttribute("playsinline");
    expect(v).toHaveAttribute("loop");
    expect(play).toHaveBeenCalled();
  });
});

describe("reveal fallback", () => {
  const withEl = () => { const el = document.createElement("div"); el.className = "pub-reveal"; document.body.appendChild(el); return el; };
  it("does nothing where CSS scroll-driven animations exist", () => {
    vi.stubGlobal("CSS", { supports: () => true });
    const el = withEl();
    render(<RevealObserver />);
    expect(el.dataset.io).toBeUndefined();
    el.remove();
  });
  it("marks elements for an IntersectionObserver reveal where they do not, but not under reduced motion", () => {
    vi.stubGlobal("CSS", { supports: () => false });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    const el = withEl();
    const { unmount } = render(<RevealObserver />);
    expect(el.dataset.io).toBe("pending");
    unmount();
    el.remove();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const el2 = withEl();
    render(<RevealObserver />);
    expect(el2.dataset.io).toBeUndefined();
    el2.remove();
  });
});
