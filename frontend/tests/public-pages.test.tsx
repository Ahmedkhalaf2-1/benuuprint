import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ locale: "en" as "en" | "ar" }));
vi.mock("@/i18n/server", async () => {
  const { buildI18n } = await import("@/i18n/provider");
  return { getLocale: async () => state.locale, getI18n: async () => buildI18n(state.locale) };
});

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/about", useSearchParams: () => new URLSearchParams(), redirect: vi.fn() }));

import { ContactForm } from "@/features/public-site/contact-form";
import { CUSTOMER_LOGIN_HREF, NAV_LINKS, START_SAMPLE_HREF } from "@/features/public-site/content";
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from "@/features/public-site/content-pages";
import { LegalPage } from "@/features/public-site/pages/legal-page";
import { TrackResultPage } from "@/features/public-site/pages/track-pages";
import { PublicFooter } from "@/features/public-site/public-footer";
import { PublicHeader } from "@/features/public-site/public-header";
import { PRIVATE_PATHS, PUBLIC_ROUTES } from "@/features/public-site/routes";
import { buildRobots, buildSitemap, organizationJsonLd, pageMetadata } from "@/features/public-site/seo";
import { TrackEntry } from "@/features/public-site/track-entry";
import { extractToken, loadTracking, toTrackingView } from "@/features/public-site/tracking";

afterEach(() => { state.locale = "en"; vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); push.mockClear(); });

const EXPECTED = ["/", "/capabilities", "/products", "/fabrics", "/process", "/about", "/contact", "/track", "/privacy", "/terms"];
const SITE = "https://example.test";

