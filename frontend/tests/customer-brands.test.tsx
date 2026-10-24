import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { json, mockApi, page, renderWithClient } from "./helpers";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }), usePathname: () => "/account", useSearchParams: () => new URLSearchParams(search) }));
vi.mock("@/features/portal/auth/customer-auth-provider", () => ({ useCustomerAuth: () => ({ status: "authenticated", customer: { id: "c1", name: "Amina" }, login: vi.fn(), logout: vi.fn() }) }));

import { PortalDashboard } from "@/features/portal/dashboard";
import { NewSample } from "@/features/portal/new-sample";
import { ProfilePage } from "@/features/portal/profile";
import { SamplesList } from "@/features/portal/samples-list";

const b1 = { id: "b1", brandNumber: "BRD-1", name: "Nile Core", instagram: "@nile", website: null, description: null, primaryColor: null, secondaryColor: null };
const b2 = { ...b1, id: "b2", brandNumber: "BRD-2", name: "Delta", instagram: null };
beforeEach(() => { search = ""; replace.mockClear(); });

/** Brand list that starts empty and grows once a brand is POSTed, like the real backend. */
function brandsBackend(initial: object[] = []) {
  let list = [...initial];
  const calls = mockApi({
    "GET /customer/brands": () => json(200, list),
    "GET /customer/samples": page([]),
    "GET /customer/orders": page([]),
    "POST /customer/brands": (req: { body?: unknown }) => { const body = req.body as { name: string }; const nb = { ...b1, id: "new1", brandNumber: "BRD-9", name: body.name, instagram: null }; list = [...list, nb]; return json(201, nb); },
  });
  return calls;
}

describe("first brand onboarding", () => {
  it("dashboard with no brand shows Create brand; creating it needs only a name, sends no customerId, then offers Start your first sample for that brand", async () => {
    const calls = brandsBackend();
    renderWithClient(<PortalDashboard />);
    const card = await screen.findByTestId("first-brand");
    expect(card).toHaveTextContent("Your first step");
    expect(screen.queryByRole("link", { name: "Request a sample" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Brand name/), "Nile Core");
    await userEvent.click(screen.getByRole("button", { name: "Create brand" }));
    const done = await screen.findByTestId("brand-created");
    expect(done).toHaveTextContent("Nile Core is ready");
    expect(within(done).getByRole("link", { name: "Start your first sample" })).toHaveAttribute("href", "/account/samples/new?brandId=new1");
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.path).toBe("/customer/brands");
    expect(post.body).toEqual({ name: "Nile Core" });
    expect(JSON.stringify(post.body)).not.toMatch(/customerId/);
    expect(await screen.findByRole("link", { name: "Request a sample" })).toHaveAttribute("href", "/account/samples/new"); // list refreshed, no-brand state gone
  });
  it("optional details are folded away and sent only when filled", async () => {
    const calls = brandsBackend();
    renderWithClient(<PortalDashboard />);
    await userEvent.type(await screen.findByLabelText(/Brand name/), "Nile Core");
    await userEvent.click(screen.getByText(/Add more details/));
    await userEvent.type(screen.getByLabelText("Instagram"), "@nile");
    await userEvent.click(screen.getByRole("button", { name: "Create brand" }));
    await screen.findByTestId("brand-created");
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ name: "Nile Core", instagram: "@nile" });
  });
  it("a blank name is blocked before any request", async () => {
    const calls = brandsBackend();
    renderWithClient(<PortalDashboard />);
    await userEvent.click(await screen.findByRole("button", { name: "Create brand" }));
    expect(await screen.findByText("Enter your brand name")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });
  it("409 shows the clean duplicate message inline, with no backend internals", async () => {
    mockApi({ "GET /customer/brands": [], "GET /customer/samples": page([]), "GET /customer/orders": page([]), "POST /customer/brands": json(409, { statusCode: 409, error: "Conflict", message: "Brand uq_customer_brand_name violated" }) });
    renderWithClient(<PortalDashboard />);
    await userEvent.type(await screen.findByLabelText(/Brand name/), "Nile Core");
    await userEvent.click(screen.getByRole("button", { name: "Create brand" }));
    expect(await screen.findByText("You already have an active brand with this name.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/uq_customer_brand_name/);
    expect(screen.queryByTestId("brand-created")).toBeNull();
  });
});

describe("sample start integration", () => {
  it("new sample with no brand lets you create one, which is then selected and starts the draft with its id", async () => {
    const c2 = brandsBackend();
    renderWithClient(<NewSample />);
    await userEvent.type(await screen.findByLabelText(/Brand name/), "Fresh");
    await userEvent.click(screen.getByRole("button", { name: "Create brand" }));
    expect(await screen.findByRole("button", { name: "Start my request" })).toBeEnabled();
    expect(c2.find((c) => c.method === "POST")!.body).toEqual({ name: "Fresh" });
  });
  it("one brand is preselected; with several, none is until you choose, and ?brandId preselects that one", async () => {
    mockApi({ "GET /customer/brands": [b1] });
    const { unmount } = renderWithClient(<NewSample />);
    expect(await screen.findByRole("button", { name: "Start my request" })).toBeEnabled();
    unmount();
    mockApi({ "GET /customer/brands": [b1, b2] });
    const second = renderWithClient(<NewSample />);
    expect(await screen.findByRole("button", { name: "Start my request" })).toBeDisabled();
    second.unmount();
    search = "brandId=b2";
    mockApi({ "GET /customer/brands": [b1, b2], "POST /customer/samples": json(201, { id: "s9" }) });
    renderWithClient(<NewSample />);
    const start = await screen.findByRole("button", { name: "Start my request" });
    expect(start).toBeEnabled();
    expect(screen.getByRole("radio", { name: /Delta/ })).toHaveAttribute("aria-checked", "true");
  });
  it("an unknown ?brandId is ignored", async () => {
    search = "brandId=zzz";
    mockApi({ "GET /customer/brands": [b1, b2] });
    renderWithClient(<NewSample />);
    expect(await screen.findByRole("button", { name: "Start my request" })).toBeDisabled();
  });
});

describe("empty states", () => {
  it("My samples: brand but no samples invites a request; no brand points to Create brand", async () => {
    mockApi({ "GET /customer/brands": [b1], "GET /customer/samples": page([]) });
    const a = renderWithClient(<SamplesList />);
    expect(await screen.findByText("No samples yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request your first sample" })).toHaveAttribute("href", "/account/samples/new");
    a.unmount();
    mockApi({ "GET /customer/brands": [], "GET /customer/samples": page([]) });
    renderWithClient(<SamplesList />);
    expect(await screen.findByRole("link", { name: "Create brand" })).toHaveAttribute("href", "/account");
    expect(document.body.textContent).not.toMatch(/contact Benuu Print/i);
  });
});

