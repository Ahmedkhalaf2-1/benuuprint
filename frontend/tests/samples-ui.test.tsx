import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { asset, json, mockApi, page, renderWithClient, sampleDetail, sampleItem, sampleOptions, setup } from "./helpers";

const replace = vi.fn();
const push = vi.fn();
let search = "";
let pathname = "/samples";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push, back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));
let perms: string[] = [];
const ALL_SALES = ["samples.read", "samples.manage", "samples.submit", "samples.review", "approvals.manage", "assets.manage", "assets.read", "quotations.read", "payments.read", "jobs.read_all", "master_data.read"];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({
    can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)),
    status: "authenticated", user: { id: "u1", name: "Sara", email: "s@x.com", roles: [], permissions: perms },
  }),
}));

import { RequirePermission } from "@/features/auth/require-permission";
import { filterNav } from "@/features/navigation/nav-config";
import { createPermissionChecker } from "@/lib/permissions";
import { DecorationsEditor } from "@/features/samples/decorations-editor";
import { SampleDetailPage } from "@/features/samples/sample-detail-page";
import { SampleForm } from "@/features/samples/sample-form";
import { SamplesPage } from "@/features/samples/samples-page";
import { StatusTimeline } from "@/features/samples/status-timeline";
import type { SampleDetail } from "@/features/samples/types";

const terms = { id: "t1", code: "SAMPLE_TERMS", version: 1, title: "Sample terms", content: "Be nice.", effectiveAt: "2026-01-01T00:00:00Z", isActive: true, createdAt: "" };
const detailHandlers = (over: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  "GET /admin/samples/s1": sampleDetail(over),
  "GET /admin/samples/s1/status-history": [{ id: "h1", sampleId: "s1", fromStatus: null, toStatus: "DRAFT", action: "create", reason: null, actorUserId: "u1", source: "STAFF", createdAt: "2026-10-01T10:00:00Z" }],
  "GET /admin/samples/s1/notes": [], "GET /admin/samples/s1/approvals": [], "GET /admin/terms": [terms], "GET /admin/artworks": page([]),
  "GET /admin/samples/s1/production-specs": [], "GET /admin/factory-jobs": page([]),
  "GET /admin/samples/s1/commercial-summary": { sampleId: "s1", sampleNumber: "SMP-000001", currency: "EGP", quotation: { quotationId: "q1", quotationNumber: "QTN-000001", versionId: "qv", versionNumber: 1, status: "SENT", total: "1500.00" }, quotedTotal: "1500.00", acceptedTotal: null, verifiedPaid: "0.00", pendingPayments: "0.00", remaining: null, paymentState: "UNPAID", counts: { verified: 0, pending: 0, rejected: 0, cancelled: 0 } },
  "GET /configurator/sample-options": sampleOptions(),
  ...extra,
});

beforeEach(() => { setup(); replace.mockClear(); push.mockClear(); search = ""; pathname = "/samples"; perms = [...ALL_SALES]; });

