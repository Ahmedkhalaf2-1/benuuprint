import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

let pathname = "/account/orders/o1";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/portal/auth/customer-auth-provider", () => ({ useCustomerAuth: () => ({ status: "authenticated", customer: { id: "c1", name: "Nile Streetwear" }, logout: vi.fn() }) }));

import { ProgressRail } from "@/components/data-display/progress-rail";
import { StatusBadge } from "@/components/data-display/status-badge";
import { statusTone, toneClasses, type Tone } from "@/components/data-display/status";
import { PageHeader, sectionFor } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { PortalShell } from "@/features/portal/shell";

const css = readFileSync(path.join(process.cwd(), "src/styles/globals.css"), "utf8");

describe("shared Benue design tokens", () => {
  it("defines one brand foundation that the application tokens and the public tokens both read from", () => {
    for (const t of ["bg", "surface", "surface-raised", "text", "text-muted", "border", "emerald", "emerald-soft", "danger", "warning", "success"]) expect(css, t).toContain(`--benue-${t}:`);
    expect(css).toMatch(/--background:\s*var\(--benue-bg\)/);
    expect(css).toMatch(/--foreground:\s*var\(--benue-text\)/);
    expect(css).toMatch(/--border:\s*var\(--benue-border\)/);
    expect(css).toMatch(/--pub-bg:\s*var\(--benue-bg\)/);
    expect(css).toMatch(/--pub-brand:\s*var\(--benue-emerald\)/);
  });
  it("dashboards are dark by default and every status tone has a surface, text and dot colour", () => {
    expect(css).toMatch(/html \{[^}]*color-scheme: dark/);
    for (const tone of ["neutral", "progress", "review", "ready", "success", "warning", "blocked", "danger"]) for (const part of ["bg", "fg", "dot"]) expect(css, `${tone}-${part}`).toContain(`--tone-${tone}-${part}:`);
  });
});

describe("unified status badge", () => {
  it("renders a tone, a readable label and a non-colour shape cue for each status family", () => {
    const cases: Array<[string, Tone]> = [["DRAFT", "neutral"], ["IN_PRODUCTION", "progress"], ["UNDER_REVIEW", "review"], ["READY", "ready"], ["DELIVERED", "success"], ["ON_HOLD", "warning"], ["BLOCKED", "blocked"], ["FAILED", "danger"]];
    for (const [status, tone] of cases) {
      const { container, unmount } = render(<StatusBadge status={status} />);
      const el = container.firstElementChild!;
      expect(el).toHaveAttribute("data-tone", tone);
      expect(el.className).toContain(toneClasses[tone].badge.split(" ")[0]);
      expect(el.textContent?.length).toBeGreaterThan(2);
      expect(el.querySelector("[aria-hidden]")).not.toBeNull();
      unmount();
    }
    expect(Object.values(statusTone).every((t) => t in toneClasses)).toBe(true);
    const { container } = render(<StatusBadge status="SOMETHING_NEW" />);
    expect(container.firstElementChild).toHaveAttribute("data-tone", "neutral");
  });
});

describe("panels and rails", () => {
  it("panel variants carry meaning: attention and action get a rail, default does not", () => {
    const { container } = render(<><Card variant="attention" data-testid="a" /><Card variant="action" data-testid="b" /><Card data-testid="c" /></>);
    expect((container.querySelector("[data-testid=a]") as HTMLElement).className).toContain("tone-warning-dot");
    expect((container.querySelector("[data-testid=b]") as HTMLElement).className).toContain("var(--brand)");
    expect((container.querySelector("[data-testid=c]") as HTMLElement).className).not.toContain("inset_2px");
  });
  it("the progress rail keeps the tracker contract: state attributes, codes and spoken state", () => {
    render(<ProgressRail label="Production progress" testId="production-tracker" phase="IN_PROGRESS" steps={[{ code: "CUT", label: "Cutting", state: "DONE" }, { code: "SEW", label: "Sewing", state: "ACTIVE" }, { code: "PACK", label: "Packing", state: "PENDING" }]} />);
    const rail = screen.getByRole("list", { name: "Production progress" });
    expect(rail).toHaveAttribute("data-phase", "IN_PROGRESS");
    const items = within(rail).getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-state"))).toEqual(["DONE", "ACTIVE", "PENDING"]);
    expect(items.map((i) => i.getAttribute("data-code"))).toEqual(["CUT", "SEW", "PACK"]);
    expect(items[1]!.textContent).toContain("In progress");
    expect(items[2]!.textContent).toContain("Not started");
  });
});

describe("page header", () => {
  it("derives the eyebrow from the navigation group and renders title, description and actions", () => {
    expect(sectionFor("/production/jobs/abc")).toBe("Operations");
    expect(sectionFor("/dashboard")).toBe("Dashboard");
    expect(sectionFor("/nowhere")).toBeUndefined();
    pathname = "/production";
    render(<PageHeader title="Production" description="Monitor work." actions={<button>Create</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Production" })).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});

describe("customer portal navigation", () => {
  it("is one nav with the same four destinations, marks the current one and keeps sign-out reachable", () => {
    pathname = "/account/orders/o1";
    render(<PortalShell><p>content</p></PortalShell>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/account", "/account/samples", "/account/orders", "/account/profile"]);
    expect(links.map((l) => l.getAttribute("aria-current"))).toEqual([null, null, "page", null]);
    expect(nav.className).toContain("fixed");
    expect(nav.className).toContain("bottom-0");
    expect(nav.className).toContain("sm:static");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
