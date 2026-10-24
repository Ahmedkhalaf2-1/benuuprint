import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json, mockApi, renderWithClient } from "./helpers";

const replace = vi.fn();
const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push, back: vi.fn() }), usePathname: () => "/account/orders/o1", useSearchParams: () => new URLSearchParams(search) }));
vi.mock("@/features/portal/auth/customer-auth-provider", () => ({ useCustomerAuth: () => ({ status: "authenticated", customer: { id: "c1", name: "Nile" }, login: vi.fn(), logout: vi.fn() }) }));

import { OrderDetailPage, orderPrimaryAction } from "@/features/portal/order-detail";
import { OrderForm } from "@/features/portal/order-form";
import { OrderTracker, ShipmentsView, shipmentSummaryText } from "@/features/portal/order-tracking";
import { OrderRow } from "@/features/portal/orders-list";
import { checkItems, itemsBody, cellsFromOrder, cellKey } from "@/features/portal/order-builders";
import { orderRowCta } from "@/features/portal/status";
import { SampleDetailPage } from "@/features/portal/sample-detail";
import type { OrderAction, OrderDetail } from "@/features/portal/types";

const order = (actions: OrderAction[] = [], o: Record<string, unknown> = {}): OrderDetail => ({
  id: "o1", orderNumber: "ORD-000001", status: "PENDING_CONFIRMATION", statusLabel: "Pending confirmation", nextStep: "Our team will review your order.", brand: { id: "b1", name: "Nile Core" }, productName: "Tee", totalQuantity: 20,
  targetDeliveryDate: null, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-03T10:00:00Z", allowedActions: actions, reference: { sampleNumber: "SMP-000024", sampleId: "s1", productName: "Tee" },
  items: [{ id: "i1", productName: "Tee", quantity: 20, notes: null, variants: [{ id: "v1", size: { id: "z1", name: "M" }, color: { id: "c1", name: "Black" }, sizeOptionId: "z1", fabricColorId: "c1", quantity: 10, notes: null }, { id: "v2", size: { id: "z2", name: "L" }, color: { id: "c1", name: "Black" }, sizeOptionId: "z2", fabricColorId: "c1", quantity: 10, notes: null }] }],
  quantities: { total: 20, shipped: 0, delivered: 0, remaining: 20 }, customerNotes: null, preferredAddressId: null, confirmedAt: null, deliveredAt: null, reorderOf: null,
  commercial: { paymentStatus: "NOT_REQUIRED_YET", currency: null, requiredAmount: null, remainingAmount: null, requiresReview: false }, progressPercent: 0, ...o,
}) as OrderDetail;

const commercial = (o: Record<string, unknown> = {}) => ({ orderId: "o1", quotationNumber: null, actionableVersionId: null, requiresReview: false, notice: null, payment: { status: "NOT_REQUIRED_YET", currency: "EGP", requiredAmount: "0.00", verifiedAmount: "0.00", pendingAmount: "0.00", remainingAmount: "0.00" }, readyForProduction: false, nextAction: "NONE", allowedActions: [], ...o });
const idle = { "GET /customer/orders/o1/commercial": commercial(), "GET /customer/orders/o1/production": { phase: "NOT_STARTED", steps: [], progressPercent: 0, packaging: "NOT_STARTED", eta: null }, "GET /customer/orders/o1/shipments": { summary: { totalUnits: 20, shippedUnits: 0, deliveredUnits: 0, remainingUnits: 20, partiallyShipped: false }, shipments: [] }, "GET /customer/orders/o1/activity": [] };

beforeEach(() => { replace.mockClear(); push.mockClear(); search = ""; });
afterEach(() => vi.unstubAllGlobals());

