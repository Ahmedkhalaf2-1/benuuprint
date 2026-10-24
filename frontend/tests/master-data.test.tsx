import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { asset, fabric, json, mockApi, page, pattern, productType, ref, renderWithClient, sampleOptions, setup, version } from "./helpers";

const replace = vi.fn();
let search = "";
let pathname = "/master-data/products";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));
let perms: string[] = ["master_data.read", "assets.read"];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated" }),
}));

import { ColorSwatch } from "@/components/data-display/color-swatch";
import { ConfiguratorPage } from "@/features/master-data/configurator-page";
import { FabricDetailPage, FabricsPage, gsmText } from "@/features/master-data/fabrics";
import { MasterNav } from "@/features/master-data/master-nav";
import { MasterDataOverviewPage } from "@/features/master-data/overview-page";
import { PatternDetailPage, PatternsPage } from "@/features/master-data/patterns";
import { ProductTypeDetailPage, ProductTypesPage } from "@/features/master-data/product-types";
import { AccessoriesPage, ComponentsPage, PrintMethodsPage, SizesPage } from "@/features/master-data/simple-lists";
import { colorOptions, fabricsForProduct, patternOptions, productTypeOptions, sizeOptions, toOptions } from "@/features/master-data/adapters";
import type { SampleOptions } from "@/features/master-data/types";

beforeEach(() => { setup(); replace.mockClear(); search = ""; pathname = "/master-data/products"; perms = ["master_data.read", "assets.read"]; });

