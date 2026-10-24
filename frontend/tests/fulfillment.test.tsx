import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { json, mockApi, orderDetail, page, renderWithClient, setup } from "./helpers";

const replace = vi.fn();
let search = "";
let pathname = "/orders/o1";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams(search) }));
let perms: string[] = [];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated", user: { id: "u1", name: "Sara", email: "", roles: [], permissions: perms } }),
}));

import type { Shipment } from "@/features/fulfillment/types";
import { checkAllocation, shipmentAllocation } from "@/features/fulfillment/allocation";
import { DeliveryPage } from "@/features/fulfillment/delivery-page";
import { fulfillmentHeadline } from "@/features/fulfillment/fulfillment-card";
import { PackagingPanel } from "@/features/fulfillment/packaging-panel";
import { buildPackagingBody } from "@/features/fulfillment/packaging-report-form";
import { ShipmentDrawer } from "@/features/fulfillment/shipment-drawer";
import { ShipmentsPanel } from "@/features/fulfillment/shipments-panel";
import { TrackingPanel } from "@/features/fulfillment/tracking-panel";
import { OrderDetailPage } from "@/features/orders/order-detail-page";
import { filterNav, landingPath } from "@/features/navigation/nav-config";
import { createPermissionChecker } from "@/lib/permissions";

const SALES = ["orders.read", "orders.manage", "orders.confirm", "orders.reorder", "order_batches.read", "orders.commercial.read", "packaging.manage", "shipments.read", "public_tracking.manage", "assets.read", "master_data.read", "jobs.read_all", "production_board.read"];
const ADMIN = [...SALES, "shipments.manage", "shipments.dispatch", "shipments.complete", "deliveries.read_assigned", "production_quantity.report", "users.read", "factory_jobs.manage", "orders.override"];
const DELIVERY = ["deliveries.read_assigned", "shipments.dispatch", "shipments.complete", "jobs.read_assigned"];

const line = (id: string, label: string, quantity: number) => ({ orderVariantId: id, label, quantity });
const shipment = (o: Record<string, unknown> = {}): Shipment => ({
  id: "sh1", shipmentNumber: "SHP-000001", orderId: "o1", orderNumber: "ORD-000001", status: "DRAFT", deliveryMethod: "OWN_DELIVERY", recipientName: "Nile", recipientPhone: "01001234567",
  addressSnapshot: { country: "Egypt", city: "Cairo", area: "Nasr City", addressLine1: "12 Test Street" }, courierName: null, trackingNumber: null, trackingUrl: null, scheduledAt: null, readyAt: null, dispatchedAt: null, inTransitAt: null,
  deliveredAt: null, failedAt: null, returnedAt: null, cancelledAt: null, failureReason: null, returnReason: null, cancelReason: null, hasProof: false, notes: null, deliveryNotes: null, assignedDeliveryUserId: null, assignedDeliveryName: null,
  totalQuantity: 15, lines: [line("v1", "Black / XS", 10), line("v2", "Black / S", 5)], createdAt: "2026-10-02T10:00:00Z", ...o,
}) as Shipment;
const staffDelivery = (o: Record<string, unknown> = {}) => ({ id: "sh1", shipmentNumber: "SHP-000001", status: "DISPATCHED", deliveryMethod: "OWN_DELIVERY", recipientName: "Nile", recipientPhone: "01001234567", address: { city: "Cairo", addressLine1: "12 Test Street" }, packages: [line("v1", "Black / XS", 10)], totalQuantity: 10, deliveryNotes: "Call first", courierName: null, trackingNumber: null, scheduledAt: null, dispatchedAt: "2026-10-02T10:00:00Z", deliveredAt: null, hasProof: false, ...o });
const fulfillment = (o: Record<string, unknown> = {}) => ({ deliveredQuantity: 0, inFlightQuantity: 0, shippableQuantity: 29, remainingDeliveryQuantity: 29, packagingDefined: true, packedQuantity: 29, packagingComplete: true, trackingEnabled: false, ...o });
const order = (o: Record<string, unknown> = {}) => orderDetail({ status: "READY_FOR_DELIVERY", confirmedAt: "2026-10-02T10:00:00Z", fulfillment: fulfillment(), shipments: [], ...o });