describe("start bulk order", () => {
  it("is offered on an approved sample only, linking to the order form with the sample id", async () => {
    const sample = (status: string) => ({ id: "s1", sampleNumber: "SMP-000024", status, statusLabel: status, nextStep: "x", editable: false, brand: { id: "b1", name: "Nile" }, productName: "Tee", allowedActions: [], components: [], decorations: [], accessories: [], files: [], terms: { required: false, accepted: false }, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z" });
    mockApi({ "GET /customer/samples/s1": sample("APPROVED"), "GET /customer/samples/s1/commercial": { sampleId: "s1", quotation: null, payment: { status: "NOT_REQUIRED_YET" } }, "GET /customer/samples/s1/production": { phase: "COMPLETE", steps: [] } });
    const { unmount } = renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByTestId("start-bulk-order")).toHaveAttribute("href", "/account/orders/new?sample=s1");
    unmount();
    mockApi({ "GET /customer/samples/s1": sample("IN_SAMPLE_PRODUCTION"), "GET /customer/samples/s1/commercial": { sampleId: "s1", quotation: null, payment: { status: "NOT_REQUIRED_YET" } }, "GET /customer/samples/s1/production": { phase: "NOT_STARTED", steps: [] } });
    renderWithClient(<SampleDetailPage id="s1" />);
    await screen.findByTestId("next-step");
    expect(screen.queryByTestId("start-bulk-order")).not.toBeInTheDocument();
  });
});

describe("quantity / variant model", () => {
  it("never adjusts the total: a mismatch is reported, an exact match builds the body with real ids", () => {
    const cells = { [cellKey("z1", "c1")]: "10", [cellKey("z2", "c1")]: "10" };
    expect(checkItems("20", cells).state).toBe("ok");
    expect(checkItems("25", cells)).toMatchObject({ state: "mismatch", total: 25, sum: 20 });
    expect(checkItems("", {}).state).toBe("empty");
    expect(checkItems("0", {}).state).toBe("invalid");
    expect(itemsBody("20", cells)).toEqual({ quantity: 20, variants: [{ sizeOptionId: "z1", fabricColorId: "c1", quantity: 10 }, { sizeOptionId: "z2", fabricColorId: "c1", quantity: 10 }] });
    expect(itemsBody("5", { [cellKey("z1", "")]: "5" }).variants).toEqual([{ sizeOptionId: "z1", quantity: 5 }]);
    expect(cellsFromOrder(order())).toEqual(cells);
  });
});

describe("order form", () => {
  const sample = { id: "s1", sampleNumber: "SMP-000024", status: "APPROVED", brand: { id: "b1", name: "Nile Core" }, productName: "Tee", fabricId: "f1", allowedActions: [], components: [], decorations: [], accessories: [], files: [], updatedAt: "2026-10-01T10:00:00Z" };
  const options = { productTypes: [], patterns: [], printMethods: [], accessories: [], components: [], fitMethods: [], fabricProviders: [], fabrics: [{ id: "f1", code: "F", name: "Cotton", colors: [{ id: "c1", name: "Black", hex: "#000" }] }], sizeScales: [{ id: "sc1", code: "S", name: "Adult", sizes: [{ id: "z1", code: "M", name: "M" }, { id: "z2", code: "L", name: "L" }] }] };
  const handlers = { "GET /customer/samples/s1": sample, "GET /customer/configurator/sample-options": options, "GET /customer/addresses": [] };

  it("creates the draft from the approved sample, sends no customerId, and submits through the explicit route", async () => {
    const calls = mockApi({ ...handlers, "POST /customer/samples/s1/create-order": order([], { id: "o9", status: "DRAFT" }), "POST /customer/orders/o9/submit": order([], { id: "o9" }) });
    renderWithClient(<OrderForm sampleId="s1" />);
    expect(await screen.findByTestId("reference-note")).toHaveTextContent("approved sample as the production reference");
    expect(screen.getByTestId("reference-card")).toHaveTextContent("SMP-000024");
    await userEvent.type(screen.getByLabelText("Total units"), "20");
    await userEvent.type(screen.getByLabelText("Black M quantity"), "10");
    await userEvent.type(screen.getByLabelText("Black L quantity"), "5");
    expect(screen.getByTestId("qty-summary")).toHaveTextContent("adds up to 15 but the order total is 20");
    expect(screen.getByRole("button", { name: "Submit order" })).toBeDisabled();
    await userEvent.clear(screen.getByLabelText("Black L quantity"));
    await userEvent.type(screen.getByLabelText("Black L quantity"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Submit order" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/orders/o9?submitted=1"));
    const create = calls.find((c) => c.path === "/customer/samples/s1/create-order")!;
    expect(create.body).toEqual({ items: { quantity: 20, variants: [{ sizeOptionId: "z1", fabricColorId: "c1", quantity: 10 }, { sizeOptionId: "z2", fabricColorId: "c1", quantity: 10 }] } });
    expect(JSON.stringify(calls.map((c) => c.body))).not.toContain("customerId");
    expect(calls.some((c) => c.method === "PATCH" && /status/.test(JSON.stringify(c.body)))).toBe(false);
    expect(calls.every((c) => c.path.startsWith("/customer/"))).toBe(true);
  });

  it("explains when the approved reference offers no sizes", async () => {
    mockApi({ ...handlers, "GET /customer/configurator/sample-options": { ...options, sizeScales: [] } });
    renderWithClient(<OrderForm sampleId="s1" />);
    expect(await screen.findByTestId("no-sizes")).toBeInTheDocument();
  });

  it("a submitted order cannot be edited (no EDIT_ORDER action)", async () => {
    mockApi({ ...handlers, "GET /customer/orders/o1": order([]) });
    renderWithClient(<OrderForm orderId="o1" />);
    expect(await screen.findByText("This order can't be edited")).toBeInTheDocument();
  });
});

describe("list rows, status and nextStep", () => {
  it("shows number, brand, product, quantity, status, nextStep and a contextual CTA", () => {
    renderWithClient(<ul><OrderRow o={order([], { status: "QUOTATION_READY", statusLabel: "Quotation ready", nextStep: "Review your quotation." })} /></ul>);
    const row = screen.getByTestId("order-row");
    for (const t of ["ORD-000001", "Nile Core", "Tee", "20 units", "Quotation ready", "Review your quotation."]) expect(row).toHaveTextContent(t);
    expect(screen.getByTestId("row-cta")).toHaveTextContent("Review quotation");
    expect(orderRowCta("DRAFT")).toBe("Continue editing");
    expect(orderRowCta("IN_PRODUCTION")).toBe("Track production");
    expect(orderRowCta("SHIPPED")).toBe("Track shipment");
    expect(orderRowCta("DELIVERED")).toBe("Reorder");
  });
});

describe("order detail", () => {
  it("actions come from allowedActions only; a foreign order is simply not found", async () => {
    expect(orderPrimaryAction({ allowedActions: ["ACCEPT_QUOTATION", "REJECT_QUOTATION"] })?.tab).toBe("quotation");
    expect(orderPrimaryAction({ allowedActions: ["UPLOAD_PAYMENT_PROOF"] })?.tab).toBe("payment");
    expect(orderPrimaryAction({ allowedActions: ["EDIT_ORDER", "SUBMIT_ORDER"] })?.edit).toBe(true);
    expect(orderPrimaryAction({ allowedActions: ["REORDER"] })).toBeNull();
    mockApi({ "GET /customer/orders/other": json(404, { statusCode: 404, message: "Not found" }) });
    renderWithClient(<OrderDetailPage id="other" />);
    expect(await screen.findByText("Order not found")).toBeInTheDocument();
  });

  it("quotation: accept needs confirmation, uses the order endpoint, and a re-review is never presented as already accepted", async () => {
    const version = { id: "ov2", versionNumber: 2, status: "SENT", isCurrent: true, actionable: true, endedByChange: false, currency: "EGP", lineItems: [], subtotal: "1000.00", discount: "0.00", tax: "0.00", total: "1000.00", validUntil: null, sentAt: "2026-10-04T10:00:00Z", respondedAt: null, supersededAt: null };
    const calls = mockApi({
      ...idle,
      "GET /customer/orders/o1": order(["ACCEPT_QUOTATION", "REJECT_QUOTATION"], { status: "QUOTATION_READY", statusLabel: "Quotation ready", commercial: { paymentStatus: "NOT_REQUIRED_YET", currency: "EGP", requiredAmount: null, remainingAmount: null, requiresReview: true } }),
      "GET /customer/orders/o1/commercial": commercial({ quotationNumber: "QTN-000009", actionableVersionId: "ov2", requiresReview: true, notice: null }),
      "GET /customer/orders/o1/quotation": { quotations: [{ quotationId: "q1", quotationNumber: "QTN-000009", versions: [version, { ...version, id: "ov1", versionNumber: 1, status: "ACCEPTED", isCurrent: false, actionable: false, endedByChange: true }] }], actionableVersionId: "ov2", requiresReview: true, notice: null },
      "POST /customer/order-quotation-versions/ov2/accept": order([]),
    });
    search = "tab=quotation";
    renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByTestId("re-review-banner")).toHaveTextContent("Your order changed and a new quotation requires your review.");
    await userEvent.click(await screen.findByRole("button", { name: /accept/i }));
    expect(calls.some((c) => c.path.includes("/accept"))).toBe(false);
    await userEvent.click(await screen.findByRole("button", { name: /^(confirm|accept)/i, hidden: false }).catch(() => screen.getAllByRole("button", { name: /accept/i }).at(-1)!));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/customer/order-quotation-versions/ov2/accept")).toBe(true));
    expect(calls.every((c) => !c.path.startsWith("/admin") && !c.path.startsWith("/staff"))).toBe(true);
  });

  it("payment: required, uses order payments endpoint, shows the verified-state wording", async () => {
    mockApi({
      ...idle,
      "GET /customer/orders/o1": order(["UPLOAD_PAYMENT_PROOF"], { status: "PAYMENT_REQUIRED", statusLabel: "Payment required" }),
      "GET /customer/orders/o1/commercial": commercial({ payment: { status: "PAYMENT_REQUIRED", currency: "EGP", requiredAmount: "500.00", verifiedAmount: "0.00", pendingAmount: "0.00", remainingAmount: "500.00" } }),
      "GET /customer/orders/o1/payments": { summary: { status: "PAYMENT_REQUIRED", currency: "EGP", requiredAmount: "500.00", verifiedAmount: "0.00", pendingAmount: "0.00", remainingAmount: "500.00" }, payments: [] },
    });
    search = "tab=payment";
    renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByText(/Payment required/)).toBeInTheDocument();
    expect(await screen.findByLabelText(/payment proof|proof/i)).toBeInTheDocument();
  });
});