describe("brand management on the profile", () => {
  const profile = { id: "c1", customerNumber: "CUS-1", name: "Amina", email: "a@x.com", phone: null, whatsapp: null, country: null, city: null, instagram: null, preferredLocale: "en" };
  it("lists own brands, edits one with PATCH (editable fields only, no customerId/status) and adds another", async () => {
    let list = [b1, b2];
    const calls = mockApi({
      "GET /customer/profile": profile, "GET /customer/addresses": [], "GET /customer/brands": () => json(200, list),
      "PATCH /customer/brands/b1": (req: { body?: unknown }) => { list = [{ ...b1, ...(req.body as object) } as typeof b1, b2]; return json(200, list[0]); },
      "POST /customer/brands": (req: { body?: unknown }) => json(201, { ...b1, id: "b3", ...(req.body as object) }),
    });
    renderWithClient(<ProfilePage />);
    const ul = await screen.findByTestId("brands");
    expect(within(ul).getAllByRole("listitem")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Edit Nile Core" }));
    const name = await screen.findByLabelText(/Brand name/);
    await userEvent.clear(name);
    await userEvent.type(name, "Nile Studio");
    await userEvent.click(screen.getByRole("button", { name: "Save brand" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(Object.keys(patch.body as object).sort()).toEqual(["description", "instagram", "name", "primaryColor", "secondaryColor", "website"]);
    expect((patch.body as { name: string }).name).toBe("Nile Studio");
    expect(await within(await screen.findByTestId("brands")).findByText("Nile Studio")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add brand" }));
    await userEvent.type(await screen.findByLabelText(/Brand name/), "Third");
    await userEvent.click(screen.getByRole("button", { name: "Create brand" }));
    await waitFor(() => expect(calls.find((c) => c.method === "POST")?.body).toEqual({ name: "Third" }));
  });
  it("editing into a duplicate name shows the clean 409 message and keeps the dialog open", async () => {
    mockApi({ "GET /customer/profile": profile, "GET /customer/addresses": [], "GET /customer/brands": [b1], "PATCH /customer/brands/b1": json(409, { statusCode: 409, error: "Conflict", message: "dup" }) });
    renderWithClient(<ProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit Nile Core" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save brand" }));
    expect(await screen.findByText("You already have an active brand with this name.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Brand name/)).toBeInTheDocument();
  });
});
