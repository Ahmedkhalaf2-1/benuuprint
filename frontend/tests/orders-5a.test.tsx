import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { json, mockApi, orderBatch, orderDetail, page, renderWithClient, sampleItem, setup } from "./helpers";

const push = vi.fn();
let search = "";
let pathname = "/orders/new";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push, back: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams(search) }));
let perms: string[] = [];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated", user: { id: "u1", name: "Sara", email: "", roles: [], permissions: perms } }),
}));

import { filterNav } from "@/features/navigation/nav-config";
import { OrderDetailPage } from "@/features/orders/order-detail-page";
import { latestApprovedReference, NewOrderPage } from "@/features/orders/new-order-page";
import { cellQuantity, matrixTotals, setCell, type ColorDef, type Row } from "@/features/orders/matrix";
import { readinessItems } from "@/features/orders/readiness";
import { QuantityMatrix } from "@/features/orders/quantity-matrix";
import { createPermissionChecker } from "@/lib/permissions";

const SALES = ["orders.read", "orders.manage", "orders.confirm", "orders.reorder", "order_batches.read", "orders.commercial.read", "orders.commercial.manage", "packaging.manage", "samples.read", "assets.read", "master_data.read"];
const ADMIN = [...SALES, "order_batches.manage", "factory_jobs.manage", "orders.cancel", "orders.override", "payments.verify", "users.read"];

const black: ColorDef = { key: "col1", label: "Black", hex: "#000", id: "col1" };
const row = (o: Partial<Row>): Row => ({ key: 1, size: "s1", customSize: "", color: "col1", customColor: "", pantone: "", hex: "", quantity: "10", ...o });
let k = 100;
const nextKey = () => ++k;

beforeEach(() => { setup(); push.mockClear(); search = ""; pathname = "/orders/new"; perms = [...SALES]; });

describe("quantity matrix math", () => {
  it("cells, row/column/grand totals; zero removes the variant; edits keep the existing row id", () => {
    let rows: Row[] = [row({ key: 1, id: "v1", size: "s1", quantity: "10" }), row({ key: 2, size: "s2", quantity: "30" })];
    expect(cellQuantity(rows, "col1", "s2")).toBe(30);
    rows = setCell(rows, black, "s1", "25", nextKey);
    expect(rows.find((r) => r.key === 1)).toMatchObject({ id: "v1", quantity: "25" });
    rows = setCell(rows, black, "s3", "5", nextKey);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ size: "s3", color: "col1", quantity: "5" });
    const t = matrixTotals(rows, [black], ["s1", "s2", "s3"]);
    expect(t).toMatchObject({ grand: 60, outside: 0, byColor: { col1: 60 }, bySize: { s1: 25, s2: 30, s3: 5 } });
    rows = setCell(rows, black, "s2", "", nextKey);
    expect(rows.map((r) => r.size)).toEqual(["s1", "s3"]);
  });
  it("custom colours become custom variants; rows the grid cannot show count as 'outside' (never hidden)", () => {
    const red: ColorDef = { key: "custom:red", label: "Red", hex: null, id: null };
    let rows: Row[] = [];
    rows = setCell(rows, red, "s1", "7", nextKey);
    expect(rows[0]).toMatchObject({ color: "__custom", customColor: "Red", quantity: "7" });
    rows = [...rows, row({ key: 9, size: "__none", quantity: "4" })];
    const t = matrixTotals(rows, [black, red], ["s1"]);
    expect(t).toMatchObject({ grand: 11, outside: 4 });
  });
  it("the grid shows totals and the outside warning, and never edits the item quantity", async () => {
    const onChange = vi.fn();
    const rows = [row({ quantity: "10" }), row({ key: 2, size: "__custom", customSize: "Kids", quantity: "6" })];
    renderWithClient(<QuantityMatrix rows={rows} sizes={[{ value: "s1", label: "S" }, { value: "s2", label: "M" }]} colors={[{ id: "col1", name: "Black", hex: "#000" }]} nextKey={nextKey} onChange={onChange} />);
    expect(screen.getByTestId("grand-total")).toHaveTextContent("16");
    expect(screen.getByTestId("matrix-outside")).toHaveTextContent("6 units");
    await userEvent.type(screen.getByLabelText("Black M"), "3");
    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ size: "s2", quantity: "3" })]));
  });
});

