import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { json, mockApi, orderBatch, orderDetail, orderItem, orderListItem, orderVariant, page, productionSummary, renderWithClient, sampleDetail, sampleOptions, setup } from "./helpers";

const replace = vi.fn();
const push = vi.fn();
let search = "";
let pathname = "/orders/o1";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push, back: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams(search) }));
let perms: string[] = [];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated", user: { id: "u1", name: "Sara", email: "", roles: [], permissions: perms } }),
}));

import { filterNav } from "@/features/navigation/nav-config";
import { createPermissionChecker } from "@/lib/permissions";
import { CreateOrderDialog } from "@/features/orders/create-order-dialog";
import { OrderDetailPage } from "@/features/orders/order-detail-page";
import { OrdersPage } from "@/features/orders/orders-page";
import { SampleDetailPage } from "@/features/samples/sample-detail-page";

const SALES = ["orders.read", "orders.manage", "orders.confirm", "orders.reorder", "order_batches.read", "orders.commercial.read", "orders.commercial.manage", "quotations.read", "quotations.create", "approvals.manage", "payments.read", "payments.manage", "assets.manage", "assets.read", "samples.read", "master_data.read"];
const ADMIN = [...SALES, "order_batches.manage", "factory_jobs.manage", "orders.cancel", "payments.verify"];