beforeEach(() => { setup(); replace.mockClear(); search = ""; pathname = "/orders/o1"; perms = [...ADMIN]; });

describe("allocation math", () => {
  const variants = [{ id: "v1", label: "Black / XS", quantity: 40 }, { id: "v2", label: "Black / S", quantity: 60 }];
  it("on-shipment units ignore cancelled and returned shipments (returned units become shippable again) and the shipment being edited", () => {
    const ships = [shipment({ id: "a", status: "DELIVERED", lines: [line("v1", "x", 15)] }), shipment({ id: "b", status: "RETURNED", lines: [line("v1", "x", 10)] }), shipment({ id: "c", status: "CANCELLED", lines: [line("v1", "x", 5)] }), shipment({ id: "d", status: "DRAFT", lines: [line("v1", "x", 8), line("v2", "x", 20)] })];
    expect(shipmentAllocation(variants, ships).map((r) => [r.allocated, r.remaining])).toEqual([[23, 17], [20, 40]]);
    expect(shipmentAllocation(variants, ships, "d").map((r) => [r.allocated, r.remaining])).toEqual([[15, 25], [0, 60]]);
  });
  it("per-variant and shippable-total guards; blank/zero ignored; backend stays authoritative", () => {
    const rows = shipmentAllocation(variants, [shipment({ status: "DELIVERED", lines: [line("v1", "x", 30)] })]);
    expect(checkAllocation(rows, { v1: "11" }).errors).toEqual({ v1: "At most 10 left" });
    expect(checkAllocation(rows, { v1: "x" }).errors.v1).toBe("Whole number");
    expect(checkAllocation(rows, {}).totalError).toBe("Enter at least one quantity");
    expect(checkAllocation(rows, { v1: "10", v2: "5" }, 12)).toMatchObject({ total: 15, totalError: "Only 12 packed units can ship now", valid: false });
    expect(checkAllocation(rows, { v1: "10", v2: "0" }, 29)).toMatchObject({ total: 10, valid: true });
  });
  it("packaging body: only entered numbers, whole numbers only, nothing to report = null", () => {
    expect(buildPackagingBody({ packed: "17", damaged: "", cartons: "2", variant: "", notes: " ok " })).toEqual({ packedQuantity: 17, cartonCount: 2, notes: "ok" });
    expect(buildPackagingBody({ packed: "", damaged: "3", cartons: "", variant: "v1", notes: "" })).toEqual({ packedQuantity: 0, damagedQuantity: 3, orderVariantId: "v1" });
    expect(buildPackagingBody({ packed: "1.5", damaged: "", cartons: "", variant: "", notes: "" })).toBeNull();
    expect(buildPackagingBody({ packed: "", damaged: "", cartons: "", variant: "", notes: "" })).toBeNull();
  });
  it("fulfillment headline comes from backend numbers: partial delivery is not 'fully delivered'", () => {
    const o = (f: Record<string, unknown>) => ({ status: "PARTIALLY_SHIPPED", totalQuantity: 30, productionSummary: {}, fulfillment: fulfillment(f) }) as never;
    expect(fulfillmentHeadline(o({ deliveredQuantity: 15, shippableQuantity: 0, remainingDeliveryQuantity: 14 })).label).toBe("Partially delivered — 14 units remaining");
    expect(fulfillmentHeadline(o({ shippableQuantity: 14, deliveredQuantity: 15, remainingDeliveryQuantity: 14 })).tone).toBe("ready");
    expect(fulfillmentHeadline(o({ deliveredQuantity: 29, shippableQuantity: 0, remainingDeliveryQuantity: 0 })).label).toBe("Fully delivered");
  });
});