describe("new order: approved reference dependency", () => {
  const spec = (over: Record<string, unknown>) => ({ id: "sp", sampleId: "s1", revision: 1, kind: "APPROVED_REFERENCE", sourceFactoryJobId: null, specHash: "a".repeat(64), schemaVersion: 1, approvalId: null, snapshot: {}, createdAt: "2026-10-01T10:00:00Z", ...over });
  it("only the newest APPROVED_REFERENCE counts; a PRE_PRODUCTION spec is never a reference", () => {
    expect(latestApprovedReference([spec({ id: "a", kind: "PRE_PRODUCTION", revision: 5 }), spec({ id: "b", revision: 1 }), spec({ id: "c", revision: 2 })] as never)?.id).toBe("c");
    expect(latestApprovedReference([spec({ kind: "PRE_PRODUCTION" })] as never)).toBeNull();
  });
  it("create stays disabled until the sample has an approved reference; then posts create-order and opens the variants tab", async () => {
    search = "sampleId=s1";
    let specs: unknown[] = [spec({ kind: "PRE_PRODUCTION" })];
    const calls = mockApi({
      "GET /admin/samples": page([sampleItem({ id: "s1", status: "APPROVED", approvedAt: "2026-10-02T10:00:00Z" })]),
      "GET /admin/samples/s1/production-specs": () => json(200, specs),
      "POST /admin/samples/s1/create-order": () => json(201, orderDetail({ id: "o9", orderNumber: "ORD-000009" })),
    });
    const a = renderWithClient(<NewOrderPage />);
    const btn = await screen.findByRole("button", { name: "Create draft order" });
    expect(await screen.findByRole("alert")).toHaveTextContent("no approved reference");
    expect(btn).toBeDisabled();
    expect(Object.fromEntries(new URLSearchParams(calls.find((c) => c.path === "/admin/samples")!.query))).toMatchObject({ status: "APPROVED,COMPLETED" });
    a.unmount();
    specs = [spec({ revision: 2 })];
    renderWithClient(<NewOrderPage />);
    const ok = await screen.findByRole("button", { name: "Create draft order" });
    expect(await screen.findByText(/revision 2/)).toBeInTheDocument();
    await waitFor(() => expect(ok).toBeEnabled());
    await userEvent.click(ok);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/o9?tab=variants"));
    expect(calls.find((c) => c.path === "/admin/samples/s1/create-order")?.body).toMatchObject({ priority: "NORMAL" });
  });
  it("needs orders.manage (permission, not role)", () => {
    perms = ["orders.read"];
    mockApi({});
    renderWithClient(<NewOrderPage />);
    expect(screen.getByText(/cannot create orders/i)).toBeInTheDocument();
  });
});

