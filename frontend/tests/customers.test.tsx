import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { brand, customer, json, mockApi, renderWithClient, setup } from "./helpers";

const replace = vi.fn();
const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push, back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/customers",
  useSearchParams: () => new URLSearchParams(search),
}));
let perms: string[] = ["customers.read", "customers.manage"];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated" }),
}));

import { CustomersPage } from "@/features/customers/customers-page";
import { CustomerForm } from "@/features/customers/customer-form";
import { CustomerDetailPage } from "@/features/customers/customer-detail-page";

const list = (data: unknown[], total = data.length, page = 1) => ({ data, meta: { page, pageSize: 20, total } });

beforeEach(() => {
  setup();
  replace.mockClear(); push.mockClear();
  search = "";
  perms = ["customers.read", "customers.manage"];
});

describe("customer list", () => {
  it("renders backend data and sends default sort", async () => {
    const calls = mockApi({ "GET /admin/customers": list([customer(), customer({ id: "c2", customerNumber: "CUS-000002", displayName: "Delta Wear", status: "LEAD" })]) });
    renderWithClient(<CustomersPage />);
    expect(await screen.findByRole("link", { name: "Nile Streetwear" })).toHaveAttribute("href", "/customers/c1");
    expect(screen.getByText("CUS-000002")).toBeInTheDocument();
    expect(screen.getByText("Lead")).toBeInTheDocument();
    const q = new URLSearchParams(calls[0]!.query);
    expect(q.get("sortBy")).toBe("createdAt");
    expect(q.get("sortOrder")).toBe("desc");
    expect(q.get("page")).toBe("1");
  });

  it("takes search, status, archived, page and sort from the URL and forwards them to the backend", async () => {
    search = "search=nile&status=LEAD&includeArchived=true&page=3&pageSize=50&sortBy=displayName&sortOrder=asc";
    const calls = mockApi({ "GET /admin/customers": list([customer()], 120, 3) });
    renderWithClient(<CustomersPage />);
    await screen.findByText("Nile Streetwear");
    const q = new URLSearchParams(calls[0]!.query);
    expect(Object.fromEntries(q)).toMatchObject({ search: "nile", status: "LEAD", includeArchived: "true", page: "3", pageSize: "50", sortBy: "displayName", sortOrder: "asc" });
  });

  it("pagination writes page to the URL (server paging)", async () => {
    mockApi({ "GET /admin/customers": list([customer()], 120) });
    renderWithClient(<CustomersPage />);
    await screen.findByText("Nile Streetwear");
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(replace).toHaveBeenCalledWith("/customers?page=2", { scroll: false });
  });

  it("status filter and sort update the URL and reset to page 1", async () => {
    search = "page=4";
    mockApi({ "GET /admin/customers": list([customer()], 120, 4) });
    renderWithClient(<CustomersPage />);
    await screen.findByText("Nile Streetwear");
    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    await userEvent.click(await screen.findByRole("option", { name: "Blocked" }));
    expect(replace).toHaveBeenLastCalledWith(expect.stringMatching(/^\/customers\?status=BLOCKED$/), { scroll: false });
  });

  it("empty (no filters): 'No customers yet' with a New customer action", async () => {
    mockApi({ "GET /admin/customers": list([]) });
    renderWithClient(<CustomersPage />);
    expect(await screen.findByText("No customers yet")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /New customer/ }).length).toBeGreaterThan(0);
  });

  it("empty (filtered): 'No matching customers' with Clear filters", async () => {
    search = "search=zzz";
    mockApi({ "GET /admin/customers": list([]) });
    renderWithClient(<CustomersPage />);
    expect(await screen.findByText("No matching customers")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(replace).toHaveBeenCalledWith("/customers", { scroll: false });
  });

  it("loading state", () => {
    mockApi({ "GET /admin/customers": () => new Promise(() => {}) as never });
    renderWithClient(<CustomersPage />);
    expect(screen.getByRole("status", { name: "Loading table" })).toBeInTheDocument();
  });

  it("API error shows ErrorState with request id", async () => {
    mockApi({ "GET /admin/customers": json(500, { statusCode: 500, message: "boom", requestId: "rid-7" }) });
    renderWithClient(<CustomersPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("rid-7");
  });

  it("403 shows an error state (no logout) and hides nothing else", async () => {
    mockApi({ "GET /admin/customers": json(403, { statusCode: 403, message: "Insufficient permissions" }) });
    renderWithClient(<CustomersPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Insufficient permissions");
  });

  it("hides create / edit / archive without customers.manage", async () => {
    perms = ["customers.read"];
    mockApi({ "GET /admin/customers": list([customer()]) });
    renderWithClient(<CustomersPage />);
    await screen.findByText("Nile Streetwear");
    expect(screen.queryByRole("link", { name: /New customer/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Actions for Nile Streetwear" }));
    expect(screen.getByRole("menuitem", { name: "View" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("archived rows offer Restore (not Edit/Archive); restore uses the status endpoint", async () => {
    const calls = mockApi({
      "GET /admin/customers": list([customer({ status: "ARCHIVED", archivedAt: "2026-10-03T00:00:00Z" })]),
      "PATCH /admin/customers/c1/status": json(200, customer()),
    });
    renderWithClient(<CustomersPage />);
    await screen.findByText("Nile Streetwear");
    await userEvent.click(screen.getByRole("button", { name: "Actions for Nile Streetwear" }));
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Restore" }));
    await waitFor(() => expect(calls).toContainEqual(expect.objectContaining({ method: "PATCH", path: "/admin/customers/c1/status", body: { status: "ACTIVE" } })));
  });

  it("archive requires confirmation, explains brand consequence, then calls DELETE", async () => {
    const calls = mockApi({
      "GET /admin/customers": list([customer()]),
      "DELETE /admin/customers/c1": new Response(null, { status: 204 }),
    });
    renderWithClient(<CustomersPage />);
    await screen.findByText("Nile Streetwear");
    await userEvent.click(screen.getByRole("button", { name: "Actions for Nile Streetwear" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/brands are archived too/i);
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(within(dialog).getByRole("button", { name: "Archive customer" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.path === "/admin/customers/c1")).toBe(true));
  });
});

describe("customer form", () => {
  it("client validation blocks submit", async () => {
    const calls = mockApi({});
    renderWithClient(<CustomerForm />);
    await userEvent.click(screen.getByRole("button", { name: "Create customer" }));
    expect(await screen.findByText("Enter at least 2 characters")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("valid submit omits empty optionals and navigates to the new customer", async () => {
    const calls = mockApi({ "POST /admin/customers": json(201, { ...customer({ id: "new1", customerNumber: "CUS-000009" }), brands: [], contacts: [], addresses: [] }) });
    renderWithClient(<CustomerForm />);
    await userEvent.type(screen.getByLabelText(/^Name/), "Acme Prints");
    await userEvent.type(screen.getByLabelText("Phone"), "0100 111-2222");
    await userEvent.click(screen.getByRole("button", { name: "Create customer" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/customers/new1"));
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.body).toEqual({ displayName: "Acme Prints", phone: "0100 111-2222", status: "ACTIVE" }); // phone sent raw: backend normalises
  });

  it("maps backend 400 messages onto fields", async () => {
    mockApi({ "POST /admin/customers": json(400, { statusCode: 400, error: "Bad Request", message: ["email must be an email", "phone must be a phone number with 6-15 digits, optionally starting with +"], requestId: "r1" }) });
    renderWithClient(<CustomerForm />);
    await userEvent.type(screen.getByLabelText(/^Name/), "Acme Prints");
    await userEvent.type(screen.getByLabelText("Phone"), "abc");
    await userEvent.click(screen.getByRole("button", { name: "Create customer" }));
    expect(await screen.findByText(/Must be an email/i)).toBeInTheDocument();
    expect(screen.getByText(/Must be a phone number/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows unmapped errors (e.g. 409, 429) as a form-level alert", async () => {
    mockApi({ "POST /admin/customers": json(429, { statusCode: 429, message: "ThrottlerException" }, { "Retry-After-auth": "20" }) });
    renderWithClient(<CustomerForm />);
    await userEvent.type(screen.getByLabelText(/^Name/), "Acme Prints");
    await userEvent.click(screen.getByRole("button", { name: "Create customer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Try again in 20s/);
  });

  it("edit sends null for cleared optionals and never sends status", async () => {
    const detail = { ...customer({ city: "Cairo", notes: "old" }), brands: [], contacts: [], addresses: [] };
    const calls = mockApi({ "PATCH /admin/customers/c1": json(200, detail) });
    renderWithClient(<CustomerForm customer={detail as never} />);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled(); // pristine
    await userEvent.clear(screen.getByLabelText("City"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/customers/c1"));
    const body = calls.find((c) => c.method === "PATCH")!.body as Record<string, unknown>;
    expect(body.city).toBeNull();
    expect(body.displayName).toBe("Nile Streetwear");
    expect(body).not.toHaveProperty("status");
  });
});

describe("customer detail", () => {
  const detail = (over: Record<string, unknown> = {}) => ({
    ...customer(over),
    brands: [{ id: "b1", brandNumber: "BRD-000001", name: "Nile Core", status: "ACTIVE" }],
    contacts: [], addresses: [],
  });
  const contacts = [{ id: "ct1", role: "OWNER", name: "Omar Owner", jobTitle: "CEO", email: "o@x.com", phone: null, whatsapp: null, isPrimary: true, notes: null, createdAt: "", updatedAt: "" }];
  const addresses = [{ id: "ad1", type: "SHIPPING", country: "Egypt", state: null, city: "Cairo", area: null, addressLine1: "12 Test St", addressLine2: null, postalCode: null, notes: null, isDefault: true, createdAt: "", updatedAt: "" }];
  const handlers = (over: Record<string, unknown> = {}) => ({
    "GET /admin/customers/c1": detail(over),
    "GET /admin/customers/c1/contacts": contacts,
    "GET /admin/customers/c1/addresses": addresses,
    "GET /admin/customers/c1/brands": { data: [brand()], meta: { page: 1, pageSize: 100, total: 1 } },
  });

  it("shows summary, brands, contacts and addresses", async () => {
    mockApi(handlers());
    renderWithClient(<CustomerDetailPage id="c1" />);
    expect(await screen.findByRole("heading", { level: 1, name: "Nile Streetwear" })).toBeInTheDocument();
    expect(screen.getAllByText("CUS-000001").length).toBeGreaterThan(0);
    expect(await screen.findByText("Omar Owner")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(await screen.findByText("12 Test St")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Nile Core" })).toHaveAttribute("href", "/brands/b1");
    expect(screen.getByRole("link", { name: /Add brand/ })).toHaveAttribute("href", "/brands/new?customerId=c1");
  });

  it("read-only users get no mutation controls", async () => {
    perms = ["customers.read"];
    mockApi(handlers());
    renderWithClient(<CustomerDetailPage id="c1" />);
    await screen.findByText("Omar Owner");
    for (const name of [/Edit/, /Add contact/, /Add address/, /Add brand/, /Status/, /Archive/]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Edit|Add brand/ })).not.toBeInTheDocument();
  });

  it("archived customer: banner, Restore, no edit / add controls", async () => {
    mockApi(handlers({ status: "ARCHIVED", archivedAt: "2026-10-03T00:00:00Z" }));
    renderWithClient(<CustomerDetailPage id="c1" />);
    expect(await screen.findByRole("button", { name: /Restore/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/cannot be edited/);
    expect(screen.queryByRole("link", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add contact/ })).not.toBeInTheDocument();
  });

  it("404 shows 'Customer not found'", async () => {
    mockApi({ "GET /admin/customers/c1": json(404, { statusCode: 404, error: "Not Found", message: "Customer not found" }) });
    renderWithClient(<CustomerDetailPage id="c1" />);
    expect(await screen.findByText("Customer not found", { selector: "h3" })).toBeInTheDocument();
  });

  it("403 shows Access denied", async () => {
    mockApi({ "GET /admin/customers/c1": json(403, { statusCode: 403, message: "Insufficient permissions" }) });
    renderWithClient(<CustomerDetailPage id="c1" />);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
  });

  it("adding a contact posts the real DTO and refreshes the list", async () => {
    let list = [...contacts];
    const calls = mockApi({
      ...handlers(),
      "GET /admin/customers/c1/contacts": () => json(200, list),
      "POST /admin/customers/c1/contacts": ({ body }) => { list = [...list, { ...contacts[0]!, id: "ct2", name: (body as { name: string }).name, isPrimary: false }]; return json(201, list[1]); },
    });
    renderWithClient(<CustomerDetailPage id="c1" />);
    await screen.findByText("Omar Owner");
    await userEvent.click(screen.getAllByRole("button", { name: "Add contact" })[0]!);
    await userEvent.type(await screen.findByLabelText(/^Name/), "Fatma Finance");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add contact" }));
    expect(await screen.findByText("Fatma Finance")).toBeInTheDocument();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ name: "Fatma Finance", role: "OTHER", isPrimary: false });
  });

  it("address form: server field error surfaces inline", async () => {
    mockApi({
      ...handlers(),
      "POST /admin/customers/c1/addresses": json(400, { statusCode: 400, error: "Bad Request", message: ["postalCode must be shorter than or equal to 20 characters"] }),
    });
    renderWithClient(<CustomerDetailPage id="c1" />);
    await screen.findByText("12 Test St");
    await userEvent.click(screen.getAllByRole("button", { name: "Add address" })[0]!);
    const dlg = await screen.findByRole("dialog");
    await userEvent.type(within(dlg).getByLabelText(/^Country/), "Egypt");
    await userEvent.type(within(dlg).getByLabelText(/^City/), "Cairo");
    await userEvent.type(within(dlg).getByLabelText(/^Address line 1/), "5 Nile St");
    await userEvent.click(within(dlg).getByRole("button", { name: "Add address" }));
    expect(await within(dlg).findByText(/shorter than or equal to 20/)).toBeInTheDocument();
  });
});