describe("samples list", () => {
  it("renders backend rows with links, product / custom product and the payment state", async () => {
    mockApi({ "GET /admin/samples": page([sampleItem(), sampleItem({ id: "s2", sampleNumber: "SMP-000002", productType: null, customProductName: "Poncho", status: "UNDER_REVIEW", paymentState: "PAID", assignedSales: { id: "u2", name: "Omar" } })]), "GET /configurator/sample-options": sampleOptions() });
    renderWithClient(<SamplesPage />);
    expect(await screen.findByRole("link", { name: "SMP-000001" })).toHaveAttribute("href", "/samples/s1");
    expect(screen.getByText("Poncho (custom)")).toBeInTheDocument();
    expect(screen.getByText("Omar")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });
  it("sends only supported params: default sort=newest and NO direction (a direction is a 400)", async () => {
    const calls = mockApi({ "GET /admin/samples": page([sampleItem()]), "GET /configurator/sample-options": sampleOptions() });
    renderWithClient(<SamplesPage />);
    await screen.findByText("SMP-000001");
    const q = new URLSearchParams(calls.find((c) => c.path === "/admin/samples")!.query);
    expect(q.get("sort")).toBe("newest");
    expect(q.has("direction")).toBe(false);
    expect(q.has("sortOrder")).toBe(false);
  });
  it("URL state (search, status list, filters, page) is forwarded to the backend", async () => {
    search = "search=nile&status=SUBMITTED,UNDER_REVIEW&paymentState=UNPAID&unassigned=true&customerId=c1&page=2&sort=oldest";
    const calls = mockApi({ "GET /admin/samples": page([sampleItem()], 40), "GET /admin/customers/c1": { id: "c1", customerNumber: "CUS-000001", displayName: "Nile", brands: [], contacts: [], addresses: [] }, "GET /configurator/sample-options": sampleOptions() });
    renderWithClient(<SamplesPage />);
    await screen.findByText("SMP-000001");
    const q = Object.fromEntries(new URLSearchParams(calls.find((c) => c.path === "/admin/samples")!.query));
    expect(q).toMatchObject({ search: "nile", status: "SUBMITTED,UNDER_REVIEW", paymentState: "UNPAID", unassigned: "true", customerId: "c1", page: "2", sort: "oldest" });
  });
  it("pagination and sorting write to the URL", async () => {
    mockApi({ "GET /admin/samples": page([sampleItem()], 80), "GET /configurator/sample-options": sampleOptions() });
    renderWithClient(<SamplesPage />);
    await screen.findByText("SMP-000001");
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(replace).toHaveBeenCalledWith("/samples?page=2", { scroll: false });
    await userEvent.click(screen.getByRole("combobox", { name: "Sort by" }));
    await userEvent.click(await screen.findByRole("option", { name: "Sample number" }));
    expect(replace).toHaveBeenLastCalledWith("/samples?sort=sampleNumber", { scroll: false });
  });
  it("more-filters drawer exposes only filters the API supports", async () => {
    mockApi({ "GET /admin/samples": page([sampleItem()]), "GET /configurator/sample-options": sampleOptions() });
    renderWithClient(<SamplesPage />);
    await screen.findByText("SMP-000001");
    await userEvent.click(screen.getByRole("button", { name: /More filters/ }));
    const dlg = await screen.findByRole("dialog", { name: "Filter samples" });
    for (const l of ["Customer", "Product type", "Fabric", "Payment state", /approval request/, "Unassigned (no sales owner)", "Assigned to me", "Include archived"]) expect(within(dlg).getByText(l)).toBeInTheDocument();
    expect(within(dlg).getAllByText(/^(From|To)$/)).toHaveLength(4);
  });
  it("empty states differ: none yet vs no match", async () => {
    mockApi({ "GET /admin/samples": page([]), "GET /configurator/sample-options": sampleOptions() });
    const a = renderWithClient(<SamplesPage />);
    expect(await screen.findByText("No samples yet")).toBeInTheDocument();
    a.unmount();
    search = "search=zzz";
    renderWithClient(<SamplesPage />);
    expect(await screen.findByText("No matching samples")).toBeInTheDocument();
  });
  it("error state with request id; New sample hidden without samples.manage", async () => {
    perms = ["samples.read"];
    mockApi({ "GET /admin/samples": json(500, { statusCode: 500, message: "x", requestId: "rid-9" }), "GET /configurator/sample-options": sampleOptions() });
    renderWithClient(<SamplesPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("rid-9");
    expect(screen.queryByRole("link", { name: /New sample/ })).not.toBeInTheDocument();
  });
  it("Edit draft row action only for drafts and managers", async () => {
    mockApi({ "GET /admin/samples": page([sampleItem(), sampleItem({ id: "s2", sampleNumber: "SMP-000002", status: "SUBMITTED" })]), "GET /configurator/sample-options": sampleOptions() });
    renderWithClient(<SamplesPage />);
    await screen.findByText("SMP-000002");
    await userEvent.click(screen.getByRole("button", { name: "Actions for SMP-000002" }));
    expect(screen.queryByRole("menuitem", { name: "Edit draft" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Actions for SMP-000001" }));
    expect(screen.getByRole("menuitem", { name: "Edit draft" })).toBeInTheDocument();
  });
});

describe("status timeline", () => {
  it("marks done / current / todo and is not interactive", () => {
    renderWithClient(<StatusTimeline status="UNDER_REVIEW" />);
    const items = screen.getAllByRole("listitem");
    expect(items.slice(0, 3).map((i) => i.getAttribute("data-state"))).toEqual(["done", "done", "current"]);
    expect(items[3]).toHaveAttribute("data-state", "todo");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("ON_HOLD keeps the held position and says so; REJECTED has no current step", () => {
    const a = renderWithClient(<StatusTimeline status="ON_HOLD" holdPreviousStatus="UNDER_REVIEW" />);
    expect(screen.getByText(/On hold \(was Under review\)/)).toBeInTheDocument();
    expect(document.querySelector("[aria-current=step]")).toHaveTextContent("Under review");
    a.unmount();
    renderWithClient(<StatusTimeline status="REJECTED" />);
    expect(document.querySelector("[aria-current=step]")).toBeNull();
    expect(screen.getByText(/Rejected — no further steps/)).toBeInTheDocument();
  });
});

describe("sample form", () => {
  const customer = { id: "c1", customerNumber: "CUS-000001", displayName: "Nile Streetwear" };
  const formApi = (extra: Record<string, unknown> = {}) => mockApi({
    "GET /configurator/sample-options": sampleOptions(),
    "GET /admin/customers/c1/brands": page([{ id: "b1", brandNumber: "BRD-000001", customerId: "c1", name: "Nile Core", status: "ACTIVE" }]),
    ...extra,
  });

  it("customer and brand are required; the draft is otherwise free to be incomplete", async () => {
    const calls = formApi();
    renderWithClient(<SampleForm />);
    await userEvent.click(await screen.findByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Choose a customer")).toBeInTheDocument();
    expect(screen.getByText("Choose a brand")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });
  it("saves an incomplete draft (customer + brand only) and goes to the edit page", async () => {
    const calls = formApi({ "POST /admin/samples": json(201, sampleDetail({ id: "new1", sampleNumber: "SMP-000009" })) });
    renderWithClient(<SampleForm initialCustomer={customer} />);
    await userEvent.click(await screen.findByRole("combobox", { name: /Brand/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Nile Core/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/samples/new1/edit"));
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ customerId: "c1", brandId: "b1", fabricProvider: "NOT_DECIDED", fitMethod: "NOT_SURE" });
  });
  it("custom product reveals name/description and hides the catalogue select", async () => {
    formApi();
    renderWithClient(<SampleForm initialCustomer={customer} />);
    await screen.findByRole("radio", { name: /Custom product/ });
    expect(screen.getByRole("combobox", { name: /Product type/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Custom product/ }));
    expect(screen.getByLabelText("Custom product name")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Product type/ })).not.toBeInTheDocument();
  });
  it("custom fabric forces a custom colour (no catalogue colours)", async () => {
    formApi();
    renderWithClient(<SampleForm initialCustomer={customer} />);
    await userEvent.click(await screen.findByRole("radio", { name: /Custom fabric/ }));
    expect(screen.getByLabelText("Custom fabric name")).toBeInTheDocument();
    expect(screen.getByText("A custom fabric uses a custom colour.")).toBeInTheDocument();
    expect(screen.getByLabelText("Colour name")).toBeInTheDocument();
  });
  it("custom colour fields: hex is validated client-side", async () => {
    const calls = formApi();
    renderWithClient(<SampleForm initialCustomer={customer} />);
    await userEvent.click(await screen.findByRole("radio", { name: /Custom fabric/ }));
    await userEvent.type(screen.getByLabelText("Hex"), "red");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Use a hex colour like #1A2B3C")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });
  it("BENUE_PATTERN shows the approved-pattern select (pinning the version); other fits hide it", async () => {
    formApi();
    renderWithClient(<SampleForm initialCustomer={customer} />);
    await screen.findByRole("radio", { name: /Benuu Print pattern/ });
    expect(screen.queryByRole("combobox", { name: /Approved pattern/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Benuu Print pattern/ }));
    await userEvent.click(screen.getByRole("combobox", { name: /Approved pattern/ }));
    expect(await screen.findByRole("option", { name: /Regular Tee \(v2\)/ })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("radio", { name: /Custom size chart/ }));
    expect(screen.queryByRole("combobox", { name: /Approved pattern/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Size chart/)).toBeInTheDocument();
  });
  it("create page explains that parts need the saved draft; the edit page shows them", async () => {
    formApi();
    const a = renderWithClient(<SampleForm initialCustomer={customer} />);
    expect(await screen.findByText(/added to the draft once it exists/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add decoration/ })).not.toBeInTheDocument();
    a.unmount();
    mockApi({ ...detailHandlers(), "GET /admin/customers/c1/brands": page([]) });
    renderWithClient(<SampleForm sample={sampleDetail() as unknown as SampleDetail} />);
    expect(await screen.findByRole("button", { name: /Add decoration/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit sample" })).toBeInTheDocument();
  });
  it("backend field errors land on the fields; unmapped ones become a form alert", async () => {
    formApi({ "POST /admin/samples": json(400, { statusCode: 400, error: "Bad Request", message: ["gsm must not be less than 1", "something odd"], requestId: "r2" }) });
    renderWithClient(<SampleForm initialCustomer={customer} />);
    await userEvent.click(await screen.findByRole("combobox", { name: /Brand/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Nile Core/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText(/Must not be less than 1/i)).toBeInTheDocument();
    expect(screen.getByText("something odd")).toBeInTheDocument();
  });
  it("warns before in-app navigation while there are unsaved changes", async () => {
    mockApi({ ...detailHandlers(), "GET /admin/customers/c1/brands": page([]) });
    renderWithClient(<><a href="/somewhere-else" data-x>Customers link</a><SampleForm sample={sampleDetail() as unknown as SampleDetail} /></>);
    await userEvent.type(await screen.findByLabelText("Request notes"), " more");
    await userEvent.click(screen.getByRole("link", { name: "Customers link" }));
    const dlg = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    expect(dlg).toHaveTextContent(/Discard unsaved changes/);
    expect(push).not.toHaveBeenCalled();
    await userEvent.click(within(dlg).getByRole("button", { name: "Discard and leave" }));
    expect(push).toHaveBeenCalledWith("/somewhere-else");
  });
});

describe("decorations", () => {
  it("none = made without print; read-only view has no controls", () => {
    mockApi({ "GET /configurator/sample-options": sampleOptions(), "GET /admin/artworks": page([]) });
    renderWithClient(<DecorationsEditor sample={sampleDetail() as unknown as SampleDetail} editable={false} />);
    expect(screen.getByText(/without print/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("add requires method + placement, sends the real DTO and supports artwork-required", async () => {
    const calls = mockApi({ "GET /configurator/sample-options": sampleOptions(), "GET /admin/artworks": page([]), "POST /admin/samples/s1/decorations": json(201, {}) });
    renderWithClient(<DecorationsEditor sample={sampleDetail() as unknown as SampleDetail} editable />);
    await userEvent.click(screen.getByRole("button", { name: /Add decoration/ }));
    const dlg = await screen.findByRole("dialog");
    await userEvent.click(within(dlg).getByRole("button", { name: "Add decoration" }));
    expect(await within(dlg).findByText("Choose a print method")).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole("combobox", { name: /Print method/ }));
    await userEvent.click(await screen.findByRole("option", { name: "DTF" }));
    await userEvent.type(within(dlg).getByLabelText(/Placement/), "Chest");
    await userEvent.type(within(dlg).getByLabelText("Width"), "10");
    await userEvent.click(within(dlg).getByRole("switch", { name: /Artwork required/ }));
    await userEvent.click(within(dlg).getByRole("button", { name: "Add decoration" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/samples/s1/decorations")).toBe(true));
    expect(calls.find((c) => c.method === "POST")!.body).toMatchObject({ printMethodId: "pm1", placement: "Chest", side: "FRONT", width: 10, unit: "CM", artworkRequired: true });
  });
  it("lists decorations with size, colours and the artwork-required warning", () => {
    mockApi({ "GET /configurator/sample-options": sampleOptions(), "GET /admin/artworks": page([]) });
    const s = sampleDetail({ decorations: [{ id: "d1", printMethod: { id: "pm1", code: "DTF", name: "DTF" }, placement: "Chest", side: "FRONT", width: "10.00", height: "8.00", unit: "CM", colorCount: 2, notes: null, artworkRequired: true, artworkId: null, sortOrder: 0 }] });
    renderWithClient(<DecorationsEditor sample={s as unknown as SampleDetail} editable={false} />);
    expect(screen.getByText(/10.00 × 8.00 CM · 2 colours/)).toBeInTheDocument();
    expect(screen.getByText("No artwork linked yet")).toBeInTheDocument();
  });
});

describe("sample detail", () => {
  it("shows header, backend-driven actions, and no Assign without samples.assign", async () => {
    mockApi(detailHandlers());
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByRole("heading", { level: 1, name: "Tee" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit sample" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel sample" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit draft/ })).toHaveAttribute("href", "/samples/s1/edit");
    expect(screen.queryByRole("button", { name: /Assign sales/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument(); // not in allowedActions
  });
  it("allowedActions drive what is shown (no second state machine)", async () => {
    mockApi(detailHandlers({ status: "ON_HOLD", holdPreviousStatus: "UNDER_REVIEW", allowedActions: ["resume", "reject", "cancel"] }));
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit sample" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Edit draft/ })).not.toBeInTheDocument();
  });
  it("Assign sales appears with samples.assign", async () => {
    perms = [...ALL_SALES, "samples.assign"];
    mockApi(detailHandlers());
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByRole("button", { name: /Assign sales/ })).toBeInTheDocument();
  });
  it("hold needs a reason and sends it to the explicit action route (not PATCH)", async () => {
    const calls = mockApi(detailHandlers({ status: "UNDER_REVIEW", allowedActions: ["hold", "cancel"] }, { "POST /admin/samples/s1/hold": json(200, sampleDetail({ status: "ON_HOLD" })) }));
    renderWithClient(<SampleDetailPage id="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Put on hold" }));
    const dlg = await screen.findByRole("dialog");
    const confirm = within(dlg).getByRole("button", { name: "Put on hold" });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dlg).getByLabelText(/Reason/), "waiting for customer");
    await userEvent.click(confirm);
    await waitFor(() => expect(calls.some((c) => c.path === "/admin/samples/s1/hold")).toBe(true));
    expect(calls.find((c) => c.path === "/admin/samples/s1/hold")).toMatchObject({ method: "POST", body: { reason: "waiting for customer" } });
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });
  it("reject / cancel require a reason too; resume's is optional", async () => {
    mockApi(detailHandlers({ status: "ON_HOLD", allowedActions: ["resume", "reject"] }));
    renderWithClient(<SampleDetailPage id="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));
    expect(within(await screen.findByRole("dialog")).getByRole("button", { name: "Reject sample" })).toBeDisabled();
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Back" }));
    await userEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(within(await screen.findByRole("dialog")).getByRole("button", { name: "Resume" })).toBeEnabled();
  });
  it("submit failure shows the backend's problems as a linked summary", async () => {
    mockApi(detailHandlers({}, { "POST /admin/samples/s1/submit": json(400, { statusCode: 400, error: "Bad Request", message: ["terms: the active sample terms (version 1) must be accepted before submitting", "decorations: decoration #1 (DTF): artwork is required"] }) }));
    renderWithClient(<SampleDetailPage id="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Submit sample" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Submit" }));
    const box = await screen.findByTestId("problems");
    expect(box).toHaveTextContent("2 items need attention");
    expect(within(box).getByRole("link", { name: /Terms:/ })).toHaveAttribute("href", "/samples/s1/edit#sec-terms");
    expect(within(box).getByRole("link", { name: /Decoration:/ })).toHaveAttribute("href", "/samples/s1/edit#sec-decoration");
  });
  it("submit success posts to /submit", async () => {
    const calls = mockApi(detailHandlers({}, { "POST /admin/samples/s1/submit": json(200, sampleDetail({ status: "SUBMITTED" })) }));
    renderWithClient(<SampleDetailPage id="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Submit sample" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/samples/s1/submit")).toBe(true));
  });
  it("on hold shows the hold reason from the status history", async () => {
    mockApi(detailHandlers({ status: "ON_HOLD", holdPreviousStatus: "UNDER_REVIEW", allowedActions: ["resume"] }, {
      "GET /admin/samples/s1/status-history": [{ id: "h2", sampleId: "s1", fromStatus: "UNDER_REVIEW", toStatus: "ON_HOLD", action: "hold", reason: "customer asked to wait", actorUserId: "u1", source: "STAFF", createdAt: "2026-10-02T10:00:00Z" }],
    }));
    renderWithClient(<SampleDetailPage id="s1" />);
    expect((await screen.findAllByText(/customer asked to wait/)).length).toBeGreaterThan(0);
  });
  it("specification keeps notes separate and labels factory instructions internal", async () => {
    mockApi(detailHandlers({ fitNotes: "snug", printNotes: "no cracking" }));
    pathname = "/samples/s1"; search = "tab=specification";
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByText("Fit notes")).toBeInTheDocument();
    expect(screen.getByText("snug")).toBeInTheDocument();
    expect(screen.getByText("no cracking")).toBeInTheDocument();
    expect(screen.getByText(/Factory instructions \(internal/)).toBeInTheDocument();
    expect(screen.getByText("internal only")).toBeInTheDocument();
    expect(screen.getByText("Navy")).toBeInTheDocument(); // custom colour swatch
  });
  it("commercial tab is hidden without quotations/payments read; read-only users get no mutation controls", async () => {
    perms = ["samples.read"];
    mockApi(detailHandlers());
    renderWithClient(<SampleDetailPage id="s1" />);
    await screen.findByRole("heading", { level: 1, name: "Tee" });
    expect(screen.queryByRole("tab", { name: "Commercial" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Edit draft/ })).not.toBeInTheDocument();
  });
  it("commercial tab: summary + placeholder CTA; a 403 shows a restricted message, not fake zeros", async () => {
    pathname = "/samples/s1"; search = "tab=commercial";
    mockApi(detailHandlers());
    const a = renderWithClient(<SampleDetailPage id="s1" />);
    const box = await screen.findByTestId("commercial-summary");
    expect(box).toHaveTextContent("QTN-000001");
    expect(box).toHaveTextContent("EGP 1,500.00");
    a.unmount();
    mockApi(detailHandlers({}, { "GET /admin/samples/s1/commercial-summary": json(403, { statusCode: 403, message: "Insufficient permissions" }) }));
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByText(/not available to your role/)).toBeInTheDocument();
    expect(screen.queryByTestId("commercial-summary")).not.toBeInTheDocument();
  });
  it("production tab: PRE_PRODUCTION and APPROVED_REFERENCE are labelled, frozen and read-only; job card links to production", async () => {
    pathname = "/samples/s1"; search = "tab=production";
    const spec = (kind: string, revision: number) => ({ id: `sp${revision}${kind}`, sampleId: "s1", revision, kind, sourceFactoryJobId: null, specHash: "a".repeat(64), schemaVersion: 1, approvalId: null, snapshot: { product: "Tee" }, createdAt: "2026-10-03T10:00:00Z" });
    mockApi(detailHandlers({ status: "AWAITING_APPROVAL", allowedActions: [] }, {
      "GET /admin/samples/s1/production-specs": [spec("PRE_PRODUCTION", 1), spec("APPROVED_REFERENCE", 1)],
      "GET /admin/factory-jobs": page([{ id: "j1", jobNumber: "JOB-000001", sourceType: "SAMPLE_PRODUCTION", status: "IN_PROGRESS", priority: "NORMAL", sampleNumber: "SMP-000001", progress: null, startedAt: "2026-10-03T10:00:00Z", completedAt: null, targetCompletionDate: null }, { id: "j2", jobNumber: "JOB-000002", sourceType: "SAMPLE_PRODUCTION", status: "PLANNED", priority: "NORMAL", sampleNumber: "SMP-999999", progress: null, startedAt: null, completedAt: null, targetCompletionDate: null }]),
    }));
    renderWithClient(<SampleDetailPage id="s1" />);
    const specs = await screen.findAllByTestId("production-spec");
    expect(specs.map((s) => s.getAttribute("data-kind")).sort()).toEqual(["APPROVED_REFERENCE", "PRE_PRODUCTION"]);
    expect(screen.getByText(/Frozen when production was created/)).toBeInTheDocument();
    expect(screen.getByText("Final approved baseline for bulk production.")).toBeInTheDocument();
    expect(screen.getAllByText(/Frozen — read only/)).toHaveLength(2);
    expect(within(specs[0]!).queryByRole("button")).not.toBeInTheDocument();
    const jobs = await screen.findByTestId("sample-jobs");
    expect(jobs).toHaveTextContent("JOB-000001");
    expect(jobs).not.toHaveTextContent("JOB-000002"); // other sample's job is filtered out
    expect(within(jobs).getByRole("link", { name: /Open job/ })).toHaveAttribute("href", "/production/jobs/j1");
  });
  it("404 and 403", async () => {
    mockApi({ "GET /admin/samples/s1": json(404, { statusCode: 404, error: "Not Found", message: "Sample not found" }) });
    const a = renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByText("Sample not found", { selector: "h3" })).toBeInTheDocument();
    a.unmount();
    mockApi({ "GET /admin/samples/s1": json(403, { statusCode: 403, message: "Insufficient permissions" }) });
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
  });
});

describe("notes, approvals, terms, files, artwork", () => {
  const goto = (tab: string) => { pathname = "/samples/s1"; search = `tab=${tab}`; };
  it("notes: internal by default; customer-visible is labelled; delete only own notes", async () => {
    goto("notes");
    const calls = mockApi(detailHandlers({}, {
      "GET /admin/samples/s1/notes": [{ id: "n1", visibility: "INTERNAL", content: "mine", authorUserId: "u1", authorName: "Sara", createdAt: "2026-10-01T10:00:00Z" }, { id: "n2", visibility: "CUSTOMER_VISIBLE", content: "theirs", authorUserId: "u9", authorName: "Omar", createdAt: "2026-10-01T10:00:00Z" }],
      "POST /admin/samples/s1/notes": json(201, {}),
    }));
    renderWithClient(<SampleDetailPage id="s1" />);
    const list = await screen.findByTestId("notes");
    expect(within(list).getByText("Internal")).toBeInTheDocument();
    expect(within(list).getByText("Customer-visible")).toBeInTheDocument();
    expect(within(list).getAllByRole("button", { name: "Delete note" })).toHaveLength(1);
    await userEvent.type(screen.getByLabelText("Add a note"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/samples/s1/notes")).toBe(true));
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ content: "hello", visibility: "INTERNAL" });
  });
  it("notes: no composer without samples.manage", async () => {
    perms = ["samples.read"]; goto("notes");
    mockApi(detailHandlers());
    renderWithClient(<SampleDetailPage id="s1" />);
    await screen.findByText("No notes yet");
    expect(screen.queryByLabelText("Add a note")).not.toBeInTheDocument();
  });
  const approval = (over: Record<string, unknown> = {}) => ({ id: "a1", type: "ARTWORK", sampleId: "s1", quotationVersionId: null, artworkVersionId: "av1", productionSpecId: null, status: "PENDING", mode: null, staffRecorded: true, requestedByUserId: "u1", requestedAt: "2026-10-01T10:00:00Z", expiresAt: null, respondedAt: null, respondedByUserId: null, responseNote: null, sourceNote: null, createdAt: "", ...over });
  it("approvals: staff-recorded wording, on-behalf needs evidence, then POSTs the decision", async () => {
    goto("approvals");
    const calls = mockApi(detailHandlers({}, { "GET /admin/samples/s1/approvals": [approval(), approval({ id: "a2", type: "QUOTATION", artworkVersionId: null, quotationVersionId: "q1" }), approval({ id: "a3", status: "APPROVED", mode: "STAFF_RECORDED_ON_BEHALF", sourceNote: "WhatsApp", respondedAt: "2026-10-02T10:00:00Z" })], "POST /admin/approvals/a1/approve": json(200, approval({ status: "APPROVED" })) }));
    renderWithClient(<SampleDetailPage id="s1" />);
    const list = await screen.findByTestId("approvals");
    expect(within(list).getByText("Handled in quotations")).toBeInTheDocument();
    expect(within(list).getByText(/Recorded by staff on behalf of the customer/)).toBeInTheDocument();
    expect(within(list).getAllByRole("button", { name: "Record approval" })).toHaveLength(1); // quotation requests are not decided here
    await userEvent.click(within(list).getByRole("button", { name: "Record approval" }));
    const dlg = await screen.findByRole("dialog");
    expect(dlg).toHaveTextContent(/The customer is not signing in/);
    expect(dlg).not.toHaveTextContent(/approve as customer/i);
    const confirm = within(dlg).getByRole("button", { name: "Record approval" });
    expect(confirm).toBeDisabled(); // evidence required when recording on behalf
    await userEvent.type(within(dlg).getByLabelText(/Source \/ evidence/), "WhatsApp, 21 Oct");
    await userEvent.click(confirm);
    await waitFor(() => expect(calls.some((c) => c.path === "/admin/approvals/a1/approve")).toBe(true));
    expect(calls.find((c) => c.path === "/admin/approvals/a1/approve")!.body).toMatchObject({ recordedAs: "ON_BEHALF_OF_CUSTOMER", sourceNote: "WhatsApp, 21 Oct" });
  });
  it("approvals: rejecting a SAMPLE needs a reason; Request sample approval only while AWAITING_APPROVAL", async () => {
    goto("approvals");
    mockApi(detailHandlers({ status: "AWAITING_APPROVAL", allowedActions: [] }, { "GET /admin/samples/s1/approvals": [approval({ id: "a4", type: "SAMPLE", artworkVersionId: null })] }));
    const a = renderWithClient(<SampleDetailPage id="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Record rejection" }));
    const dlg = await screen.findByRole("dialog");
    await userEvent.click(within(dlg).getByRole("radio", { name: /Internal staff decision/ }));
    expect(within(dlg).getByRole("button", { name: "Record rejection" })).toBeDisabled();
    await userEvent.type(within(dlg).getByLabelText(/Reason/), "colour is off");
    expect(within(dlg).getByRole("button", { name: "Record rejection" })).toBeEnabled();
    a.unmount();
    mockApi(detailHandlers({ status: "AWAITING_APPROVAL", allowedActions: [] }));
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByRole("button", { name: "Request sample approval" })).toBeInTheDocument();
  });
  it("approvals: no decision buttons without approvals.manage", async () => {
    perms = ["samples.read"]; goto("approvals");
    mockApi(detailHandlers({}, { "GET /admin/samples/s1/approvals": [approval()] }));
    renderWithClient(<SampleDetailPage id="s1" />);
    await screen.findByTestId("approvals");
    expect(screen.queryByRole("button", { name: /Record|Cancel request/ })).not.toBeInTheDocument();
  });
  it("terms: shows the version, records acceptance as staff-recorded with a source note", async () => {
    goto("specification");
    const calls = mockApi(detailHandlers({}, { "POST /admin/samples/s1/terms-acceptances": json(201, {}) }));
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByRole("region", { name: "Terms text" })).toHaveTextContent("Be nice.");
    expect(screen.getAllByText(/version 1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Recorded by staff on the customer's behalf/)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Record acceptance of v1" });
    expect(btn).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/How was it accepted/), "WhatsApp 21 Oct");
    await userEvent.click(screen.getByRole("checkbox", { name: /customer accepted Sample terms version 1/ }));
    await userEvent.click(btn);
    await waitFor(() => expect(calls.some((c) => c.path === "/admin/samples/s1/terms-acceptances")).toBe(true));
    expect(calls.find((c) => c.path === "/admin/samples/s1/terms-acceptances")!.body).toEqual({ sourceNote: "WhatsApp 21 Oct", termsVersionId: "t1" });
  });
  it("terms: accepted version shows who/how; older acceptance is flagged", async () => {
    goto("specification");
    mockApi(detailHandlers({ termsAcceptances: [{ id: "ta1", termsVersionId: "old", code: "SAMPLE_TERMS", version: 0, title: "Sample terms", mode: "STAFF_RECORDED_ON_BEHALF", sourceNote: "call", acceptedAt: "2026-09-01T10:00:00Z" }] }));
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByText(/older version/)).toBeInTheDocument();
    expect(screen.getByTestId("terms-acceptances")).toHaveTextContent("Source: call");
  });
  it("terms fall back to the configurator when /admin/terms is forbidden", async () => {
    goto("specification");
    mockApi(detailHandlers({}, { "GET /admin/terms": json(403, { statusCode: 403, message: "Insufficient permissions" }) }));
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByText(/Sample terms/)).toBeInTheDocument();
  });
  it("files: lists attachments with type, secure download via the signed-url API, no remove on a submitted sample", async () => {
    goto("artwork");
    const calls = mockApi(detailHandlers({ status: "SUBMITTED", allowedActions: [], attachments: [{ attachmentId: "at1", assetId: "as1", type: "MOCKUP", originalName: "mock.png", mimeType: "image/png", sizeBytes: 2048 }] }, { "GET /admin/assets/as1/download-url": json(200, { url: "/api/v1/storage/local/TOKEN", expiresAt: "2026-10-21T20:00:00Z" }) }));
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderWithClient(<SampleDetailPage id="s1" />);
    const list = await screen.findByTestId("sample-files");
    expect(list).toHaveTextContent("Mockup");
    expect(screen.queryByRole("button", { name: /Remove mock.png/ })).not.toBeInTheDocument();
    expect(calls.some((c) => c.path.includes("download-url"))).toBe(false); // no URL request until the click
    await userEvent.click(within(list).getByRole("button", { name: "Download mock.png" }));
    await waitFor(() => expect(open).toHaveBeenCalledWith("http://api.test/api/v1/storage/local/TOKEN", "_blank", "noopener,noreferrer"));
    open.mockRestore();
  });
  it("files: a download failure is reported, not swallowed", async () => {
    goto("artwork");
    mockApi(detailHandlers({ attachments: [{ attachmentId: "at1", assetId: "as1", type: "REFERENCE", originalName: "ref.png", mimeType: "image/png", sizeBytes: 10 }] }, { "GET /admin/assets/as1/download-url": json(403, { statusCode: 403, message: "Insufficient permissions" }) }));
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderWithClient(<SampleDetailPage id="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Download ref.png" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Download ref.png" })).toBeEnabled());
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
  const artwork = (versions: unknown[], approvedVersionId: string | null) => ({ id: "aw1", brandId: null, sampleId: "s1", name: "Chest Logo", purpose: "FRONT_PRINT", approvedVersionId, versions, createdAt: "", archivedAt: null });
  const ver = (n: number, status: string) => ({ id: `av${n}`, artworkId: "aw1", versionNumber: n, status, asset: { id: `as${n}`, originalName: `v${n}.png`, mimeType: "image/png", sizeBytes: 100 }, notes: null, rejectionReason: status === "REJECTED" ? "too small" : null, createdAt: "2026-10-01T10:00:00Z", approvedAt: status === "APPROVED" ? "2026-10-02T10:00:00Z" : null, rejectedAt: null, supersededAt: null });
  it("artwork: versions newest first, the approved one stands out and stays; drafts can request approval", async () => {
    goto("artwork");
    const calls = mockApi(detailHandlers({}, { "GET /admin/artworks": page([artwork([ver(1, "APPROVED"), ver(2, "DRAFT"), ver(3, "REJECTED")], "av1")]), "POST /admin/samples/s1/approvals": json(201, {}) }));
    renderWithClient(<SampleDetailPage id="s1" />);
    const versions = await screen.findAllByTestId("artwork-version");
    expect(versions.map((v) => v.getAttribute("data-status"))).toEqual(["REJECTED", "DRAFT", "APPROVED"]);
    expect(screen.getByText("Approved version in use")).toBeInTheDocument();
    expect(within(versions[2]!).queryByRole("button", { name: /Request approval/ })).not.toBeInTheDocument();
    expect(screen.getByText("Rejected: too small")).toBeInTheDocument();
    await userEvent.click(within(versions[1]!).getByRole("button", { name: "Request approval" }));
    await waitFor(() => expect(calls.find((c) => c.method === "POST" && c.path === "/admin/samples/s1/approvals")?.body).toEqual({ type: "ARTWORK", artworkVersionId: "av2" }));
  });
  it("artwork: no edit controls without assets.manage + samples.manage", async () => {
    perms = ["samples.read", "assets.read"]; goto("artwork");
    mockApi(detailHandlers({}, { "GET /admin/artworks": page([artwork([ver(1, "APPROVED")], "av1")]) }));
    renderWithClient(<SampleDetailPage id="s1" />);
    await screen.findByTestId("artworks");
    expect(screen.queryByRole("button", { name: /New artwork|New version|Request approval/ })).not.toBeInTheDocument();
  });
  it("upload goes through the backend asset API (multipart) then attaches", async () => {
    mockApi({});
    const calls = mockApi({ "POST /admin/assets": json(201, asset({ id: "newasset", originalName: "ref.png", type: "REFERENCE" })), "POST /admin/samples/s1/assets": json(201, {}), ...detailHandlers() });
    const { FileUploader } = await import("@/features/samples/file-uploader");
    const { attachSampleAsset } = await import("@/features/samples/api");
    renderWithClient(<FileUploader assetType="REFERENCE" onUploaded={async (a) => { await attachSampleAsset("s1", a.id); }} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    expect(input.accept).toContain("application/pdf");
    await userEvent.upload(input, new File([new Uint8Array([1, 2, 3])], "ref.png", { type: "image/png" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/admin/samples/s1/assets")).toBe(true));
    expect(calls.find((c) => c.path === "/admin/assets")!.method).toBe("POST");
    expect(screen.getByText(/Files are stored privately/)).toBeInTheDocument();
  });
  it("upload failure shows the server's message", async () => {
    mockApi({ "POST /admin/assets": json(415, { statusCode: 415, error: "Unsupported Media Type", message: "File type not allowed" }) });
    const { FileUploader } = await import("@/features/samples/file-uploader");
    renderWithClient(<FileUploader assetType="REFERENCE" onUploaded={() => {}} />);
    await userEvent.setup({ applyAccept: false }).upload(document.querySelector("input[type=file]") as HTMLInputElement, new File(["x"], "x.svg", { type: "image/svg+xml" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("File type not allowed");
  });
});

describe("role gating", () => {
  it("QC-like role (no samples.read) has no Samples navigation and sees Access denied on sample routes", () => {
    const qc = createPermissionChecker(["jobs.read_assigned", "qc.read", "qc.perform", "quality_kpis.read", "master_data.read", "assets.read"]);
    expect(filterNav(qc).flatMap((s) => s.items.map((i) => i.label))).not.toContain("Samples");
    perms = ["qc.read"];
    renderWithClient(<RequirePermission permission="samples.manage"><p>form</p></RequirePermission>);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByText("form")).not.toBeInTheDocument();
  });
  it("SALES-like role sees Samples; New sample needs samples.manage", () => {
    expect(filterNav(createPermissionChecker(["samples.read"])).flatMap((s) => s.items.map((i) => i.label))).toContain("Samples");
    perms = ["samples.read"];
    renderWithClient(<RequirePermission permission="samples.manage"><p>form</p></RequirePermission>);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });
});