describe("readiness and commercial invalidation", () => {
  it("lists exactly what blocks release, from the backend's gate and flags (no local classifier)", () => {
    const o = { status: "CONFIRMED", currentSpec: { revision: 1 }, items: [{ quantity: 100, variantTotal: 100 }] } as never;
    const items = readinessItems(o, { reapprovalRequired: true, quotationStatus: "ENDED", releaseGate: { satisfied: false, reasons: ["3000.00 EGP must still be verified"] } });
    expect(items.filter((i) => !i.ok).map((i) => i.label)).toEqual(["Commercial terms approved", "Payment gate"]);
    expect(items.find((i) => i.label === "Commercial terms approved")?.detail).toBe("Commercial terms require re-approval.");
    expect(readinessItems(o, { quotationStatus: "ACCEPTED", releaseGate: { satisfied: true, reasons: [] } }).every((i) => i.ok)).toBe(true);
    expect(readinessItems({ ...(o as object), items: [{ quantity: 100, variantTotal: 90 }] } as never, null).find((i) => i.label === "Quantities add up")?.ok).toBe(false);
  });
  it("order page: banner 'Commercial terms require re-approval.' appears from the backend flag only, and the Production spec tab is read only", async () => {
    perms = [...SALES]; pathname = "/orders/o1"; search = "";
    const base = { orderId: "o1", orderNumber: "ORD-000001", currency: "EGP", quotationNumber: "Q", quotationVersionId: "v", quotationStatus: "ENDED", quotedTotal: "1", acceptedTotal: null, verifiedPaid: "0.00", pendingPayments: "0.00", remaining: "1", overpaid: "0.00", paymentState: "UNPAID", counts: { verified: 0, pending: 0, rejected: 0, cancelled: 0 }, releaseGate: { requireAcceptedQuotation: true, requiredPaidPercent: 100, requiredPaidAmount: "1", satisfied: false, reasons: ["No accepted quotation"] } };
    let flag = true;
    mockApi({
      "GET /admin/orders/o1": orderDetail({ status: "CONFIRMED", confirmedAt: "2026-10-02T10:00:00Z", currentSpec: { revision: 2, totalQuantity: 100, specHash: "b".repeat(64) } }),
      "GET /admin/orders/o1/commercial": () => json(200, { ...base, reapprovalRequired: flag }),
      "GET /admin/orders/o1/production-specs": [{ id: "sp1", revision: 1, approvedProductionSpecId: "x", totalQuantity: 80, specHash: "c".repeat(64), createdAt: "2026-10-02T10:00:00Z", snapshot: { schemaVersion: 1, totalQuantity: 80, order: { priority: "NORMAL", revision: 1, orderNumber: "ORD-000001", targetDeliveryDate: null, reorderOfOrderNumber: null }, reference: { revision: 1, specHash: "d".repeat(64), sampleNumber: "SMP-000001", sourceFactoryJobNumber: null, approvedProductionSpecId: "x" }, items: [{ itemId: "i", productName: "Tee", quantity: 80, notes: null, variants: [{ variantId: "v", size: { code: "M", name: "M" }, color: { name: "Black", hex: null, pantone: null }, quantity: 80, notes: null }] }] } }, { id: "sp2", revision: 2, approvedProductionSpecId: "x", totalQuantity: 100, specHash: "e".repeat(64), createdAt: "2026-10-03T10:00:00Z", snapshot: { schemaVersion: 1, totalQuantity: 100, order: { priority: "NORMAL", revision: 2, orderNumber: "ORD-000001", targetDeliveryDate: null, reorderOfOrderNumber: null }, reference: { revision: 1, specHash: "d".repeat(64), sampleNumber: "SMP-000001", sourceFactoryJobNumber: null, approvedProductionSpecId: "x" }, items: [{ itemId: "i", productName: "Tee", quantity: 100, notes: null, variants: [{ variantId: "v", size: { code: "M", name: "M" }, color: { name: "Black", hex: null, pantone: null }, quantity: 100, notes: null }] }] } }],
      "GET /admin/orders/o1/production-summary": json(404, {}),
    });
    const a = renderWithClient(<OrderDetailPage id="o1" />);
    search = "tab=spec";
    expect(await screen.findByTestId("reapproval-banner")).toHaveTextContent("Commercial terms require re-approval.");
    const cards = await screen.findAllByTestId("spec-card");
    expect(cards[0]).toHaveAttribute("data-current", "true");
    expect(cards[0]).toHaveTextContent("revision 2");
    expect(cards[1]).toHaveTextContent("superseded");
    expect(within(screen.getByTestId("spec-panel")).queryByRole("button")).not.toBeInTheDocument();
    a.unmount();
    flag = false;
    renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findAllByText("ORD-000001");
    await waitFor(() => expect(screen.queryByTestId("reapproval-banner")).not.toBeInTheDocument());
  });
});

