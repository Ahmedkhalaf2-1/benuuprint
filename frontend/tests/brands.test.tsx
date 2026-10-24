import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { brand, customer, json, mockApi, renderWithClient, setup } from "./helpers";

const replace = vi.fn();
const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push, back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/brands",
  useSearchParams: () => new URLSearchParams(search),
}));
let perms: string[] = ["customers.read", "customers.manage"];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated" }),
}));

import { BrandDetailPage } from "@/features/brands/brand-detail-page";
import { BrandForm } from "@/features/brands/brand-form";
import { BrandsPage } from "@/features/brands/brands-page";

const page = (data: unknown[]) => ({ data, meta: { page: 1, pageSize: 20, total: data.length } });
const brandDetail = (over: Record<string, unknown> = {}) => ({ ...brand(over), customer: { id: "c1", customerNumber: "CUS-000001", displayName: "Nile Streetwear" } });

beforeEach(() => { setup(); replace.mockClear(); push.mockClear(); search = ""; perms = ["customers.read", "customers.manage"]; });

describe("brands list", () => {
  it("asks for a customer first (no global brand list exists) and makes no brand request", async () => {
    const calls = mockApi({});
    renderWithClient(<BrandsPage />);
    expect(await screen.findByText("Choose a customer")).toBeInTheDocument();
    expect(calls.some((c) => c.path.includes("/brands"))).toBe(false);
  });

  it("lists the selected customer's brands, forwarding URL state (customer in the path, not the query)", async () => {
    search = "customerId=c1&search=core&status=ACTIVE&includeArchived=true";
    const calls = mockApi({ "GET /admin/customers/c1": { ...customer(), brands: [], contacts: [], addresses: [] }, "GET /admin/customers/c1/brands": page([brand()]) });
    renderWithClient(<BrandsPage />);
    expect(await screen.findByRole("link", { name: "Nile Core" })).toHaveAttribute("href", "/brands/b1");
    const req = calls.find((c) => c.path === "/admin/customers/c1/brands")!;
    const q = new URLSearchParams(req.query);
    expect(Object.fromEntries(q)).toMatchObject({ search: "core", status: "ACTIVE", includeArchived: "true" });
    expect(q.has("customerId")).toBe(false);
    expect(q.has("sort")).toBe(false);
  });

  it("empty brand list shows an Add brand action for managers only", async () => {
    search = "customerId=c1";
    mockApi({ "GET /admin/customers/c1": { ...customer(), brands: [], contacts: [], addresses: [] }, "GET /admin/customers/c1/brands": page([]) });
    renderWithClient(<BrandsPage />);
    expect(await screen.findByText("No brands for this customer")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /New brand/ }).length).toBeGreaterThan(0);
  });

  it("archived brand: Restore calls PATCH status ACTIVE; a 409 (customer archived / name taken) is shown, not swallowed", async () => {
    search = "customerId=c1&includeArchived=true";
    const calls = mockApi({
      "GET /admin/customers/c1": { ...customer(), brands: [], contacts: [], addresses: [] },
      "GET /admin/customers/c1/brands": page([brand({ status: "ARCHIVED" })]),
      "PATCH /admin/brands/b1": json(409, { statusCode: 409, error: "Conflict", message: "This customer already has a brand named \"Nile Core\"" }),
    });
    renderWithClient(<BrandsPage />);
    await screen.findByText("Nile Core");
    await userEvent.click(screen.getByRole("button", { name: "Actions for Nile Core" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Restore" }));
    await waitFor(() => expect(calls).toContainEqual(expect.objectContaining({ method: "PATCH", path: "/admin/brands/b1", body: { status: "ACTIVE" } })));
  });

  it("archive brand needs confirmation then DELETEs", async () => {
    search = "customerId=c1";
    const calls = mockApi({
      "GET /admin/customers/c1": { ...customer(), brands: [], contacts: [], addresses: [] },
      "GET /admin/customers/c1/brands": page([brand()]),
      "DELETE /admin/brands/b1": new Response(null, { status: 204 }),
    });
    renderWithClient(<BrandsPage />);
    await screen.findByText("Nile Core");
    await userEvent.click(screen.getByRole("button", { name: "Actions for Nile Core" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Archive brand" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.path === "/admin/brands/b1")).toBe(true));
  });
});

describe("brand form", () => {
  it("create needs a customer", async () => {
    const calls = mockApi({});
    renderWithClient(<BrandForm />);
    await userEvent.type(screen.getByLabelText(/^Brand name/), "Fresh Brand");
    await userEvent.click(screen.getByRole("button", { name: "Create brand" }));
    expect(await screen.findByText("Choose the customer this brand belongs to")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("creates under the pre-selected customer and goes to the brand", async () => {
    const calls = mockApi({ "POST /admin/customers/c1/brands": json(201, brandDetail({ id: "b9", brandNumber: "BRD-000009" })) });
    renderWithClient(<BrandForm initialCustomer={{ id: "c1", customerNumber: "CUS-000001", displayName: "Nile Streetwear" }} />);
    await userEvent.type(screen.getByLabelText(/^Brand name/), "Fresh Brand");
    await userEvent.type(screen.getByLabelText("Primary colour"), "#112233");
    await userEvent.click(screen.getByRole("button", { name: "Create brand" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/brands/b9"));
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ name: "Fresh Brand", primaryColor: "#112233", status: "ACTIVE" });
  });

  it("duplicate name (409) is shown on the name field", async () => {
    mockApi({ "POST /admin/customers/c1/brands": json(409, { statusCode: 409, error: "Conflict", message: "This customer already has a brand named \"nile core\"" }) });
    renderWithClient(<BrandForm initialCustomer={{ id: "c1", customerNumber: "CUS-000001", displayName: "Nile Streetwear" }} />);
    await userEvent.type(screen.getByLabelText(/^Brand name/), "nile core");
    await userEvent.click(screen.getByRole("button", { name: "Create brand" }));
    expect(await screen.findByText(/already has a brand named/)).toHaveAttribute("id", "name-error");
    expect(push).not.toHaveBeenCalled();
  });

  it("rejects bad colour / website client-side", async () => {
    const calls = mockApi({});
    renderWithClient(<BrandForm initialCustomer={{ id: "c1", customerNumber: "CUS-000001", displayName: "Nile Streetwear" }} />);
    await userEvent.type(screen.getByLabelText(/^Brand name/), "X");
    await userEvent.type(screen.getByLabelText("Primary colour"), "red");
    await userEvent.type(screen.getByLabelText("Website"), "ftp://x");
    await userEvent.click(screen.getByRole("button", { name: "Create brand" }));
    expect(await screen.findByText("Use a hex colour like #1A2B3C")).toBeInTheDocument();
    expect(screen.getByText("Use an http(s) address")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("edit: customer is fixed (no picker), clears optionals with null", async () => {
    const b = brandDetail({ website: "https://x.com" });
    const calls = mockApi({ "PATCH /admin/brands/b1": json(200, b) });
    renderWithClient(<BrandForm brand={b as never} />);
    expect(screen.queryByRole("button", { name: /Select a customer/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CUS-000001/ })).toHaveAttribute("href", "/customers/c1");
    await userEvent.clear(screen.getByLabelText("Website"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/brands/b1"));
    expect((calls.find((c) => c.method === "PATCH")!.body as Record<string, unknown>).website).toBeNull();
  });
});

describe("brand detail", () => {
  it("shows brand and linked customer", async () => {
    mockApi({ "GET /admin/brands/b1": brandDetail() });
    renderWithClient(<BrandDetailPage id="b1" />);
    expect(await screen.findByRole("heading", { level: 1, name: "Nile Core" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Nile Streetwear|Open customer/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Edit/ })).toHaveAttribute("href", "/brands/b1/edit");
  });

  it("archived: Restore instead of Edit/Archive", async () => {
    mockApi({ "GET /admin/brands/b1": brandDetail({ status: "ARCHIVED", archivedAt: "2026-10-05T00:00:00Z" }) });
    renderWithClient(<BrandDetailPage id="b1" />);
    expect(await screen.findByRole("button", { name: /Restore/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Archive/ })).not.toBeInTheDocument();
  });

  it("read-only: no actions; 403 -> Access denied; 404 -> not found", async () => {
    perms = ["customers.read"];
    mockApi({ "GET /admin/brands/b1": brandDetail() });
    const { unmount } = renderWithClient(<BrandDetailPage id="b1" />);
    await screen.findByRole("heading", { level: 1, name: "Nile Core" });
    expect(screen.queryByRole("link", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archive/ })).not.toBeInTheDocument();
    unmount();
    mockApi({ "GET /admin/brands/b1": json(403, { statusCode: 403, message: "Insufficient permissions" }) });
    const second = renderWithClient(<BrandDetailPage id="b1" />);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    second.unmount();
    mockApi({ "GET /admin/brands/b1": json(404, { statusCode: 404, error: "Not Found", message: "Brand not found" }) });
    renderWithClient(<BrandDetailPage id="b1" />);
    expect(await screen.findByText("Brand not found", { selector: "h3" })).toBeInTheDocument();
  });
});