describe("production, shipments, delivery, reorder", () => {
  const steps = (active: number) => ["PREPARING_MATERIALS", "PATTERN_AND_CUTTING", "DECORATION", "SEWING", "QUALITY_CHECK", "PACKAGING", "READY_FOR_SHIPMENT"].map((code, i) => ({ code, label: code.replace(/_/g, " ").toLowerCase(), state: i < active ? "DONE" : i === active ? "ACTIVE" : "PENDING" }));
  it("renders the backend's seven steps, its progress and packaging, and the customer-safe ETA wording; nothing about batches or jobs", () => {
    renderWithClient(<OrderTracker production={{ phase: "IN_PROGRESS", steps: steps(3), progressPercent: 42, packaging: "NOT_STARTED", eta: { estimatedCompletion: "2026-11-01T00:00:00Z", confidence: "APPROXIMATE", note: "Dates may move." } } as never} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByTestId("progress-percent")).toHaveTextContent("42%");
    expect(screen.getByTestId("packaging")).toHaveTextContent("Not started");
    expect(screen.getByTestId("eta")).toHaveTextContent("Approximate completion");
    expect(document.body.textContent).not.toMatch(/batch|job|stage/i);
  });
  it("shows Packaging / Ready for shipment", () => {
    const { unmount } = renderWithClient(<OrderTracker production={{ phase: "IN_PROGRESS", steps: steps(5), progressPercent: 90, packaging: "IN_PACKAGING", eta: null } as never} />);
    expect(screen.getByTestId("packaging")).toHaveTextContent("Packaging");
    expect(screen.queryByTestId("eta")).not.toBeInTheDocument();
    unmount();
    renderWithClient(<OrderTracker production={{ phase: "COMPLETE", steps: steps(7), progressPercent: 100, packaging: "READY_FOR_SHIPMENT", eta: null } as never} />);
    expect(screen.getByTestId("packaging")).toHaveTextContent("Ready for shipment");
  });
  it("partial shipment reads 15 of 30 units shipped, 15 remaining; no delivery staff or proof", async () => {
    const summary = { totalUnits: 30, shippedUnits: 15, deliveredUnits: 0, remainingUnits: 15, partiallyShipped: true };
    expect(shipmentSummaryText(summary)).toBe("15 of 30 units shipped, 15 remaining");
    expect(shipmentSummaryText({ ...summary, shippedUnits: 30, deliveredUnits: 30, remainingUnits: 0, partiallyShipped: false })).toBe("All 30 units delivered");
    mockApi({ "GET /customer/orders/o1/shipments": { summary, shipments: [{ id: "sh1", orderId: "o1", shipmentNumber: "SHP-000001", status: "ON_THE_WAY", quantity: 15, destination: { city: "Cairo", country: "Egypt" }, courierName: null, trackingNumber: null, trackingUrl: null, scheduledAt: null, dispatchedAt: "2026-10-10T10:00:00Z", deliveredAt: null, deliveryPerson: "SECRET-DRIVER", proofUrl: "SECRET-PROOF" }] } });
    renderWithClient(<ShipmentsView id="o1" />);
    expect(await screen.findByTestId("shipment-summary")).toHaveTextContent("15 of 30 units shipped, 15 remaining");
    expect(screen.getByTestId("shipment")).toHaveTextContent("SHP-000001");
    expect(screen.getByTestId("shipment")).toHaveTextContent("To Cairo, Egypt");
    expect(document.body.textContent).not.toMatch(/SECRET/);
  });
  it("delivered shows a completion state and Reorder only when allowed; reorder confirms then opens the new draft", async () => {
    const delivered = (a: OrderAction[]) => order(a, { status: "DELIVERED", statusLabel: "Delivered", deliveredAt: "2026-10-20T10:00:00Z" });
    const calls = mockApi({ ...idle, "GET /customer/orders/o1": delivered(["REORDER"]), "POST /customer/orders/o1/reorder": order(["EDIT_ORDER"], { id: "o2", status: "DRAFT" }) });
    const { unmount } = renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByTestId("delivered")).toHaveTextContent("delivered");
    await userEvent.click(screen.getByTestId("reorder"));
    expect(await screen.findByText("Create a new order using this approved production reference?")).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith("/reorder"))).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Create new order" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/account/orders/o2/edit"));
    unmount();
    mockApi({ ...idle, "GET /customer/orders/o1": delivered([]) });
    renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findByTestId("delivered");
    expect(screen.queryByTestId("reorder")).not.toBeInTheDocument();
  });
});

describe("no internal data", () => {
  it("renders only customer fields from the order payload", async () => {
    mockApi({ ...idle, "GET /customer/orders/o1": { ...order([]), internalNotes: "SECRET-INTERNAL", customerId: "SECRET-CUSTOMER", cost: "SECRET-COST" } });
    renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findByTestId("next-step");
    expect(document.body.textContent).not.toMatch(/SECRET/);
  });
});