describe("ADMIN includes SALES (permissions, not roles)", () => {
  const orderActions = async (granted: string[]) => {
    perms = granted; pathname = "/orders/o1";
    mockApi({ "GET /admin/orders/o1": orderDetail({ status: "PENDING_CONFIRMATION", confirmedAt: null }), "GET /admin/orders/o1/commercial": json(403, {}), "GET /admin/orders/o1/production-specs": [], "GET /admin/orders/o1/production-summary": json(404, {}) });
    const r = renderWithClient(<OrderDetailPage id="o1" />);
    await screen.findAllByText("ORD-000001");
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    r.unmount();
    return labels;
  };
  it("every order action SALES's permissions expose is exposed to ADMIN (a superset of the same codes); overrides and batches are additions", async () => {
    const sales = await orderActions(SALES);
    const admin = await orderActions(ADMIN);
    expect(sales).toEqual(expect.arrayContaining(["Confirm order", "Request changes"]));
    for (const l of sales) expect(admin).toContain(l);
    expect(SALES.every((p) => ADMIN.includes(p))).toBe(true);
  });
  it("force-complete override is explicit, needs orders.override and a reason, and is hidden from SALES", async () => {
    const run = async (granted: string[]) => {
      perms = granted; pathname = "/orders/o1";
      const calls = mockApi({ "GET /admin/orders/o1": orderDetail({ status: "PRODUCTION_COMPLETED", confirmedAt: "2026-10-02T10:00:00Z" }), "GET /admin/orders/o1/commercial": json(403, {}), "GET /admin/orders/o1/production-specs": [], "GET /admin/orders/o1/production-summary": json(404, {}), "POST /admin/orders/o1/force-complete": orderDetail({ status: "COMPLETED" }) });
      const r = renderWithClient(<OrderDetailPage id="o1" />);
      await screen.findAllByText("ORD-000001");
      return { calls, r };
    };
    const s = await run(SALES);
    expect(screen.queryByRole("button", { name: /Force complete/ })).not.toBeInTheDocument();
    s.r.unmount();
    const a = await run(ADMIN);
    await userEvent.click(screen.getByRole("button", { name: "Force complete (override)" }));
    const dlg = await screen.findByRole("dialog", { name: /Force complete/ });
    expect(dlg).toHaveTextContent("ADMINISTRATIVE OVERRIDE");
    expect(within(dlg).getByRole("button", { name: "Force complete" })).toBeDisabled();
    await userEvent.type(within(dlg).getByLabelText(/Reason/), "Customer collected goods in person");
    await userEvent.click(within(dlg).getByRole("button", { name: "Force complete" }));
    await waitFor(() => expect(a.calls.find((c) => c.path === "/admin/orders/o1/force-complete")?.body).toEqual({ reason: "Customer collected goods in person" }));
  });
  it("nav uses permission codes: the same Orders/Production entries appear for both permission sets", () => {
    const labels = (p: string[]) => filterNav(createPermissionChecker(p)).flatMap((s) => s.items.map((i) => i.label));
    for (const l of labels(SALES)) expect(labels(ADMIN)).toContain(l);
  });
});

describe("job linkage", () => {
  it("a batch job and a whole-order job link to the Phase 4 job screen (no duplicate job UI in Orders)", async () => {
    perms = [...ADMIN]; pathname = "/orders/o1"; search = "tab=batches";
    mockApi({
      "GET /admin/orders/o1": orderDetail({ status: "IN_PRODUCTION", confirmedAt: "2026-10-02T10:00:00Z", batches: [orderBatch({ status: "IN_PRODUCTION", job: { id: "j7", jobNumber: "JOB-000007", sourceType: "ORDER_BATCH", status: "IN_PROGRESS", orderBatchId: "b1", batchNumber: "BAT-000001", plannedQuantity: 50, completedQuantity: 10, rejectedQuantity: 0 } })] }),
      "GET /admin/orders/o1/commercial": json(403, {}), "GET /admin/orders/o1/production-specs": [], "GET /admin/orders/o1/production-summary": json(404, {}),
    });
    renderWithClient(<OrderDetailPage id="o1" />);
    expect(await screen.findByRole("link", { name: "JOB-000007" })).toHaveAttribute("href", "/production/jobs/j7");
  });
});