const commercial = (over: Record<string, unknown> = {}) => ({
  orderId: "o1", orderNumber: "ORD-000001", currency: "EGP", quotationNumber: "QTN-000001", quotationVersionId: "qv1", quotationStatus: "ACCEPTED", quotedTotal: "5000.00", acceptedTotal: "5000.00",
  verifiedPaid: "2000.00", pendingPayments: "0.00", remaining: "3000.00", overpaid: "0.00", reapprovalRequired: false, paymentState: "PARTIALLY_PAID", counts: { verified: 1, pending: 0, rejected: 0, cancelled: 0 },
  releaseGate: { requireAcceptedQuotation: true, requiredPaidPercent: 100, requiredPaidAmount: "5000.00", satisfied: false, reasons: ["3000.00 EGP must still be verified"] }, ...over,
});
const api = (order: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => {
  const o = orderDetail(order);
  return mockApi({
    "GET /admin/orders/o1": o, "GET /admin/samples/s1": sampleDetail({ fabric: { id: "f1", code: "M", name: "Milton" } }), "GET /configurator/sample-options": sampleOptions(),
    "GET /admin/orders/o1/production-summary": productionSummary(), "GET /admin/orders/o1/commercial": commercial(), "GET /admin/orders/o1/quotations": [], "GET /admin/orders/o1/payments": [],
    "GET /admin/orders/o1/activities": page([]), "GET /admin/orders/o1/revisions": [], ...extra,
  });
};
const tab = async (name: string) => userEvent.click(await screen.findByRole("tab", { name }));

beforeEach(() => { setup(); replace.mockClear(); push.mockClear(); search = ""; pathname = "/orders/o1"; perms = [...ADMIN]; });

describe("orders list", () => {
  it("needs orders.read; rows come from the backend; only supported params are sent (single sort, no direction); New order link needs orders.manage", async () => {
    expect(filterNav(createPermissionChecker(["orders.read"])).flatMap((s) => s.items.map((i) => i.label))).toContain("Orders");
    expect(filterNav(createPermissionChecker(["samples.read"])).flatMap((s) => s.items.map((i) => i.label))).not.toContain("Orders");
    pathname = "/orders"; search = "status=CONFIRMED,IN_PRODUCTION&delayed=true&priority=HIGH&page=2&sort=target";
    const calls = mockApi({ "GET /admin/orders": page([orderListItem()], 40) });
    renderWithClient(<OrdersPage />);
    expect(await screen.findByRole("link", { name: "ORD-000001" })).toHaveAttribute("href", "/orders/o1");
    expect(screen.getByText("Delayed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New order/ })).toHaveAttribute("href", "/orders/new"); // orders.manage
    const q = new URLSearchParams(calls[0]!.query);
    expect(Object.fromEntries(q)).toMatchObject({ status: "CONFIRMED,IN_PRODUCTION", delayed: "true", priority: "HIGH", page: "2", sort: "target" });
    expect(q.has("direction")).toBe(false);
  });
  it("403 is an error state in the app shell, not a login redirect", async () => {
    pathname = "/orders";
    mockApi({ "GET /admin/orders": json(403, { statusCode: 403, message: "Insufficient permissions" }) });
    renderWithClient(<OrdersPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Insufficient permissions");
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining("/login"));
  });
});

describe("create order from an approved sample", () => {
  it("button only for APPROVED/COMPLETED samples and orders.manage", async () => {
    pathname = "/samples/s1";
    const handlers = (status: string) => ({
      "GET /admin/samples/s1": sampleDetail({ status, allowedActions: [] }), "GET /admin/samples/s1/status-history": [], "GET /admin/terms": [], "GET /admin/artworks": page([]),
      "GET /admin/samples/s1/production-specs": [], "GET /admin/factory-jobs": page([]), "GET /configurator/sample-options": sampleOptions(), "GET /admin/samples/s1/notes": [], "GET /admin/samples/s1/approvals": [],
    });
    mockApi(handlers("APPROVED"));
    const a = renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByRole("button", { name: "Create bulk order" })).toBeInTheDocument();
    a.unmount();
    mockApi(handlers("UNDER_REVIEW"));
    const b = renderWithClient(<SampleDetailPage id="s1" />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: "Create bulk order" })).not.toBeInTheDocument();
    b.unmount();
    perms = ["samples.read"];
    mockApi(handlers("APPROVED"));
    renderWithClient(<SampleDetailPage id="s1" />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: "Create bulk order" })).not.toBeInTheDocument();
  });
  it("posts to the sample's create-order route and opens the new order", async () => {
    const calls = mockApi({ "POST /admin/samples/s1/create-order": json(201, orderDetail({ id: "newo", orderNumber: "ORD-000009" })) });
    renderWithClient(<CreateOrderDialog sample={{ id: "s1", sampleNumber: "SMP-000001" }} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toHaveTextContent(/approved reference \(never the pre-production specification\)/);
    await userEvent.type(screen.getByLabelText("Target delivery date"), "2026-12-15");
    await userEvent.click(screen.getByRole("button", { name: "Create bulk order" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/newo?tab=variants"));
    const body = calls.find((c) => c.method === "POST")!.body as Record<string, unknown>;
    expect(body).toMatchObject({ priority: "NORMAL" });
    expect(new Date(body.targetDeliveryDate as string).toISOString()).toBe(body.targetDeliveryDate);
  });
  it("an unapproved / PRE_PRODUCTION-only sample is refused by the backend and the real reason is shown", async () => {
    mockApi({ "POST /admin/samples/s1/create-order": json(409, { statusCode: 409, error: "Conflict", message: "An order needs an approved sample with an APPROVED_REFERENCE (SMP-000001 is IN_PRODUCTION)", requestId: "r5" }) });
    renderWithClient(<CreateOrderDialog sample={{ id: "s1", sampleNumber: "SMP-000001" }} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Create bulk order" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("needs an approved sample with an APPROVED_REFERENCE");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("variants and confirmation", () => {
  it("draft: saving sends the real item/variant payload (ids kept, catalogue vs custom pairs exclusive) and shows the quantity summary", async () => {
    search = "tab=variants";
    const calls = api({ items: [orderItem({ variants: [orderVariant()], quantity: 100, variantTotal: 40 })] }, { "PUT /admin/orders/o1/items": json(200, orderDetail()) });
    renderWithClient(<OrderDetailPage id="o1" />);
    const editor = await screen.findByTestId("variants-editor");
    await userEvent.click(within(editor).getByRole("tab", { name: "List" }));
    expect(within(editor).getByTestId("quantity-summary")).toHaveTextContent("Remaining60"); // 100 ordered − 40 in variants: shown, never auto-corrected
    await userEvent.click(within(editor).getByRole("button", { name: "Add variant" }));
    await userEvent.click(within(editor).getByRole("combobox", { name: "Variant 2 size" }));
    await userEvent.click(await screen.findByRole("option", { name: "M" }));
    await userEvent.click(within(editor).getByRole("combobox", { name: "Variant 2 colour" }));
    await userEvent.click(await screen.findByRole("option", { name: "Custom colour…" }));
    await userEvent.type(within(editor).getByLabelText("Variant 2 custom colour name"), "White");
    await userEvent.type(within(editor).getByLabelText("Variant 2 quantity"), "60");
    expect(within(editor).getByTestId("quantity-summary")).toHaveTextContent("Difference0");
    await userEvent.click(within(editor).getByRole("button", { name: "Save variants" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body).toEqual({ items: [{ id: "it1", quantity: 100, variants: [
      { id: "v1", sizeOptionId: "z1", customColorName: "Black", quantity: 40 }, { sizeOptionId: "s2", customColorName: "White", quantity: 60 } ] }] });
  });
  it("an order with no items starts a NEW item (no id) and quantities must be positive whole numbers", async () => {
    search = "tab=variants";
    const calls = api({ items: [] }, { "PUT /admin/orders/o1/items": json(200, orderDetail()) });
    renderWithClient(<OrderDetailPage id="o1" />);
    const editor = await screen.findByTestId("variants-editor");
    await userEvent.click(within(editor).getByRole("tab", { name: "List" }));
    await userEvent.click(within(editor).getByRole("button", { name: "Add variant" }));
    await userEvent.type(within(editor).getByLabelText("Variant 1 quantity"), "0");
    await userEvent.click(within(editor).getByRole("button", { name: "Save variants" }));
    expect(await within(editor).findAllByText(/Whole number above 0|Choose a size or a colour/)).not.toHaveLength(0);
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
  });
  it("PENDING_CONFIRMATION: review shows product, quantity, variants, target date and reference; a backend mismatch is shown exactly and nothing is changed", async () => {
    const calls = api({ status: "PENDING_CONFIRMATION", items: [orderItem({ quantity: 100, variantTotal: 90, variants: [orderVariant({ quantity: 40 }), orderVariant({ id: "v2", label: "Black / S", quantity: 50 })] })] },
      { "POST /admin/orders/o1/confirm": json(409, { statusCode: 409, error: "Conflict", message: "Item 1: the variants add up to 90 but the item quantity is 100", requestId: "r9" }) });
    renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Confirm order" }));
    const review = await screen.findByTestId("confirm-review");
    for (const t of ["Tee", "100", "Black / XS × 40", "Black / S × 50", "15 Dec 2026", "Revision 1 of SMP-000001 (read-only)"]) expect(review).toHaveTextContent(t);
    expect(review).toHaveTextContent("do not add up to the item quantity (90 vs 100)");
    await userEvent.click(within(review).getByRole("button", { name: "Confirm order" }));
    expect(await within(review).findByText("Item 1: the variants add up to 90 but the item quantity is 100")).toBeInTheDocument();
    expect(calls.filter((c) => c.method !== "GET").map((c) => c.method + " " + c.path)).toEqual(["POST /admin/orders/o1/confirm"]); // no auto-fix PUT
  });
  it("confirm needs orders.confirm and the PENDING_CONFIRMATION state; submit comes first for drafts", async () => {
    perms = ["orders.read", "orders.manage"];
    api({ status: "PENDING_CONFIRMATION" });
    const a = renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: "Confirm order" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request changes" })).toBeInTheDocument();
    a.unmount();
    api({ status: "DRAFT" });
    renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByRole("button", { name: "Submit for confirmation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm order" })).not.toBeInTheDocument();
  });
  it("confirmed: variants are frozen (no editor, explicit note, revise offered), and the approved reference + order spec are read-only", async () => {
    search = "tab=variants";
    api({ status: "CONFIRMED", confirmedAt: "2026-10-02T10:00:00Z", currentSpec: { id: "sp1", revision: 1, totalQuantity: 100, specHash: "b".repeat(64), createdAt: "2026-10-02T10:00:00Z" } });
    const a = renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByText(/frozen by the order specification/)).toBeInTheDocument();
    expect(screen.queryByTestId("variants-editor")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save variants|Add variant/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revise" })).toBeInTheDocument();
    a.unmount();
    search = "";
    api({ status: "CONFIRMED", confirmedAt: "2026-10-02T10:00:00Z", currentSpec: { id: "sp1", revision: 1, totalQuantity: 100, specHash: "b".repeat(64), createdAt: "2026-10-02T10:00:00Z" } });
    renderWithClient(<OrderDetailPage id="o1" />);
    const ref = await screen.findByTestId("approved-reference");
    expect(ref).toHaveTextContent("never on the pre-production specification");
    expect(ref).toHaveTextContent("Frozen — read only");
    expect(within(ref).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-spec")).toHaveTextContent("revision 1 is frozen");
  });
});

describe("revisions and commercial reapproval", () => {
  it("revision requires a reason and goes to /revise (never PATCH); a backend refusal (batches exist) is shown as-is", async () => {
    const calls = api({ status: "READY_FOR_PRODUCTION", confirmedAt: "2026-10-02T10:00:00Z" }, { "POST /admin/orders/o1/revise": json(409, { statusCode: 409, error: "Conflict", message: "The order already has batches or factory jobs; cancel them before changing quantities or variants" }) });
    renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Revise" }));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByRole("button", { name: "Record revision" })).toBeDisabled();
    await userEvent.type(within(dlg).getByLabelText(/Reason for the revision/), "customer wants more");
    await userEvent.clear(within(dlg).getByLabelText("Internal notes"));
    await userEvent.type(within(dlg).getByLabelText("Internal notes"), "updated");
    await userEvent.click(within(dlg).getByRole("button", { name: "Record revision" }));
    expect(await within(dlg).findByText(/cancel them before changing quantities or variants/)).toBeInTheDocument();
    expect(calls.find((c) => c.path === "/admin/orders/o1/revise")!.body).toMatchObject({ reason: "customer wants more", internalNotes: "updated" });
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });
  it("history lists revisions newest first; a commercially relevant one says quotations no longer apply and why", async () => {
    search = "tab=history";
    api({}, { "GET /admin/orders/o1/revisions": [
      { id: "r1", revisionNumber: 2, reason: "added 100 units", previousSnapshot: {}, specId: "s", createdByUserId: "u", commercialImpact: true, commercialChanges: ["Total quantity 500 → 600"], createdAt: "2026-10-05T10:00:00Z" },
      { id: "r0", revisionNumber: 3, reason: "new date", previousSnapshot: {}, specId: "s", createdByUserId: "u", commercialImpact: false, commercialChanges: [], createdAt: "2026-10-06T10:00:00Z" }],
    "GET /admin/orders/o1/activities": page([{ id: "a1", type: "COMMERCIAL_REAPPROVAL_REQUIRED", message: "x", actorUserId: null, actorName: null, metadata: null, createdAt: "2026-10-05T10:01:00Z" }]) });
    renderWithClient(<OrderDetailPage id="o1" />);
    const list = await screen.findByTestId("revisions");
    const items = within(list).getAllByRole("listitem").filter((i) => i.hasAttribute("data-impact"));
    expect(items.map((i) => i.getAttribute("data-impact"))).toEqual(["false", "true"]); // rev 3 first
    expect(items[1]).toHaveTextContent("Quotations accepted before this revision no longer apply");
    expect(items[1]).toHaveTextContent("Total quantity 500 → 600");
    expect(screen.getByTestId("activity")).toHaveTextContent("Commercial reapproval required");
  });
  it("after a revision ended the accepted quotation: reapproval banner, old quote kept as history and not current, verified payments still credited", async () => {
    search = "tab=commercial";
    const ended = { id: "qv1", quotationId: "q1", versionNumber: 1, status: "SUPERSEDED", currency: "EGP", subtotal: "5000.00", discount: "0.00", taxPercent: "0.00", tax: "0.00", total: "5000.00", notes: null, validUntil: null, createdAt: "2026-10-02T10:00:00Z", sentAt: "2026-10-02T10:00:00Z", acceptedAt: "2026-10-03T10:00:00Z", rejectedAt: null, expiredAt: null, supersededAt: "2026-10-05T10:00:00Z", orderRevision: 1, invalidatedAt: "2026-10-05T10:00:00Z", invalidatedByRevision: 2, invalidationReason: "Order revision 2 changed the quantities", lineItems: [] };
    api({ status: "CONFIRMED", confirmedAt: "x" }, {
      "GET /admin/orders/o1/commercial": commercial({ quotationStatus: "SUPERSEDED", acceptedTotal: null, reapprovalRequired: true, remaining: null, verifiedPaid: "2000.00", paymentState: "PARTIALLY_PAID" }),
      "GET /admin/orders/o1/quotations": [{ id: "q1", quotationNumber: "QTN-000001", sampleId: null, orderId: "o1", status: "SUPERSEDED", currency: "EGP", createdAt: "x", currentVersion: ended, versions: [ended] }],
    });
    renderWithClient(<OrderDetailPage id="o1" />);
    const box = await screen.findByTestId("commercial-summary");
    expect(within(box).getByRole("alert")).toHaveTextContent("Commercial reapproval required");
    expect(within(box).getByText("Verified paid").nextSibling).toHaveTextContent("EGP 2,000.00");
    await userEvent.click(screen.getByRole("tab", { name: "Quotation" }));
    const v = await screen.findByTestId("quotation-version");
    expect(v).toHaveAttribute("data-current", "false");
    expect(v).toHaveTextContent("Ended by revision 2");
    expect(screen.getByTestId("reapproval")).toHaveTextContent("EGP 5,000.00");
  });
});

describe("order commercial reuses the Phase 2C components", () => {
  it("quotation create / acceptance / payment use the ORDER routes; the flat order summary is understood", async () => {
    search = "tab=commercial";
    const q = { id: "q1", quotationNumber: "QTN-000001", sampleId: null, orderId: "o1", status: "SENT", currency: "EGP", createdAt: "x", currentVersion: null as unknown, versions: [] as unknown[] };
    const v = { id: "qv1", quotationId: "q1", versionNumber: 1, status: "SENT", currency: "EGP", subtotal: "5000.00", discount: "0.00", taxPercent: "0.00", tax: "0.00", total: "5000.00", notes: null, validUntil: null, createdAt: "2026-10-02T10:00:00Z", sentAt: "2026-10-02T10:00:00Z", acceptedAt: null, rejectedAt: null, expiredAt: null, supersededAt: null, orderRevision: 1, invalidatedAt: null, invalidatedByRevision: null, invalidationReason: null, lineItems: [] };
    q.currentVersion = v; q.versions = [v];
    const calls = api({ status: "CONFIRMED", confirmedAt: "x" }, {
      "GET /admin/orders/o1/quotations": [q], "POST /admin/order-quotation-versions/qv1/accept": json(200, { ...v, status: "ACCEPTED" }),
      "GET /admin/orders/o1/commercial": commercial({ quotationStatus: "ACCEPTED" }), "POST /admin/orders/o1/payments": json(201, {}),
    });
    renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByTestId("release-gate")).toHaveTextContent("Production cannot be released yet. 3000.00 EGP must still be verified");
    await userEvent.click(screen.getByRole("tab", { name: "Quotation" }));
    await userEvent.click(await screen.findByRole("button", { name: "Record customer acceptance" }));
    const dlg = await screen.findByRole("dialog");
    await userEvent.type(within(dlg).getByLabelText(/Source \/ evidence/), "WhatsApp");
    await userEvent.click(within(dlg).getByRole("button", { name: "Record acceptance" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/admin/order-quotation-versions/qv1/accept")).toBe(true)); // not the sample route
    expect(calls.some((c) => c.path === "/admin/quotation-versions/qv1/accept")).toBe(false);
    await userEvent.click(screen.getByRole("tab", { name: "Payments" }));
    await userEvent.click(await screen.findByRole("button", { name: "Add payment" })); // enabled: the accepted order quotation was recognised
    expect(await screen.findByRole("dialog")).toHaveTextContent("Add payment");
  });
  it("order payments: finance may verify, SALES may not; verification posts to the shared payment route", async () => {
    search = "tab=commercial";
    const pay = { id: "p1", paymentNumber: "PAY-000001", sampleId: null, orderId: "o1", quotationVersionId: "qv1", amount: "2000.00", currency: "EGP", method: "CASH", status: "SUBMITTED", transactionReference: null, proof: null, receivedAt: null, verifiedAt: null, verifiedByUserId: null, rejectionReason: null, createdByUserId: "u9", createdAt: "x", updatedAt: "x" };
    const calls = api({ status: "CONFIRMED", confirmedAt: "x" }, { "GET /admin/orders/o1/payments": [pay], "POST /admin/payments/p1/verify": json(200, { ...pay, status: "VERIFIED" }) });
    const a = renderWithClient(<OrderDetailPage id="o1" />);
    await tab("Payments").catch(() => {});
    await userEvent.click(await screen.findByRole("tab", { name: "Payments" }));
    await userEvent.click(await screen.findByRole("button", { name: "Verify payment" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/payments/p1/verify")).toBe(true));
    a.unmount();
    perms = [...SALES];
    api({ status: "CONFIRMED", confirmedAt: "x" }, { "GET /admin/orders/o1/payments": [pay] });
    renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("tab", { name: "Payments" }));
    await screen.findByTestId("payments");
    expect(screen.queryByRole("button", { name: /Verify payment|Reject payment/ })).not.toBeInTheDocument();
  });
  it("403 on the commercial summary shows a restricted state: no zeros, no fake values; the tab is hidden without orders.commercial.read", async () => {
    search = "tab=commercial";
    api({ status: "CONFIRMED", confirmedAt: "x" }, { "GET /admin/orders/o1/commercial": json(403, { statusCode: 403, message: "Insufficient permissions" }) });
    const a = renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByText(/not available to your role/)).toBeInTheDocument();
    expect(screen.queryByTestId("commercial-summary")).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.00/)).not.toBeInTheDocument();
    a.unmount();
    perms = ["orders.read", "order_batches.read"];
    api({ status: "CONFIRMED", confirmedAt: "x" });
    renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("tab", { name: "Commercial" })).not.toBeInTheDocument();
  });
});

describe("batches and factory jobs", () => {
  const confirmed = { status: "READY_FOR_PRODUCTION", confirmedAt: "x", items: [orderItem({ variants: [orderVariant({ allocatedQuantity: 30 }), orderVariant({ id: "v2", label: "Black / S", quantity: 60, allocatedQuantity: 20 })] })] };
  it("new batch: only allocated variants are sent with ISO dates; the table shows ordered / other batches / remaining", async () => {
    search = "tab=batches";
    const calls = api(confirmed, { "POST /admin/orders/o1/batches": json(201, orderBatch()) });
    renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "New batch" }));
    const dlg = await screen.findByRole("dialog");
    const rows = within(dlg).getAllByTestId("alloc-row");
    expect(rows[0]).toHaveTextContent(/^Black \/ XS403010$/); // ordered 40, 30 in other batches, 10 remaining
    await userEvent.type(within(dlg).getByLabelText("Black / XS units in this batch"), "10");
    expect(rows[0]).toHaveTextContent(/^Black \/ XS40300$/); // 10 allocated here -> 0 remaining
    await userEvent.type(within(dlg).getByLabelText("Target start"), "2026-11-01");
    await userEvent.click(within(dlg).getByRole("button", { name: "Create batch" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/orders/o1/batches")).toBe(true));
    const body = calls.find((c) => c.path === "/admin/orders/o1/batches" && c.method === "POST")!.body as { allocations: unknown[]; targetStartDate: string };
    expect(body.allocations).toEqual([{ orderVariantId: "v1", quantity: 10 }]);
    expect(new Date(body.targetStartDate).toISOString()).toBe(body.targetStartDate);
  });
  it("over-allocation: the backend message is shown and nothing is auto-corrected", async () => {
    search = "tab=batches";
    api(confirmed, { "POST /admin/orders/o1/batches": json(409, { statusCode: 409, error: "Conflict", message: "Over-allocation: variant has 40 units, 30 already in other batches, 10 left, 30 requested", requestId: "r1" }) });
    renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "New batch" }));
    const dlg = await screen.findByRole("dialog");
    await userEvent.type(within(dlg).getByLabelText("Black / XS units in this batch"), "30");
    await userEvent.click(within(dlg).getByRole("button", { name: "Create batch" }));
    expect(await within(dlg).findByText(/Over-allocation: variant has 40 units/)).toBeInTheDocument();
    expect(within(dlg).getByLabelText("Black / XS units in this batch")).toHaveValue("30");
  });
  it("batch actions: edit allocations only while PLANNED; job creation needs factory_jobs.manage and a READY batch without a job", async () => {
    search = "tab=batches";
    api({ ...confirmed, batches: [orderBatch({ status: "PLANNED" }), orderBatch({ id: "b2", batchNumber: "BAT-000002", status: "READY" }), orderBatch({ id: "b3", batchNumber: "BAT-000003", status: "READY", job: { id: "j1", jobNumber: "JOB-000001", sourceType: "ORDER_BATCH", status: "PLANNED", orderBatchId: "b3", batchNumber: "BAT-000003", plannedQuantity: 50, completedQuantity: 0, rejectedQuantity: 0 } })] });
    const a = renderWithClient(<OrderDetailPage id="o1" />);
    const items = await screen.findAllByRole("listitem").then((l) => l.filter((i) => i.getAttribute("data-status")));
    expect(within(items[0]!).getByRole("button", { name: "Edit allocations" })).toBeInTheDocument();
    expect(within(items[0]!).queryByRole("button", { name: "Create factory job" })).not.toBeInTheDocument();
    expect(within(items[1]!).queryByRole("button", { name: "Edit allocations" })).not.toBeInTheDocument();
    expect(within(items[1]!).getByRole("button", { name: "Create factory job" })).toBeInTheDocument();
    expect(within(items[2]!).queryByRole("button", { name: "Create factory job" })).not.toBeInTheDocument();
    expect(within(items[2]!).getByRole("link", { name: "JOB-000001" })).toHaveAttribute("href", "/production/jobs/j1");
    a.unmount();
    perms = [...SALES]; // no order_batches.manage / factory_jobs.manage
    api({ ...confirmed, batches: [orderBatch({ status: "READY" })] });
    renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findByTestId("batches");
    expect(screen.queryByRole("button", { name: /New batch|Create factory job|Mark ready|Cancel/ })).not.toBeInTheDocument();
  });
  it("batch job creation posts to the batch route", async () => {
    search = "tab=batches";
    const calls = api({ ...confirmed, batches: [orderBatch({ status: "READY" })] }, { "POST /admin/order-batches/b1/create-factory-job": json(201, { id: "j1", jobNumber: "JOB-000001" }) });
    renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Create factory job" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Create factory job" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/order-batches/b1/create-factory-job")).toBe(true));
    expect(calls.some((c) => c.path === "/admin/orders/o1/create-factory-job")).toBe(false);
  });
  it("whole-order job: offered only when READY_FOR_PRODUCTION with no batches/jobs; posts to the order route", async () => {
    search = "tab=production";
    const calls = api({ status: "READY_FOR_PRODUCTION", confirmedAt: "x" }, { "POST /admin/orders/o1/create-factory-job": json(201, { id: "j2", jobNumber: "JOB-000002" }) });
    const a = renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Create whole-order job" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Create factory job" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/orders/o1/create-factory-job")).toBe(true));
    a.unmount();
    api({ status: "READY_FOR_PRODUCTION", confirmedAt: "x", batches: [orderBatch()] });
    renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findByTestId("production-summary");
    expect(screen.queryByRole("button", { name: "Create whole-order job" })).not.toBeInTheDocument();
  });
});

describe("production summary and reorder", () => {
  it("shows the backend's numbers and progress (no client-side percentage)", async () => {
    search = "tab=production";
    api({ status: "IN_PRODUCTION", confirmedAt: "x" }, { "GET /admin/orders/o1/production-summary": productionSummary({ jobs: [{ jobId: "j1", jobNumber: "JOB-000007", status: "IN_PROGRESS", batchNumber: null, plannedQuantity: 500, completedQuantity: 320, rejectedQuantity: 4, currentStage: { stageCode: "SEWING", stageName: "Sewing", status: "IN_PROGRESS", required: 496, accounted: 320, isDelayed: false }, activeStages: [], blockedStages: [], delayedStages: [] }], blockedStages: [{ stageCode: "PRINT", stageName: "Printing", status: "BLOCKED", required: 100, accounted: 0, isDelayed: true }] }) });
    renderWithClient(<OrderDetailPage id="o1" />);
    const box = await screen.findByTestId("production-summary");
    expect(box).toHaveTextContent("64.5%"); // straight from progressPercent
    for (const [label, n] of [["Planned", "500"], ["Completed", "320"], ["Remaining", "176"], ["Rework (open)", "12"], ["Rejected", "4"]] as const) expect(within(box).getByText(label).nextSibling).toHaveTextContent(n);
    expect(within(box).getByTestId("jobs")).toHaveTextContent("JOB-000007");
    expect(box).toHaveTextContent("Sewing (320/496)");
    expect(box).toHaveTextContent("Printing (0/100)");
  });
  it("reorder creates a NEW order (POST /reorder), opens it, and never touches the original; major-change refusals are shown", async () => {
    const calls = api({ status: "READY_FOR_PRODUCTION", confirmedAt: "x" }, { "POST /admin/orders/o1/reorder": json(201, orderDetail({ id: "o2", orderNumber: "ORD-000002", reorderOfOrderId: "o1", reorderOfOrderNumber: "ORD-000001" })) });
    renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Reorder" }));
    const dlg = await screen.findByRole("dialog");
    expect(dlg).toHaveTextContent("does not copy payments, quotations, jobs, batches or shipments");
    await userEvent.click(within(dlg).getByRole("button", { name: "Create reorder" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/o2"));
    expect(calls.find((c) => c.path === "/admin/orders/o1/reorder")!.body).toEqual({ cloneItems: true });
    expect(calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.path}`)).toEqual(["POST /admin/orders/o1/reorder"]); // original untouched
  });
  it("reorder refused by the backend (needs a new sample) shows the real message", async () => {
    api({ status: "READY_FOR_PRODUCTION", confirmedAt: "x" }, { "POST /admin/orders/o1/reorder": json(400, { statusCode: 400, error: "Bad Request", message: ["property fabricId should not exist"] }) });
    renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Reorder" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Create reorder" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("property fabricId should not exist");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("lifecycle gating (permission + state; the backend validates)", () => {
  it("hold/cancel need a reason and use their action routes; cancel needs orders.cancel; SALES gets no cancel", async () => {
    const calls = api({ status: "READY_FOR_PRODUCTION", confirmedAt: "x" }, { "POST /admin/orders/o1/hold": json(200, orderDetail({ status: "ON_HOLD" })) });
    const a = renderWithClient(<OrderDetailPage id="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Put on hold" }));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByRole("button", { name: "Put on hold" })).toBeDisabled();
    await userEvent.type(within(dlg).getByLabelText(/Reason/), "waiting for fabric");
    await userEvent.click(within(dlg).getByRole("button", { name: "Put on hold" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/admin/orders/o1/hold")?.body).toEqual({ reason: "waiting for fabric" }));
    expect(screen.getByRole("button", { name: "Cancel order" })).toBeInTheDocument();
    a.unmount();
    perms = [...SALES];
    api({ status: "READY_FOR_PRODUCTION", confirmedAt: "x" });
    renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
  });
  it("order 404 / 403 are explicit states in the shell", async () => {
    mockApi({ "GET /admin/orders/o1": json(403, { statusCode: 403, message: "Insufficient permissions" }) });
    const a = renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    a.unmount();
    mockApi({ "GET /admin/orders/o1": json(404, { statusCode: 404, error: "Not Found", message: "Order not found" }) });
    renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByText("Order not found", { selector: "h3" })).toBeInTheDocument();
  });
});