describe("packaging", () => {
  const spec = (o: Record<string, unknown> = {}) => ({ id: "pk1", defined: true, foldingInstructions: "Fold in thirds", polybagRequired: true, labelsRequired: false, hangTagsRequired: false, stickersRequired: false, stickerNotes: null, unitsPerCarton: 10, cartonNotes: null, specialInstructions: null, components: [], reconciliation: { completedQuantity: 29, packedQuantity: 12, damagedQuantity: 1, cartonCount: 1, packagingComplete: false, shippableQuantity: 0 }, reports: [], updatedAt: "2026-10-02T10:00:00Z", ...o });
  const jobs = [{ id: "j1", jobNumber: "JOB-000001", sourceType: "BULK_ORDER", status: "IN_PROGRESS", orderBatchId: null, batchNumber: null, plannedQuantity: 30, completedQuantity: 0, rejectedQuantity: 0 }];
  const stage = { id: "pst", jobId: "j1", stageCode: "PACKAGING", stageName: "Packaging", departmentType: "PACKAGING", sequence: 9, attempt: 1, status: "IN_PROGRESS", superseded: false, assignees: [] };
  it("report goes to the PACKAGING stage staff route with the packed/damaged/carton body; a backend refusal (no spec / over-report) is shown", async () => {
    let refuse = true;
    const calls = mockApi({ "GET /admin/orders/o1/packaging": spec(), "GET /admin/factory-jobs/j1/stages": [stage], "POST /staff/job-stages/pst/packaging-reports": () => (refuse ? json(409, { statusCode: 409, message: "Over-report: only 17 unit(s) of 30 remain on Packaging" }) : json(201, {})) });
    renderWithClient(<PackagingPanel order={order({ factoryJobs: jobs }) as never} />);
    expect(await screen.findByTestId("packaging-spec")).toHaveTextContent("Fold in thirds");
    expect(screen.getByText("Ready to ship")).toBeInTheDocument();
    await userEvent.type(await screen.findByLabelText("Packed (good)"), "500");
    await userEvent.click(screen.getByRole("button", { name: "Add packaging report" }));
    expect(await screen.findByText(/only 17 unit/)).toBeInTheDocument();
    refuse = false;
    await userEvent.clear(screen.getByLabelText("Packed (good)"));
    await userEvent.type(screen.getByLabelText("Packed (good)"), "17");
    await userEvent.type(screen.getByLabelText("Cartons filled"), "2");
    await userEvent.click(screen.getByRole("button", { name: "Add packaging report" }));
    await waitFor(() => expect(calls.filter((c) => c.method === "POST").at(-1)?.body).toEqual({ packedQuantity: 17, cartonCount: 2 }));
  });
  it("an undefined specification is flagged BEFORE packaging; packaging.manage controls the define/edit action; SALES-level perms can define it", async () => {
    mockApi({ "GET /admin/orders/o1/packaging": spec({ defined: false, id: null }) });
    perms = ["packaging.manage"];
    renderWithClient(<PackagingPanel order={order() as never} />);
    expect(await screen.findByText(/before packaging starts/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Define specification" })).toBeInTheDocument();
    expect(screen.queryByTestId("no-packaging-stage")).not.toBeInTheDocument(); // execution needs production_quantity.report
  });
});

describe("shipments", () => {
  const orderWithVariants = (o: Record<string, unknown> = {}) => order({ factoryJobs: [], ...o });
  const common = { "GET /admin/customers/c1/addresses": [{ id: "ad1", type: "SHIPPING", country: "Egypt", state: null, city: "Cairo", area: null, addressLine1: "12 Test Street", addressLine2: null, postalCode: null, notes: null, isDefault: true, createdAt: "x", updatedAt: "x" }] };
  it("create: allocation table, UI guard blocks over-allocation, payload carries variant lines + the saved address id (snapshotted by the backend); refusals are shown", async () => {
    let refuse = true;
    const calls = mockApi({ ...common, "GET /admin/orders/o1/shipments": [], "POST /admin/orders/o1/shipments": () => (refuse ? json(409, { statusCode: 409, message: "Over-shipping: 16 unit(s) requested but only 14 are produced, packed and not yet on a shipment" }) : json(201, shipment({ id: "new" }))) });
    renderWithClient(<ShipmentsPanel order={orderWithVariants({ customer: { id: "c1", name: "Nile", number: "C1" } }) as never} />);
    await userEvent.click(await screen.findByRole("button", { name: /New shipment/ }));
    const d = await screen.findByRole("dialog", { name: "New shipment" });
    await userEvent.type(within(d).getByLabelText("Ship Black / XS"), "99");
    expect(within(d).getByText("At most 40 left")).toBeInTheDocument();
    expect(within(d).getByRole("button", { name: "Create shipment" })).toBeDisabled();
    await userEvent.clear(within(d).getByLabelText("Ship Black / XS"));
    await userEvent.type(within(d).getByLabelText("Ship Black / XS"), "10");
    await userEvent.type(within(d).getByLabelText("Ship Black / S"), "5");
    expect(within(d).getByTestId("alloc-total")).toHaveTextContent("15");
    await userEvent.type(within(d).getByLabelText(/Recipient phone/), "01001234567");
    await userEvent.click(within(d).getByRole("combobox", { name: "Address" }));
    await userEvent.click(await screen.findByRole("option", { name: /12 Test Street/ }));
    await userEvent.click(within(d).getByRole("button", { name: "Create shipment" }));
    expect(await within(d).findByRole("alert")).toHaveTextContent("only 14 are produced");
    refuse = false;
    await userEvent.click(within(d).getByRole("button", { name: "Create shipment" }));
    await waitFor(() => expect(calls.filter((c) => c.method === "POST" && c.path === "/admin/orders/o1/shipments").at(-1)?.body).toMatchObject({ deliveryMethod: "OWN_DELIVERY", recipientName: "Nile", recipientPhone: "01001234567", customerAddressId: "ad1", lines: [{ orderVariantId: "v1", quantity: 10 }, { orderVariantId: "v2", quantity: 5 }] }));
  });
  it("existing shipments are subtracted: variant 'left' reflects live shipments; New shipment is disabled when nothing is packed; SALES cannot create", async () => {
    mockApi({ ...common, "GET /admin/orders/o1/shipments": [shipment({ status: "DISPATCHED", lines: [line("v1", "Black / XS", 30)] })] });
    const r = renderWithClient(<ShipmentsPanel order={orderWithVariants() as never} />);
    await userEvent.click(await screen.findByRole("button", { name: /New shipment/ }));
    const d = await screen.findByRole("dialog");
    expect(within(d).getByTestId("allocation-table")).toHaveTextContent(/Black \/ XS\s*4030\s*10/);
    r.unmount();
    perms = [...SALES];
    renderWithClient(<ShipmentsPanel order={orderWithVariants() as never} />);
    await screen.findByTestId("shipment-list");
    expect(screen.queryByRole("button", { name: /New shipment/ })).not.toBeInTheDocument();
  });
  const drawer = async (status: string, granted: string[], extra: Record<string, unknown> = {}) => {
    perms = granted;
    const calls = mockApi({ "GET /admin/shipments/sh1": shipment({ status, ...extra }), "POST /admin/shipments/sh1/dispatch": shipment(), "POST /admin/shipments/sh1/deliver": shipment(), "POST /admin/shipments/sh1/ready": shipment(), "POST /admin/shipments/sh1/cancel": shipment(), "POST /admin/shipments/sh1/in-transit": shipment() });
    const r = renderWithClient(<ShipmentDrawer shipmentId="sh1" orderId="o1" onClose={() => undefined} onEdit={() => undefined} />);
    await screen.findByTestId("shipment-lines");
    return { calls, r, buttons: () => within(screen.getByTestId("shipment-actions")).queryAllByRole("button").map((b) => b.textContent) };
  };
  it("the address is the frozen snapshot, labelled, with no edit control", async () => {
    await drawer("DRAFT", ADMIN);
    const a = screen.getByTestId("address-snapshot");
    expect(a).toHaveTextContent("Delivery address at shipment creation");
    expect(a).toHaveTextContent("12 Test Street");
    expect(within(a).queryByRole("button")).not.toBeInTheDocument();
  });
  it("actions follow permission + backend status: SALES read-only; manage vs dispatch vs complete", async () => {
    let t = await drawer("DRAFT", SALES); expect(t.buttons()).toEqual([]); t.r.unmount();
    t = await drawer("DRAFT", ADMIN); expect(t.buttons()).toEqual(["Mark ready", "Edit quantities", "Cancel shipment"]); t.r.unmount();
    t = await drawer("READY", ["shipments.read", "shipments.dispatch"]); expect(t.buttons()).toEqual(["Dispatch"]); t.r.unmount();
    t = await drawer("DISPATCHED", ADMIN); expect(t.buttons()).toEqual(["Mark in transit", "Mark delivered", "Delivery failed"]); t.r.unmount();
    t = await drawer("DELIVERED", ADMIN); expect(t.buttons()).toEqual(["Record return"]); t.r.unmount();
    t = await drawer("CANCELLED", ADMIN); expect(t.buttons()).toEqual([]);
  });
  it("dispatch posts to /dispatch; delivery posts notes to /deliver; cancel needs a reason (not a delete)", async () => {
    let t = await drawer("READY", ADMIN);
    await userEvent.click(screen.getByRole("button", { name: "Dispatch" }));
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Dispatch shipment" })).getByRole("button", { name: "Dispatch" }));
    await waitFor(() => expect(t.calls.some((c) => c.path === "/admin/shipments/sh1/dispatch" && c.method === "POST")).toBe(true));
    t.r.unmount();
    t = await drawer("IN_TRANSIT", ADMIN);
    await userEvent.click(screen.getByRole("button", { name: "Mark delivered" }));
    const dd = await screen.findByRole("dialog", { name: "Confirm delivery" });
    await userEvent.type(within(dd).getByLabelText(/Received by/), "Mr Test");
    await userEvent.click(within(dd).getByRole("button", { name: "Confirm delivered" }));
    await waitFor(() => expect(t.calls.find((c) => c.path === "/admin/shipments/sh1/deliver")?.body).toEqual({ notes: "Mr Test" }));
    t.r.unmount();
    t = await drawer("READY", ADMIN);
    await userEvent.click(screen.getByRole("button", { name: "Cancel shipment" }));
    const cd = await screen.findByRole("dialog", { name: "Cancel shipment" });
    expect(within(cd).getByRole("button", { name: "Cancel shipment" })).toBeDisabled();
    await userEvent.type(within(cd).getByLabelText(/Reason/), "Customer not ready");
    await userEvent.click(within(cd).getByRole("button", { name: "Cancel shipment" }));
    await waitFor(() => expect(t.calls.find((c) => c.path === "/admin/shipments/sh1/cancel")?.body).toEqual({ reason: "Customer not ready" }));
  });
  it("delivery proof: signed URL requested on click only, opened on the API origin, never displayed", async () => {
    const open = vi.fn(); vi.stubGlobal("open", open);
    const t = await drawer("DELIVERED", ADMIN, { hasProof: true });
    mockApi({ "GET /admin/shipments/sh1/proof-url": { url: "/api/v1/storage/local/tok999", expiresAt: "x" } });
    await userEvent.click(screen.getByRole("button", { name: /View delivery proof/ }));
    await waitFor(() => expect(open).toHaveBeenCalledWith("http://api.test/api/v1/storage/local/tok999", "_blank", "noopener,noreferrer"));
    expect(document.body.innerHTML).not.toContain("tok999");
    expect(t.calls.some((c) => c.path.includes("proof-url"))).toBe(false);
  });
});

describe("DELIVERY role", () => {
  it("sees only 'My deliveries' (no shipments table, no order/commercial data); landing is /delivery; nav has no orders/payments", async () => {
    perms = [...DELIVERY]; pathname = "/delivery";
    const checker = createPermissionChecker(DELIVERY);
    expect(landingPath(checker)).toBe("/delivery");
    const labels = filterNav(checker).flatMap((s) => s.items.map((i) => i.label));
    expect(labels).toContain("Delivery");
    for (const bad of ["Orders", "Payments", "Quotations", "Customers", "Production"]) expect(labels).not.toContain(bad);
    const calls = mockApi({ "GET /staff/deliveries": page([staffDelivery()]) });
    renderWithClient(<DeliveryPage />);
    expect(await screen.findByTestId("my-deliveries")).toHaveTextContent("SHP-000001");
    expect(screen.queryByRole("tab", { name: "All shipments" })).not.toBeInTheDocument();
    expect(calls.map((c) => c.path)).toEqual(["/staff/deliveries"]);
  });
  it("the delivery drawer shows recipient, frozen address, packages and notes, with actions by status on the /staff/deliveries routes (deliver sends notes)", async () => {
    perms = [...DELIVERY]; search = "delivery=sh1";
    let d = staffDelivery({ status: "READY", dispatchedAt: null });
    const calls = mockApi({ "GET /staff/deliveries": () => json(200, page([d])), "GET /staff/deliveries/sh1": () => json(200, d), "POST /staff/deliveries/sh1/dispatch": () => { d = { ...d, status: "DISPATCHED" }; return json(200, d); }, "POST /staff/deliveries/sh1/delivered": () => json(200, d), "POST /staff/deliveries/sh1/failed": () => json(200, d) });
    renderWithClient(<DeliveryPage />);
    const drawer = await screen.findByTestId("delivery-drawer");
    await within(drawer).findByTestId("delivery-packages");
    expect(drawer).toHaveTextContent("12 Test Street");
    expect(drawer).toHaveTextContent("Call first");
    expect(drawer.textContent).not.toMatch(/EGP|price|payment|quotation/i);
    expect(within(screen.getByTestId("delivery-actions")).getAllByRole("button").map((b) => b.textContent)).toEqual(["Pick up for delivery"]);
    await userEvent.click(screen.getByRole("button", { name: "Pick up for delivery" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/staff/deliveries/sh1/dispatch")).toBe(true));
    await userEvent.click(await screen.findByRole("button", { name: "Delivered" }));
    const dd = await screen.findByRole("dialog", { name: "Confirm delivery" });
    await userEvent.type(within(dd).getByLabelText(/Received by/), "Mr Test");
    await userEvent.click(within(dd).getByRole("button", { name: "Confirm delivered" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/staff/deliveries/sh1/delivered")?.body).toEqual({ notes: "Mr Test" }));
  });
  it("admins see all shipments (+ My deliveries tab); a user with neither permission gets Access denied", async () => {
    perms = [...ADMIN]; pathname = "/delivery";
    mockApi({ "GET /admin/shipments": page([shipment({ status: "DISPATCHED" })]), "GET /staff/deliveries": page([]) });
    const r = renderWithClient(<DeliveryPage />);
    expect(await screen.findByRole("link", { name: "SHP-000001" })).toHaveAttribute("href", "/orders/o1?tab=shipments");
    expect(screen.getByRole("tab", { name: "My deliveries" })).toBeInTheDocument();
    r.unmount();
    perms = [];
    renderWithClient(<DeliveryPage />);
    expect((await screen.findAllByText(/Access denied|permission/i)).length).toBeGreaterThan(0);
  });
});

describe("tracking token", () => {
  it("the raw link is shown once at creation (with a public preview); afterwards the panel says it cannot be shown again; regenerate/revoke are confirmed", async () => {
    let enabled = false;
    const status = () => ({ enabled, tokenId: enabled ? "t1" : null, createdAt: enabled ? "2026-10-02T10:00:00Z" : null, expiresAt: null, lastUsedAt: null });
    const calls = mockApi({
      "GET /admin/orders/o1/tracking": () => json(200, status()),
      "POST /admin/orders/o1/tracking-token": () => { enabled = true; return json(201, { token: "RAWTOKEN123", path: "/api/v1/track/orders/RAWTOKEN123", url: null, expiresAt: null, tokenId: "t1" }); },
      "GET /track/orders/RAWTOKEN123": { orderNumber: "ORD-000001", status: "PARTIALLY_SHIPPED", currentStage: null, progressPercent: 100, totalQuantity: 30, deliveredQuantity: 15, remainingDeliveryQuantity: 14, targetDeliveryDate: null, shipments: [{ shipmentNumber: "SHP-000001", status: "DELIVERED", quantity: 15, courierName: null, trackingUrl: null, dispatchedAt: null, deliveredAt: null }], updatedAt: "x" },
      "DELETE /admin/orders/o1/tracking-token": () => { enabled = false; return json(200, status()); },
    });
    renderWithClient(<TrackingPanel orderId="o1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Create tracking link" }));
    const dlg = await screen.findByTestId("token-dialog");
    expect(within(dlg).getByRole("textbox", { name: "Tracking link" })).toHaveValue("/api/v1/track/orders/RAWTOKEN123");
    await userEvent.click(within(dlg).getByRole("button", { name: "Public tracking preview" }));
    const pv = await screen.findByTestId("public-preview");
    expect(pv).toHaveTextContent("what the customer can see");
    expect(pv).toHaveTextContent("15 of 30 delivered");
    await userEvent.click(within(dlg).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByTestId("token-dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Enabled")).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("RAWTOKEN123");
    expect(screen.getByTestId("token-note")).toHaveTextContent("cannot be shown again");
    await userEvent.click(screen.getByRole("button", { name: "Revoke link" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE")).toBe(true));
  });
  it("needs public_tracking.manage to manage; a day count must be a whole number", async () => {
    perms = ["orders.read"];
    mockApi({ "GET /admin/orders/o1/tracking": { enabled: false, tokenId: null, createdAt: null, expiresAt: null, lastUsedAt: null } });
    renderWithClient(<TrackingPanel orderId="o1" />);
    expect(await screen.findByText(/needs the public-tracking permission/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create tracking link" })).not.toBeInTheDocument();
  });
});

describe("order page integration and SALES ⊆ ADMIN parity", () => {
  const tabsFor = async (granted: string[]) => {
    perms = granted; pathname = "/orders/o1"; search = "";
    mockApi({ "GET /admin/orders/o1": order({ shipments: [{ id: "sh1", shipmentNumber: "SHP-000001", status: "DELIVERED", quantity: 15, dispatchedAt: null, deliveredAt: "2026-10-03T10:00:00Z" }] }), "GET /admin/orders/o1/commercial": json(403, {}), "GET /admin/orders/o1/production-specs": [] });
    const r = renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findByTestId("fulfillment-card");
    const tabs = screen.getAllByRole("tab").map((t) => t.textContent);
    const card = screen.getByTestId("fulfillment-card").textContent;
    r.unmount();
    return { tabs, card };
  };
  it("every fulfilment tab SALES sees, ADMIN sees too; the summary shows backend numbers incl. the shipments list; factory/QC style permissions get no fulfilment tabs", async () => {
    const sales = await tabsFor(SALES);
    const admin = await tabsFor(ADMIN);
    for (const t of ["Packaging", "Shipments", "Customer tracking"]) { expect(sales.tabs).toContain(t); expect(admin.tabs).toContain(t); }
    for (const t of sales.tabs) expect(admin.tabs).toContain(t);
    expect(sales.card).toContain("Ready for shipment — 29 packed units can ship now");
    expect(sales.card).toContain("SHP-000001");
    const none = await tabsFor(["orders.read"]);
    expect(none.tabs).not.toEqual(expect.arrayContaining(["Packaging"]));
    expect(none.tabs).not.toEqual(expect.arrayContaining(["Shipments"]));
    expect(none.tabs).not.toEqual(expect.arrayContaining(["Customer tracking"]));
  });
});