describe("sitemap, robots, metadata", () => {
  it("the sitemap lists exactly the public pages and nothing private", () => {
    expect(PUBLIC_ROUTES.map((r) => r.path)).toEqual(EXPECTED);
    const urls = buildSitemap(SITE).map((e) => e.url);
    expect(urls).toEqual(EXPECTED.map((p) => (p === "/" ? SITE : `${SITE}${p}`)));
    for (const u of urls) expect(u).not.toMatch(/account|login|dashboard|admin|track\//);
  });
  it("publishes no sitemap entries without a configured site origin (never localhost)", () => {
    expect(buildSitemap("")).toEqual([]);
    expect(JSON.stringify(buildRobots(""))).not.toMatch(/localhost|sitemap/);
  });
  it("robots allows the site but keeps private areas and token pages out", () => {
    const r = buildRobots(SITE);
    const rule = r.rules as { allow: string; disallow: string[] };
    expect(rule.allow).toBe("/");
    for (const p of ["/account", "/login", "/api", "/dashboard", "/track/"]) expect(rule.disallow).toContain(p);
    expect(PRIVATE_PATHS.some((p) => EXPECTED.includes(p))).toBe(false);
    expect(r.sitemap).toBe(`${SITE}/sitemap.xml`);
  });
  it("the root layout stays noindex and only the public group opts back in", () => {
    expect(readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8")).toMatch(/robots:\s*\{\s*index:\s*false/);
    expect(readFileSync(path.join(process.cwd(), "src/features/public-site/seo.ts"), "utf8")).toMatch(/publicGroupMetadata[\s\S]*robots:\s*\{\s*index:\s*true/);
    expect(readFileSync(path.join(process.cwd(), "src/app/(public)/layout.tsx"), "utf8")).toContain("export const metadata = publicGroupMetadata");
  });
  it("every public page exports title, description, Open Graph and Twitter metadata", async () => {
    for (const slug of ["capabilities", "products", "fabrics", "process", "about", "contact", "track", "privacy", "terms"]) {
      const { generateMetadata } = await import(`@/app/(public)/${slug}/page`);
      const metadata = await generateMetadata();
      expect(metadata.title, slug).toBeTruthy();
      expect(metadata.description?.length, slug).toBeGreaterThan(40);
      expect(metadata.openGraph?.title, slug).toContain("Benuu Print");
      expect(metadata.twitter?.card, slug).toBe("summary_large_image");
      expect(JSON.stringify(metadata), slug).not.toMatch(/localhost/);
    }
  });
  it("canonical URLs exist only when a site URL is configured", async () => {
    expect((await pageMetadata({ path: "/about", title: "About", description: "d" })).alternates).toBeUndefined();
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
    const seo = await import("@/features/public-site/seo");
    expect((await seo.pageMetadata({ path: "/about", title: "About", description: "d" })).alternates).toEqual({ canonical: "/about" });
    expect((seo.publicGroupMetadata.metadataBase as URL).origin).toBe(SITE);
  });
  it("Arabic mode localises titles, descriptions and Open Graph text but keeps the brand, canonical and robots", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
    state.locale = "ar";
    const { generateMetadata } = await import("@/app/(public)/about/page");
    const m = await generateMetadata();
    expect(String(m.title)).toBe("من نحن");
    expect(m.description).toMatch(/Benuu Print/);
    expect(m.description).toMatch(/[\u0600-\u06FF]/);
    expect((m.openGraph as { title: string }).title).toBe("من نحن · Benuu Print");
    expect((m.openGraph as { siteName: string }).siteName).toBe("Benuu Print");
    expect(m.alternates).toEqual({ canonical: "/about" });
    expect(JSON.stringify(m)).not.toMatch(/hreflang|languages/);
  });
  it("structured data holds only known facts", () => {
    const ld = organizationJsonLd("");
    expect(Object.keys(ld).sort()).toEqual(["@context", "@type", "description", "name"]);
    expect(organizationJsonLd(SITE)).toMatchObject({ url: SITE });
  });
  it("tracking links are never indexed and never leak a referrer", async () => {
    const { generateMetadata } = await import("@/app/(public)/track/[token]/page");
    const metadata = await generateMetadata();
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});

describe("header and footer destinations", () => {
  it("the header links the five main pages and marks the current one", () => {
    render(<PublicHeader />);
    const main = screen.getByRole("navigation", { name: "Main" });
    expect(Array.from(main.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual(NAV_LINKS.map((l) => l.href));
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "Customer Login" })[0]).toHaveAttribute("href", CUSTOMER_LOGIN_HREF);
  });
  it("the footer has working links to every page, with no placeholders left", () => {
    const { container } = render(<PublicFooter />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    for (const p of ["/capabilities", "/products", "/fabrics", "/process", "/about", "/contact", "/privacy", "/terms", "/track", CUSTOMER_LOGIN_HREF, START_SAMPLE_HREF]) expect(hrefs).toContain(p);
    expect(container.textContent).not.toMatch(/soon/i);
  });
});

describe("public tracking", () => {
  const dto = { orderNumber: "ORD-000016", status: "PARTIALLY_SHIPPED", currentStage: "Packing", progressPercent: 140, totalQuantity: 30, deliveredQuantity: 15, remainingDeliveryQuantity: 14, targetDeliveryDate: null, updatedAt: "2026-10-01T10:00:00Z",
    customerEmail: "secret@x.com", internalNotes: "do not show", shipments: [
      { shipmentNumber: "SHP-000001", status: "DELIVERED", quantity: 10, courierName: "Courier", trackingUrl: "javascript:alert(1)", dispatchedAt: "2026-10-02T10:00:00Z", deliveredAt: "2026-10-03T10:00:00Z", driverPhone: "+20100" },
      { shipmentNumber: "SHP-000002", status: "DELIVERY_ATTEMPT_FAILED", quantity: 5, courierName: null, trackingUrl: "https://courier.test/t/1", dispatchedAt: null, deliveredAt: null, failureReason: "customer refused" },
    ] };
  const res = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status });

  it("calls only the public token endpoint, anonymously", async () => {
    const f = vi.fn().mockResolvedValue(res(200, dto));
    const r = await loadTracking("abc-123_X", f as unknown as typeof fetch);
    expect(r.kind).toBe("ok");
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("http://api.test/api/v1/track/orders/abc-123_X");
    expect(JSON.stringify(init)).not.toMatch(/authorization|credentials|cookie/i);
  });
  it("projects a whitelist only: private fields are dropped and unsafe links removed", async () => {
    const view = toTrackingView(dto)!;
    expect(JSON.stringify(view)).not.toMatch(/secret@x|do not show|driverPhone|\+20100|customer refused|javascript:/);
    expect(view.progressPercent).toBe(100);
    expect(view.shipments[0]!.trackingUrl).toBeNull();
    expect(view.shipments[1]!.trackingUrl).toBe("https://courier.test/t/1");
  });
  it("maps every failure to a safe state and rejects malformed tokens without any request", async () => {
    const kind = async (r: Response | Error) => (await loadTracking("tok", vi.fn().mockImplementation(async () => { if (r instanceof Error) throw r; return r; }) as unknown as typeof fetch)).kind;
    expect(await kind(res(404, { message: "Tracking link not found" }))).toBe("not_found");
    expect(await kind(res(429))).toBe("rate_limited");
    expect(await kind(res(500))).toBe("unavailable");
    expect(await kind(res(200, { nonsense: true }))).toBe("unavailable");
    expect(await kind(new Error("network"))).toBe("unavailable");
    const f = vi.fn();
    expect((await loadTracking("../../admin/orders", f as unknown as typeof fetch)).kind).toBe("not_found");
    expect(f).not.toHaveBeenCalled();
  });
  it("accepts a bare token or a pasted link", () => {
    expect(extractToken("  abc123  ")).toBe("abc123");
    expect(extractToken("https://site.test/track/abc123")).toBe("abc123");
    expect(extractToken("/api/v1/track/orders/abc123")).toBe("abc123");
    expect(extractToken("https://site.test/track?token=abc123")).toBe("abc123");
    expect(extractToken("")).toBeNull();
    expect(extractToken("bad token!")).toBeNull();
  });
  it("renders customer-friendly states without private data", () => {
    const view = toTrackingView(dto)!;
    const { container } = render(TrackResultPage({ result: { kind: "ok", tracking: view } }));
    expect(container).toHaveTextContent("ORD-000016");
    expect(container).toHaveTextContent("Partly shipped");
    expect(container).toHaveTextContent("Delivery attempt failed");
    expect(container).toHaveTextContent("Courier tracking");
    expect(container.textContent).not.toMatch(/secret|phone|refused/i);
  });
  it("shows a neutral message for an unknown link and a cancelled notice", () => {
    const { container, unmount } = render(TrackResultPage({ result: { kind: "not_found" } }));
    expect(container).toHaveTextContent("We can't find that order.");
    unmount();
    const cancelled = render(TrackResultPage({ result: { kind: "ok", tracking: { ...toTrackingView(dto)!, status: "CANCELLED", shipments: [] } } }));
    expect(cancelled.container).toHaveTextContent("This order has been cancelled.");
  });
  it("the entry form opens /track/<token> and rejects empty input", async () => {
    render(<TrackEntry />);
    await userEvent.click(screen.getByRole("button", { name: "Track" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/tracking link or code/i), "https://site.test/track/abc123");
    await userEvent.click(screen.getByRole("button", { name: "Track" }));
    expect(push).toHaveBeenCalledWith("/track/abc123");
  });
});

describe("contact form", () => {
  it("does not send or fake success when no endpoint exists", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<ContactForm />);
    expect(screen.getByRole("button", { name: "Send enquiry" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/coming soon/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/thank you/i)).toBeNull();
  });
  it("reports success only after a supplied handler resolves, and failure when it rejects", async () => {
    const ok = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(<ContactForm onSubmit={ok} />);
    const fill = async () => {
      await userEvent.type(screen.getByLabelText("Name"), "A");
      await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
      await userEvent.selectOptions(screen.getByLabelText("Project type"), "Bulk order");
      await userEvent.type(screen.getByLabelText("Message"), "Hello");
      await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    };
    await fill();
    expect(ok).toHaveBeenCalledWith(expect.objectContaining({ name: "A", projectType: "Bulk order" }));
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
    unmount();
    render(<ContactForm onSubmit={vi.fn().mockRejectedValue(new Error("x"))} />);
    await fill();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("legal pages", () => {
  it("privacy and terms render the draft notice and visible to-be-confirmed markers", () => {
    for (const [title, sections] of [["Privacy", PRIVACY_SECTIONS], ["Terms", TERMS_SECTIONS]] as const) {
      const { container, unmount } = render(<LegalPage eyebrow="Legal" title={title} sections={[...sections]} />);
      expect(screen.getByRole("note")).toHaveTextContent(/not legal advice/i);
      expect(container.querySelectorAll("[data-testid=legal-pending] li").length).toBeGreaterThan(3);
      expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
      unmount();
    }
    const text = JSON.stringify(TERMS_SECTIONS);
    for (const need of ["Governing law", "Refunds", "limits of liability", "cancelled"]) expect(text).toMatch(new RegExp(need, "i"));
    expect(JSON.stringify(PRIVACY_SECTIONS)).toMatch(/Retention/);
  });
});

describe("anonymous public site boundaries", () => {
  it("the only backend path it knows is the token endpoint; no admin or customer APIs", () => {
    const dir = path.join(process.cwd(), "src/features/public-site");
    let hits = 0;
    for (const f of readdirSync(dir, { recursive: true }).map(String).filter((n) => /\.tsx?$/.test(n))) {
      const src = readFileSync(path.join(dir, f), "utf8");
      expect(src, f).not.toMatch(/\/admin\/|\/customer\/|customerApi|tanstack/);
      if (/\/track\/orders\//.test(src)) hits += 1;
    }
    expect(hits).toBe(1);
    void act;
  });
});