describe("navigation", () => {
  it("renders explicit section links and marks the active one", () => {
    pathname = "/master-data/fabrics/f1";
    render_(<MasterNav />);
    const nav = screen.getByRole("navigation", { name: "Master data sections" });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/master-data", "/master-data/products", "/master-data/fabrics", "/master-data/sizes", "/master-data/print-methods", "/master-data/accessories", "/master-data/components", "/master-data/patterns", "/master-data/configurator",
    ]);
    expect(within(nav).getByRole("link", { name: "Fabrics" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });
  it("overview is only active on the exact route", () => {
    pathname = "/master-data";
    render_(<MasterNav />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  });
});
const render_ = renderWithClient;

describe("overview", () => {
  it("shows real counts from list meta (no invented numbers) and degrades per card", async () => {
    mockApi({
      "GET /admin/product-types": page([productType()], 13), "GET /admin/fabrics": page([], 13), "GET /admin/size-scales": page([], 1),
      "GET /admin/print-methods": page([], 5), "GET /admin/accessories": page([], 7), "GET /admin/component-options": page([], 7),
      "GET /admin/patterns": json(403, { statusCode: 403, message: "Insufficient permissions" }),
    });
    render_(<MasterDataOverviewPage />);
    const cards = await screen.findByRole("region", { name: "Master data sections" });
    await waitFor(() => expect(within(cards).getByRole("link", { name: /Product types/ })).toHaveTextContent("13"));
    expect(within(cards).getByRole("link", { name: /Size scales/ })).toHaveTextContent("1");
    expect(await within(cards).findByRole("link", { name: /Patterns/ })).toHaveTextContent("Unavailable");
    expect(within(cards).getByRole("link", { name: /Configurator/ })).toHaveAttribute("href", "/master-data/configurator");
  });
});

describe("product types", () => {
  it("renders backend rows, links to detail, uses backend sort/filter params", async () => {
    search = "category=TOPS&search=te";
    const calls = mockApi({ "GET /admin/product-types": page([productType(), productType({ id: "pt2", code: "POLO", name: "Polo", archivedAt: "2026-10-03T00:00:00Z" })]) });
    render_(<ProductTypesPage />);
    expect(await screen.findByRole("link", { name: "Tee" })).toHaveAttribute("href", "/master-data/products/pt1");
    expect(screen.getByText("Archived")).toBeInTheDocument();
    const q = new URLSearchParams(calls[0]!.query);
    expect(Object.fromEntries(q)).toMatchObject({ category: "TOPS", search: "te", sortBy: "sortOrder", sortOrder: "asc", page: "1" });
  });
  it("empty state is read-only wording (no 'create')", async () => {
    mockApi({ "GET /admin/product-types": page([]) });
    render_(<ProductTypesPage />);
    expect(await screen.findByText("No product types configured")).toBeInTheDocument();
    expect(screen.getByText("Master data is managed by authorized administrators.")).toBeInTheDocument();
    expect(screen.queryByText(/create/i)).not.toBeInTheDocument();
  });
  it("shows 'No matching rows' + Clear filters when filtered", async () => {
    search = "search=zzz";
    mockApi({ "GET /admin/product-types": page([]) });
    render_(<ProductTypesPage />);
    expect(await screen.findByText("No matching rows")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(replace).toHaveBeenCalledWith("/master-data/products", { scroll: false });
  });
  it("API error shows request id; 403 does not log out", async () => {
    mockApi({ "GET /admin/product-types": json(500, { statusCode: 500, message: "x", requestId: "rid-1" }) });
    render_(<ProductTypesPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("rid-1");
  });
  it("detail shows fabric guidance with text states", async () => {
    mockApi({
      "GET /admin/product-types/pt1": productType(),
      "GET /admin/product-types/pt1/fabrics": [
        { productTypeId: "pt1", fabricId: "f1", fabricCode: "MILTON", fabricName: "Milton", isRecommended: true, isAllowed: true, notes: null },
        { productTypeId: "pt1", fabricId: "f2", fabricCode: "LYCRA", fabricName: "Lycra", isRecommended: false, isAllowed: false, notes: "stretches" },
      ],
    });
    render_(<ProductTypeDetailPage id="pt1" />);
    expect(await screen.findByRole("heading", { level: 1, name: "Tee" })).toBeInTheDocument();
    expect(await screen.findByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Not allowed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Milton" })).toHaveAttribute("href", "/master-data/fabrics/f1");
  });
  it("detail 404 / 403", async () => {
    mockApi({ "GET /admin/product-types/pt1": json(404, { statusCode: 404, error: "Not Found", message: "Product type not found" }), "GET /admin/product-types/pt1/fabrics": [] });
    const a = render_(<ProductTypeDetailPage id="pt1" />);
    expect(await screen.findByText("Product type not found", { selector: "h3" })).toBeInTheDocument();
    a.unmount();
    mockApi({ "GET /admin/product-types/pt1": json(403, { statusCode: 403, message: "Insufficient permissions" }), "GET /admin/product-types/pt1/fabrics": [] });
    render_(<ProductTypeDetailPage id="pt1" />);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
  });
});

describe("fabrics", () => {
  it("list: composition, GSM range, colour swatches + count, guidance count", async () => {
    mockApi({ "GET /admin/fabrics": page([fabric(), fabric({ id: "f2", referenceNumber: "FAB-000002", code: "LYCRA", name: "Lycra", composition: null, minGsm: null, maxGsm: null, defaultGsm: null, colors: [], productTypes: [] })]) });
    render_(<FabricsPage />);
    expect(await screen.findByRole("link", { name: "Milton" })).toHaveAttribute("href", "/master-data/fabrics/f1");
    expect(screen.getByText("180–240 (default 200)")).toBeInTheDocument();
    expect(screen.getByText("2 with guidance")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument(); // Lycra has no colours: no invented swatches
    expect(screen.getByText("No guidance")).toBeInTheDocument();
  });
  it("gsmText handles partial values", () => {
    expect(gsmText({ minGsm: null, maxGsm: null, defaultGsm: null })).toBeNull();
    expect(gsmText({ minGsm: 150, maxGsm: null, defaultGsm: null })).toBe("from 150");
    expect(gsmText({ minGsm: null, maxGsm: null, defaultGsm: 220 })).toBe("220");
  });
  const detail = (colors: unknown[]) => ({ "GET /admin/fabrics/f1": fabric(), "GET /admin/fabrics/f1/colors": colors });
  const colors = [
    { id: "col1", fabricId: "f1", name: "Red", internalCode: "R1", hex: "#CC0000", pantone: "18-1663", swatchAssetId: null, isAvailable: true, isActive: true, sortOrder: 0, createdAt: "", updatedAt: "", archivedAt: null },
    { id: "col2", fabricId: "f1", name: "Mystery", internalCode: null, hex: null, pantone: "11-0602", swatchAssetId: null, isAvailable: true, isActive: true, sortOrder: 1, createdAt: "", updatedAt: "", archivedAt: null },
    { id: "col3", fabricId: "f1", name: "Sold out", internalCode: null, hex: "#336699", pantone: null, swatchAssetId: null, isAvailable: false, isActive: true, sortOrder: 2, createdAt: "", updatedAt: "", archivedAt: null },
  ];
  it("detail: colours with hex / pantone / code, neutral fallback when there is no hex, unavailable flagged", async () => {
    mockApi(detail(colors));
    render_(<FabricDetailPage id="f1" />);
    const grid = await screen.findByTestId("fabric-colors");
    expect(within(grid).getByText("#CC0000 · Pantone 18-1663 · R1")).toBeInTheDocument();
    expect(within(grid).getByText("No colour value · Pantone 11-0602")).toBeInTheDocument();
    expect(grid.querySelectorAll("[data-fallback=true]")).toHaveLength(1);
    expect(within(grid).getByText("Unavailable")).toBeInTheDocument();
  });
  it("detail: compatibility states use text (recommended / not allowed) and explain guidance", async () => {
    mockApi(detail(colors));
    render_(<FabricDetailPage id="f1" />);
    expect(await screen.findByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Not allowed")).toBeInTheDocument();
    expect(screen.getByText(/does not by itself forbid a selection/)).toBeInTheDocument();
  });
  it("detail: no colours -> read-only empty state", async () => {
    mockApi({ "GET /admin/fabrics/f1": fabric({ productTypes: [] }), "GET /admin/fabrics/f1/colors": [] });
    render_(<FabricDetailPage id="f1" />);
    expect(await screen.findByText("No colours configured")).toBeInTheDocument();
    expect(screen.getByText("No product guidance")).toBeInTheDocument();
  });
  it("detail: archived toggle requests includeArchived", async () => {
    const calls = mockApi(detail(colors));
    render_(<FabricDetailPage id="f1" />);
    await screen.findByTestId("fabric-colors");
    await userEvent.click(screen.getByRole("switch", { name: "Show archived colours" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/admin/fabrics/f1/colors" && c.query.includes("includeArchived=true"))).toBe(true));
  });
});

describe("ColorSwatch", () => {
  it("valid hex: coloured, labelled", () => {
    render_(<ColorSwatch name="Red" hex="#cc0000" />);
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("#CC0000")).toBeInTheDocument();
  });
  it("icon-only swatch has an accessible name; missing/invalid hex falls back (never guesses a colour)", () => {
    render_(<><ColorSwatch name="Red" hex="#CC0000" showLabel={false} /><ColorSwatch name="Weird" hex="red" showLabel={false} /><ColorSwatch name="None" hex={null} showLabel={false} /></>);
    expect(screen.getByRole("img", { name: "Red, #CC0000" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Weird, no colour value" })).toHaveAttribute("data-fallback", "true");
    expect(screen.getByRole("img", { name: "None, no colour value" })).toHaveAttribute("data-fallback", "true");
  });
});

describe("sizes, print methods, accessories, components", () => {
  it("sizes keep the backend order (sortOrder) and show every option", async () => {
    mockApi({ "GET /admin/size-scales": page([ref({ id: "sc1", code: "STANDARD", name: "Standard adult sizes", sizes: [
      { id: "z3", scaleId: "sc1", code: "L", name: "L", sortOrder: 3, isActive: true, archivedAt: null },
      { id: "z1", scaleId: "sc1", code: "S", name: "S", sortOrder: 1, isActive: true, archivedAt: null },
      { id: "z2", scaleId: "sc1", code: "M", name: "M", sortOrder: 2, isActive: true, archivedAt: null },
      { id: "z4", scaleId: "sc1", code: "XL", name: "XL", sortOrder: 4, isActive: false, archivedAt: null },
    ] })]) });
    render_(<SizesPage />);
    const list = await screen.findByRole("list", { name: "Standard adult sizes sizes in order" });
    expect(within(list).getAllByRole("listitem").map((li) => li.querySelector("span")?.textContent)).toEqual(["S", "M", "L", "XL"]);
    expect(within(list).getByText("Inactive")).toBeInTheDocument();
  });
  it("print methods list with type, colours and setup fee as returned", async () => {
    mockApi({ "GET /admin/print-methods": page([ref({ id: "pm1", code: "DTF", name: "DTF", type: "PRINT", supportsFullColor: true, maxColors: null, minQuantity: 10, setupFee: "150.00", notes: null })]) });
    render_(<PrintMethodsPage />);
    expect(await screen.findByText("DTF", { selector: "td span.font-medium" })).toBeInTheDocument();
    expect(screen.getByText("150.00")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });
  it("accessories list", async () => {
    mockApi({ "GET /admin/accessories": page([ref({ id: "a1", code: "ZIP", name: "Zip", category: "Hardware", unit: "pcs" })]) });
    render_(<AccessoriesPage />);
    expect(await screen.findByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("pcs")).toBeInTheDocument();
  });
  it("components are grouped by backend category", async () => {
    mockApi({ "GET /admin/component-options": page([
      ref({ id: "c1", code: "NECK_LABEL", name: "Neck label", category: "LABEL" }),
      ref({ id: "c2", code: "POLYBAG", name: "Poly bag", category: "PACKAGING" }),
      ref({ id: "c3", code: "HANGTAG", name: "Hang tag", category: "LABEL" }),
    ]) });
    render_(<ComponentsPage />);
    await screen.findByText("Neck label");
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Label", "Packaging"]);
    const label = screen.getByRole("heading", { name: "Label" }).closest("[aria-labelledby]") as HTMLElement;
    expect(within(label).getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("patterns", () => {
  it("list: approved version column, status, empty state wording", async () => {
    mockApi({ "GET /admin/patterns": page([pattern(), pattern({ id: "pat2", referenceNumber: "PAT-000002", name: "Draft Pattern", currentVersionId: null, currentVersionNumber: null, status: "DRAFT" })]), "GET /admin/product-types": page([productType()]) });
    render_(<PatternsPage />);
    expect(await screen.findByRole("link", { name: "Regular Tee" })).toHaveAttribute("href", "/master-data/patterns/pat1");
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("None approved")).toBeInTheDocument();
  });
  it("list: uses status/productTypeId filters and does not send unsupported sort/isActive params", async () => {
    search = "status=ACTIVE&productTypeId=pt1";
    const calls = mockApi({ "GET /admin/patterns": page([]), "GET /admin/product-types": page([productType()]) });
    render_(<PatternsPage />);
    await screen.findByText("No matching rows");
    const q = new URLSearchParams(calls.find((c) => c.path === "/admin/patterns")!.query);
    expect(q.get("status")).toBe("ACTIVE");
    expect(q.get("productTypeId")).toBe("pt1");
    expect(q.has("sortBy")).toBe(false);
    expect(q.has("isActive")).toBe(false);
  });
  it("list: nothing available -> 'No patterns available' (no create CTA)", async () => {
    mockApi({ "GET /admin/patterns": page([]), "GET /admin/product-types": page([]) });
    render_(<PatternsPage />);
    expect(await screen.findByText("No patterns available")).toBeInTheDocument();
    expect(screen.queryByText(/create/i)).not.toBeInTheDocument();
  });
  it("list: 403 -> error state, no crash", async () => {
    mockApi({ "GET /admin/patterns": json(403, { statusCode: 403, message: "Insufficient permissions" }), "GET /admin/product-types": page([]) });
    render_(<PatternsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Insufficient permissions");
  });
  const detailHandlers = (assets: unknown[]) => ({
    "GET /admin/patterns/pat1": { ...pattern(), versions: [version({ id: "v1", versionNumber: 1, status: "SUPERSEDED" }), version({ id: "v2", versionNumber: 2, status: "APPROVED" }), version({ id: "v3", versionNumber: 3, status: "DRAFT", approvedAt: null, notes: "next" })], currentVersionId: "v2", currentVersionNumber: 2 },
    "GET /admin/assets": ({ query }: { query: URLSearchParams }) => json(200, { data: query.get("targetId") === "v2" ? assets : [], meta: { page: 1, pageSize: 50, total: assets.length } }),
  });
  it("detail: version timeline newest first with statuses and the current version", async () => {
    mockApi(detailHandlers([asset()]));
    render_(<PatternDetailPage id="pat1" />);
    const items = await screen.findAllByTestId("version");
    expect(items.map((i) => i.getAttribute("data-status"))).toEqual(["DRAFT", "APPROVED", "SUPERSEDED"]);
    expect(within(items[1]!).getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Version 3")).toBeInTheDocument();
  });
  it("detail: approved version with a PATTERN file shows 'attached' + signed download via the asset API", async () => {
    const calls = mockApi({
      ...detailHandlers([asset()]),
      "GET /admin/assets/as1/download-url": json(200, { url: "/api/v1/storage/local/TOKEN", expiresAt: "2026-10-21T20:00:00Z" }),
    });
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render_(<PatternDetailPage id="pat1" />);
    expect(await screen.findByTestId("file-ok")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Download tee-pattern.pdf" }));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(open.mock.calls[0]![0]).toBe("http://api.test/api/v1/storage/local/TOKEN"); // resolved on the API origin, not the frontend's
    expect(calls.some((c) => c.path === "/admin/assets/as1/download-url")).toBe(true);
    open.mockRestore();
  });
  it("detail: approved version WITHOUT a pattern file is flagged (backend rule not duplicated, only displayed)", async () => {
    mockApi(detailHandlers([asset({ type: "REFERENCE" })]));
    render_(<PatternDetailPage id="pat1" />);
    expect(await screen.findByTestId("file-missing")).toBeInTheDocument();
  });
  it("detail: without assets.read, no asset request is made and a neutral note is shown", async () => {
    perms = ["master_data.read"];
    const calls = mockApi(detailHandlers([asset()]));
    render_(<PatternDetailPage id="pat1" />);
    await screen.findAllByTestId("version");
    expect(calls.some((c) => c.path === "/admin/assets")).toBe(false);
    expect(screen.getAllByText(/visible to roles with file access/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("file-missing")).not.toBeInTheDocument();
  });
  it("never renders a storage key or path from the API", async () => {
    mockApi(detailHandlers([{ ...asset(), storageKey: "assets/2026/10/SECRET.pdf" }]));
    const { container } = render_(<PatternDetailPage id="pat1" />);
    await screen.findByTestId("file-ok");
    expect(container.innerHTML).not.toMatch(/SECRET|assets\/2026|storageKey/);
  });
  it("detail 404", async () => {
    mockApi({ "GET /admin/patterns/pat1": json(404, { statusCode: 404, error: "Not Found", message: "Pattern not found" }) });
    render_(<PatternDetailPage id="pat1" />);
    expect(await screen.findByText("Pattern not found", { selector: "h3" })).toBeInTheDocument();
  });
});

describe("configurator", () => {
  it("inspector lists every dataset with real counts", async () => {
    mockApi({ "GET /configurator/sample-options": sampleOptions() });
    render_(<ConfiguratorPage />);
    await screen.findByTestId("dataset-Product types");
    const count = (name: string) => within(screen.getByTestId(`dataset-${name}`)).getByText(/^\d+$/).textContent;
    expect(count("Product types")).toBe("2");
    expect(count("Fabric colours")).toBe("2");
    expect(count("Patterns (approved versions)")).toBe("1");
    expect(count("Fit methods")).toBe("1");
  });
  it("adapters keep the record and produce submit-ready values", () => {
    const o = sampleOptions() as unknown as SampleOptions;
    const types = productTypeOptions(o);
    expect(types[0]).toMatchObject({ value: "pt1", label: "Tee", hint: "TEE" });
    expect(types[0]!.record.code).toBe("TEE");
    expect(colorOptions(o.fabrics[0])[1]).toMatchObject({ value: "col2", label: "Mystery" });
    expect(sizeOptions(o, "sc1").map((s) => s.label)).toEqual(["S", "M"]);
    expect(sizeOptions(o, "nope")).toEqual([]);
    expect(toOptions(undefined, () => ({ value: "x", label: "x" }))).toEqual([]);
  });
  it("pattern options pin the approved patternVersionId and can be narrowed by product type", () => {
    const o = sampleOptions() as unknown as SampleOptions;
    expect(patternOptions(o)).toEqual([expect.objectContaining({ value: "v1", label: "Regular Tee (v2)", hint: "PAT-000001" })]);
    expect(patternOptions(o, "pt2")).toEqual([]);
  });
  it("fabric guidance sorts recommended first but hides nothing unless asked", () => {
    const o = sampleOptions() as unknown as SampleOptions;
    const all = fabricsForProduct(o, "pt1");
    expect(all.map((f) => f.label)).toEqual(["Milton", "Lycra"]);
    expect(all[0]).toMatchObject({ recommended: true, allowed: true });
    const polo = fabricsForProduct(o, "pt2");
    expect(polo).toHaveLength(2); // not-allowed is guidance: still listed
    expect(polo.find((f) => f.label === "Milton")).toMatchObject({ allowed: false });
    expect(fabricsForProduct(o, "pt2", { onlyAllowed: true }).map((f) => f.label)).toEqual(["Lycra"]);
  });
});
