import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { json, mockApi, orderDetail, orderListItem, page, renderWithClient, sampleItem, setup } from "./helpers";

let perms: string[] = [];
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }), usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams("") }));
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated", user: { id: "u1", name: "Sara", email: "", roles: [], permissions: perms } }),
}));

import { CommandCenter } from "@/features/command-center/command-center";
import { classifyAttention, classifyJob, classifyOrder, classifySample, classifyShipment, matchesFilter, priorityScore, rankItems, uniqueByDestination, type Can, type QueueItem } from "@/features/command-center/logic";
import { ManagementDashboard } from "@/features/management/pages";
import { ProductionPanel } from "@/features/samples/production-panel";

const ADMIN = ["dashboard.read", "management_kpis.read", "samples.read", "samples.review", "samples.approve", "approvals.manage", "quotations.read", "quotations.create", "quotations.approve", "payments.read", "payments.manage", "payments.verify", "orders.read", "orders.manage", "orders.confirm", "orders.commercial.read", "factory_jobs.manage", "jobs.read_all", "shipments.read", "shipments.manage", "shipments.dispatch", "shipments.complete"];
const SALES = ["dashboard.read", "management_kpis.read", "samples.read", "samples.review", "quotations.read", "quotations.create", "payments.read", "payments.manage", "orders.read", "orders.manage", "orders.confirm", "orders.commercial.read"];
const canOf = (p: string[]): Can => (x) => p.includes(x);

const sample = (o: Record<string, unknown> = {}) => sampleItem({ id: "s1", sampleNumber: "SMP-000001", status: "SUBMITTED", submittedAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...o }) as never;
const order = (o: Record<string, unknown> = {}) => orderListItem({ id: "o1", orderNumber: "ORD-000001", status: "CONFIRMED", priority: "NORMAL", isDelayed: false, ...o }) as never;
const quote = (status: string) => ({ quotation: { quotationId: "q", quotationNumber: "QTN-1", versionId: "v", versionNumber: null, status, total: "100.00" } });
const job = (o: Record<string, unknown> = {}) => ({ id: "j1", jobNumber: "JOB-000001", status: "IN_PROGRESS", priority: "NORMAL", openBlockers: 0, delayedStages: 0, customer: { id: "c", name: "Nile", number: "C" }, productName: "Tee", createdAt: "2026-10-01T10:00:00Z", targetCompletionDate: null, orderId: null, sourceType: "SAMPLE_PRODUCTION", ...o }) as never;
const ship = (o: Record<string, unknown> = {}) => ({ id: "sh1", shipmentNumber: "SHP-000001", status: "FAILED", orderId: "o1", orderNumber: "ORD-000001", recipientName: "Nile", createdAt: "2026-10-01T10:00:00Z", scheduledAt: null, ...o }) as never;

beforeEach(() => { setup(); perms = [...ADMIN]; });

describe("next-action mapping (backend status + permissions, no frontend rules)", () => {
  it("samples: status decides the queue; permissions only change the wording / destination", () => {
    const c = canOf(ADMIN);
    const m = (status: string, can = c) => { const i = classifySample(sample({ status }), can); return i && [i.queue, i.action, i.href]; };
    expect(m("SUBMITTED")).toEqual(["newRequests", "Review request", "/samples/s1"]);
    expect(m("AWAITING_APPROVAL")).toEqual(["needsReview", "Record approval decision", "/samples/s1?tab=approvals"]);
    expect(m("UNDER_REVIEW")).toEqual(["readyForQuotation", "Prepare quotation", "/samples/s1?tab=commercial"]);
    expect(m("QUOTED")).toEqual(["awaitingCustomer", "Record customer decision", "/samples/s1?tab=commercial"]);
    expect(m("AWAITING_PAYMENT")).toEqual(["awaitingPayment", "Verify payment", "/samples/s1?tab=commercial"]);
    expect(m("READY_FOR_PRODUCTION")).toEqual(["readyForProduction", "Start production", "/samples/s1?tab=production"]);
    for (const none of ["DRAFT", "IN_PRODUCTION", "APPROVED", "COMPLETED", "ON_HOLD", "REJECTED", "CANCELLED"]) expect(m(none)).toBeNull();
    // no commercial permissions → plain wording and the sample page (never a tab the user cannot open)
    const limited = canOf(["samples.read"]);
    expect(m("SUBMITTED", limited)).toEqual(["newRequests", "Open request", "/samples/s1"]);
    expect(m("UNDER_REVIEW", limited)).toEqual(["readyForQuotation", "Continue review", "/samples/s1"]);
    expect(m("AWAITING_PAYMENT", limited)).toEqual(["awaitingPayment", "Check payment", "/samples/s1"]);
    expect(m("READY_FOR_PRODUCTION", limited)).toBeNull(); // only people who can create the job get this task
    expect(m("AWAITING_PAYMENT", canOf(["samples.read", "payments.read", "payments.manage"]))?.[1]).toBe("Record payment");
  });
  it("orders: commercial state from the order's commercial summary routes CONFIRMED orders; unknown state is never guessed", () => {
    const c = canOf(ADMIN);
    const m = (ctx: Record<string, unknown>, o = order()) => { const i = classifyOrder(o, ctx as never, c); return i && [i.queue, i.action, i.href]; };
    expect(m({})).toBeNull(); // commercial not loaded / not permitted
    expect(m({ commercial: null })).toEqual(["readyForQuotation", "Prepare quotation", "/orders/o1?tab=commercial"]);
    expect(m({ commercial: { quotation: null } })).toEqual(["readyForQuotation", "Prepare quotation", "/orders/o1?tab=commercial"]);
    expect(m({ commercial: { ...quote("ACCEPTED"), reapprovalRequired: true } })?.[1]).toBe("Re-approve commercial terms");
    expect(m({ commercial: quote("DRAFT") })).toEqual(["readyForQuotation", "Send quotation", "/orders/o1?tab=commercial"]);
    expect(m({ commercial: quote("SENT") })).toEqual(["awaitingCustomer", "Record customer decision", "/orders/o1?tab=commercial"]);
    expect(m({ commercial: { ...quote("ACCEPTED"), releaseGate: { satisfied: false, reasons: ["unpaid"] } } })).toEqual(["awaitingPayment", "Verify payment", "/orders/o1?tab=commercial"]);
    expect(m({ commercial: { ...quote("ACCEPTED"), releaseGate: { satisfied: true, reasons: [] } } })).toEqual(["readyForProduction", "Release to production", "/orders/o1"]);
    expect(m({}, order({ status: "PENDING_CONFIRMATION" }))).toEqual(["needsReview", "Confirm order", "/orders/o1"]);
    expect(m({}, order({ status: "READY_FOR_DELIVERY" }))).toEqual(["readyForShipment", "Create shipment", "/orders/o1?tab=shipments"]);
    expect(m({ fulfillment: { shippableQuantity: 14 } }, order({ status: "PARTIALLY_SHIPPED" }))).toEqual(["readyForShipment", "Create shipment (14 units waiting)", "/orders/o1?tab=shipments"]);
    expect(m({ fulfillment: { shippableQuantity: 0 } }, order({ status: "PARTIALLY_SHIPPED" }))).toBeNull();
    expect(m({}, order({ status: "IN_PRODUCTION" }))).toBeNull();
  });
  it("READY_FOR_PRODUCTION orders: no live job = start production; a PLANNED job = release it (links to the job); a started job belongs to In production", () => {
    const c = canOf(ADMIN);
    const o = order({ status: "READY_FOR_PRODUCTION" });
    expect(classifyOrder(o, { jobs: [] }, c)).toMatchObject({ queue: "readyForProduction", action: "Start production", href: "/orders/o1?tab=production" });
    expect(classifyOrder(o, { jobs: null }, c)?.action).toBe("Start production");
    expect(classifyOrder(o, { jobs: [{ id: "j9", jobNumber: "JOB-9", status: "PLANNED" }] }, c)).toMatchObject({ action: "Release job to factory", href: "/production/jobs/j9" });
    expect(classifyOrder(o, { jobs: [{ id: "j9", jobNumber: "JOB-9", status: "IN_PROGRESS" }] }, c)).toBeNull();
    expect(classifyOrder(o, { jobs: [] }, canOf(["orders.read", "orders.manage"]))).toBeNull(); // no factory_jobs.manage: nothing to act on
  });
  it("jobs, shipments and attention items map to their own next actions and exact links", () => {
    const c = canOf(ADMIN);
    expect(classifyJob(job({ openBlockers: 1 }), c)).toMatchObject({ queue: "inProduction", action: "Resolve blocker", urgency: "high", href: "/production/jobs/j1" });
    expect(classifyJob(job({ delayedStages: 2 }), c)?.action).toBe("Review overdue stage");
    expect(classifyJob(job({ status: "READY" }), c)?.action).toBe("Assign staff and start");
    expect(classifyJob(job({ status: "ON_HOLD" }), c)?.action).toBe("Resume job");
    expect(classifyJob(job(), c)).toMatchObject({ action: "Track progress", urgency: "normal" });
    expect(classifyJob(job({ status: "PLANNED" }), c)).toMatchObject({ queue: "readyForProduction", action: "Release job to factory" });
    expect(classifyJob(job({ status: "COMPLETED" }), c)).toBeNull();
    expect(classifyShipment(ship(), c)).toMatchObject({ queue: "deliveryIssues", action: "Retry or return delivery", urgency: "high", href: "/orders/o1?tab=shipments&shipment=sh1" });
    expect(classifyShipment(ship({ status: "RETURNED" }), c)?.action).toBe("Plan a new shipment");
    expect(classifyShipment(ship({ status: "READY" }), c)).toMatchObject({ queue: "readyForShipment", action: "Dispatch shipment", urgency: "normal" });
    expect(classifyShipment(ship({ status: "DELIVERED" }), c)).toBeNull();
    expect(classifyAttention({ type: "BLOCKED_STAGE", severity: "CRITICAL", title: "x", reference: "JOB-1", context: { jobId: "j1", stageId: "st1" } })).toMatchObject({ action: "Resolve blocker", urgency: "critical", href: "/production/jobs/j1?stage=st1" });
    expect(classifyAttention({ type: "SHIPMENT_FAILED", severity: "WARNING", title: "x", context: { shipmentId: "s", orderId: "o1" } })).toMatchObject({ urgency: "high", href: "/orders/o1?tab=shipments&shipment=s" });
  });
});

describe("actionability: queues and attention items only for people who can act", () => {
  it("read-only factory/delivery access (SALES) yields no production, shipment or attention-action items; ADMIN gets them", () => {
    const sales = canOf(SALES), admin = canOf(ADMIN);
    expect(classifyJob(job({ openBlockers: 1 }), sales)).toBeNull();
    expect(classifyShipment(ship(), sales)).toBeNull();
    expect(classifyShipment(ship({ status: "READY" }), sales)).toBeNull();
    expect(classifyOrder(order({ status: "READY_FOR_DELIVERY" }), {}, sales)).toBeNull();
    expect(classifyOrder(order({ status: "READY_FOR_PRODUCTION" }), { jobs: [] }, sales)).toBeNull();
    expect(classifyAttention({ type: "BLOCKED_STAGE", severity: "CRITICAL", title: "x", context: { jobId: "j1" } }, sales)).toBeNull();
    expect(classifyAttention({ type: "SHIPMENT_FAILED", severity: "WARNING", title: "x", context: { shipmentId: "s", orderId: "o1" } }, sales)).toBeNull();
    expect(classifyAttention({ type: "PAYMENT_BLOCK", severity: "WARNING", title: "x", context: { orderId: "o1" } }, sales)).toMatchObject({ action: "Verify payment" });
    expect(classifyAttention({ type: "BLOCKED_STAGE", severity: "CRITICAL", title: "x", context: { jobId: "j1" } }, admin)).not.toBeNull();
    // commercial release is a SALES action (orders.manage) and stays visible to them
    expect(classifyOrder(order(), { commercial: { ...quote("ACCEPTED"), releaseGate: { satisfied: true, reasons: [] } } } as never, sales)).toMatchObject({ queue: "readyForProduction", action: "Release to production" });
  });
});

describe("priority ordering", () => {
  const it_ = (o: Partial<QueueItem>): QueueItem => ({ id: o.ref ?? "x", queue: "newRequests", kind: "sample", ref: "A", title: "t", action: "a", href: `/${o.ref ?? "x"}`, urgency: "normal", since: null, ...o });
  const now = new Date("2026-10-22T00:00:00Z").getTime();
  it("urgency first, then the queue weight, then how long it has waited; deterministic and one action per destination", () => {
    const items = [
      it_({ ref: "NEW-OLD", queue: "newRequests", since: "2026-10-01T00:00:00Z" }),
      it_({ ref: "PAY", queue: "awaitingPayment", since: "2026-10-21T00:00:00Z" }),
      it_({ ref: "WAIT-CUST", queue: "awaitingCustomer", since: "2026-09-01T00:00:00Z" }),
      it_({ ref: "ATT-CRIT", queue: "attention", kind: "attention", urgency: "critical" }),
      it_({ ref: "JOB-HIGH", queue: "inProduction", kind: "job", urgency: "high" }),
      it_({ ref: "DUP", queue: "newRequests", href: "/PAY" }),
    ];
    expect(rankItems(items, now)).toHaveLength(6); // ranking never drops items (queue counts stay exact)
    expect(uniqueByDestination(rankItems(items, now)).map((i) => i.ref)).toEqual(["ATT-CRIT", "JOB-HIGH", "PAY", "NEW-OLD", "WAIT-CUST"]); // DUP dropped (same href as PAY)
    expect(priorityScore(it_({ urgency: "critical" }), now)).toBeGreaterThan(priorityScore(it_({ urgency: "high", queue: "deliveryIssues" }), now));
    expect(rankItems(items, now)).toEqual(rankItems([...items].reverse(), now)); // stable regardless of input order
  });
  it("quick filters: urgent = critical/high; groups come from the queue", () => {
    expect(matchesFilter(it_({ urgency: "high" }), "urgent")).toBe(true);
    expect(matchesFilter(it_({ urgency: "normal" }), "urgent")).toBe(false);
    expect(matchesFilter(it_({ queue: "deliveryIssues" }), "delivery")).toBe(true);
    expect(matchesFilter(it_({ queue: "deliveryIssues" }), "commercial")).toBe(false);
    expect(matchesFilter(it_({ queue: "readyForProduction" }), "production")).toBe(true);
    expect(matchesFilter(it_({ queue: "attention", kind: "attention" }), "commercial")).toBe(false);
  });
});

const attention = (items: unknown[] = []) => ({ generatedAt: "x", summary: { total: items.length, bySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 }, byType: {} }, items });
const api = (extra: Record<string, unknown> = {}) => mockApi({
  "GET /admin/samples": page([
    sample({ id: "s1", sampleNumber: "SMP-000001", status: "SUBMITTED" }), sample({ id: "s2", sampleNumber: "SMP-000002", status: "UNDER_REVIEW" }), sample({ id: "s3", sampleNumber: "SMP-000003", status: "AWAITING_PAYMENT" }),
    sample({ id: "s4", sampleNumber: "SMP-000004", status: "READY_FOR_PRODUCTION" }), sample({ id: "s5", sampleNumber: "SMP-000005", status: "QUOTED" }), sample({ id: "s6", sampleNumber: "SMP-000006", status: "AWAITING_APPROVAL" }),
  ]),
  "GET /admin/orders": page([
    order({ id: "o1", orderNumber: "ORD-000001", status: "CONFIRMED" }), order({ id: "o2", orderNumber: "ORD-000002", status: "PENDING_CONFIRMATION", priority: "URGENT" }),
    order({ id: "o3", orderNumber: "ORD-000003", status: "READY_FOR_PRODUCTION" }), order({ id: "o4", orderNumber: "ORD-000004", status: "READY_FOR_DELIVERY" }), order({ id: "o5", orderNumber: "ORD-000005", status: "PARTIALLY_SHIPPED" }),
  ]),
  "GET /admin/orders/o1/commercial": { orderId: "o1", orderNumber: "ORD-000001", currency: "EGP", quotationNumber: null, quotationVersionId: null, quotationStatus: null, quotedTotal: null, acceptedTotal: null, verifiedPaid: "0.00", pendingPayments: "0.00", remaining: null, paymentState: "UNPAID", counts: { verified: 0, pending: 0, rejected: 0, cancelled: 0 }, reapprovalRequired: false, releaseGate: { satisfied: false, reasons: [] } },
  "GET /admin/orders/o5": orderDetail({ id: "o5", orderNumber: "ORD-000005", status: "PARTIALLY_SHIPPED", fulfillment: { deliveredQuantity: 5, inFlightQuantity: 0, shippableQuantity: 9, remainingDeliveryQuantity: 9, packagingDefined: true, packedQuantity: 14, packagingComplete: true, trackingEnabled: false } }),
  "GET /admin/factory-jobs": page([job({ id: "j1", jobNumber: "JOB-000001", openBlockers: 1, orderId: "o9" }), job({ id: "j2", jobNumber: "JOB-000002", status: "PLANNED", orderId: "o3" })]),
  "GET /admin/shipments": (r: { query: URLSearchParams }) => json(200, page(r.query.get("status") === "FAILED" ? [ship()] : r.query.get("status") === "READY" ? [ship({ id: "sh2", shipmentNumber: "SHP-000002", status: "READY" })] : [])),
  "GET /admin/management/needs-attention": attention([{ type: "BLOCKED_STAGE", severity: "CRITICAL", title: "Cutting", reference: "JOB-000001", context: { jobId: "j1", stageId: "st1" } }]),
  ...extra,
});

describe("Command Center", () => {
  it("queue membership, counts and exact destinations: every item opens the entity where the next action happens", async () => {
    api();
    renderWithClient(<CommandCenter />);
    await screen.findAllByTestId("queue-card");
    await waitFor(() => expect(screen.getByTestId("queue-grid").querySelector('[data-queue="deliveryIssues"]')).toHaveAttribute("data-count", "1"));
    const card = (q: string) => screen.getByTestId("queue-grid").querySelector(`[data-queue="${q}"]`) as HTMLElement;
    const hrefs = (q: string) => within(card(q)).queryAllByTestId("next-action-link").map((a) => [a.textContent, a.getAttribute("href")]);
    await waitFor(() => expect(card("readyForQuotation").getAttribute("data-count")).toBe("2"));
    expect(hrefs("newRequests")).toEqual([["Review request", "/samples/s1"]]);
    expect(card("needsReview").getAttribute("data-count")).toBe("2");
    expect(hrefs("needsReview").map((x) => x[1])).toEqual(expect.arrayContaining(["/samples/s6?tab=approvals", "/orders/o2"]));
    expect(hrefs("readyForQuotation").map((x) => x[1])).toEqual(expect.arrayContaining(["/samples/s2?tab=commercial", "/orders/o1?tab=commercial"]));
    expect(hrefs("awaitingCustomer")).toEqual([["Record customer decision", "/samples/s5?tab=commercial"]]);
    expect(hrefs("awaitingPayment")).toEqual([["Verify payment", "/samples/s3?tab=commercial"]]);
    expect(card("readyForProduction").getAttribute("data-count")).toBe("2"); // sample + the order's PLANNED job (the order and its job point at the same place: one row)
    expect(hrefs("readyForProduction").map((x) => x[1])).toEqual(expect.arrayContaining(["/samples/s4?tab=production", "/production/jobs/j2"]));
    expect(hrefs("inProduction")).toEqual([["Resolve blocker", "/production/jobs/j1"]]);
    await waitFor(() => expect(card("readyForShipment").getAttribute("data-count")).toBe("3"));
    expect(hrefs("readyForShipment").map((x) => x[1])).toEqual(expect.arrayContaining(["/orders/o4?tab=shipments", "/orders/o1?tab=shipments&shipment=sh2"]));
    expect(hrefs("deliveryIssues")).toEqual([["Retry or return delivery", "/orders/o1?tab=shipments&shipment=sh1"]]);
    expect(within(card("deliveryIssues")).getByRole("link", { name: /Open queue/ })).toHaveAttribute("href", "/delivery?status=FAILED");
    expect(within(card("newRequests")).getByRole("link", { name: /Open queue/ })).toHaveAttribute("href", "/samples?status=SUBMITTED");
    expect(screen.getByTestId("attention-card")).toHaveTextContent("1");
  });
  it("'What to do next' ranks the most urgent first (critical attention, then high-risk, then normal by queue weight)", async () => {
    api();
    renderWithClient(<CommandCenter />);
    const list = await screen.findByRole("list", { name: "Next actions" });
    await waitFor(() => expect(within(list).getAllByTestId("command-item").length).toBeGreaterThan(3));
    const rows = within(list).getAllByTestId("command-item");
    expect(rows[0]).toHaveAttribute("data-urgency", "critical");
    expect(rows[0]).toHaveTextContent("Resolve blocker");
    const urg = rows.map((r) => r.getAttribute("data-urgency"));
    expect(urg).toEqual([...urg].sort((a, b) => ["critical", "high", "normal"].indexOf(a!) - ["critical", "high", "normal"].indexOf(b!)));
    expect(rows.length).toBeLessThanOrEqual(6);
  });
  it("quick filters narrow queues and next actions; Delivery shows only delivery queues", async () => {
    api();
    renderWithClient(<CommandCenter />);
    await screen.findAllByTestId("queue-card");
    await userEvent.click(screen.getByRole("button", { name: "Delivery" }));
    await waitFor(() => expect(screen.getAllByTestId("queue-card").map((c) => c.getAttribute("data-queue")).sort()).toEqual(["deliveryIssues", "readyForShipment"]));
    expect(screen.queryByTestId("attention-card")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Urgent" }));
    await waitFor(() => expect(screen.getAllByTestId("command-item").every((r) => r.getAttribute("data-urgency") !== "normal")).toBe(true));
  });
  it("permissions: a SALES-style user gets only commercial/sample queues — no jobs, shipments or order-detail calls they cannot make", async () => {
    perms = [...SALES];
    const calls = api();
    renderWithClient(<CommandCenter />);
    await screen.findAllByTestId("queue-card");
    const queues = screen.getAllByTestId("queue-card").map((c) => c.getAttribute("data-queue"));
    expect(queues).toEqual(expect.arrayContaining(["newRequests", "readyForQuotation", "awaitingPayment"]));
    expect(queues).not.toContain("inProduction");
    expect(queues).not.toContain("deliveryIssues");
    expect(queues).not.toContain("readyForShipment");
    const paths = calls.map((c) => c.path);
    expect(paths).not.toContain("/admin/factory-jobs");
    expect(paths).not.toContain("/admin/shipments");
    // orders READY_FOR_PRODUCTION cannot be matched to jobs without jobs.read_all → plain "Start production" is not offered, wording is neutral
    // read-only on factory/delivery work: those queues and their actions are not offered
    await waitFor(() => expect(screen.getByTestId("queue-grid").querySelector('[data-queue="readyForProduction"]')).toHaveAttribute("data-count", "0"));
    expect(screen.queryAllByTestId("command-item").map((r) => r.textContent).join(" ")).not.toMatch(/Release job to factory|Start production|Create shipment|Resolve blocker|Handle failed delivery/);
  });
  it("nothing to do: 'You're all caught up', then the management sections remain", async () => {
    mockApi({ "GET /admin/samples": page([]), "GET /admin/orders": page([]), "GET /admin/factory-jobs": page([]), "GET /admin/shipments": page([]), "GET /admin/management/needs-attention": attention([]) });
    renderWithClient(<CommandCenter />);
    expect(await screen.findByTestId("all-caught-up")).toHaveTextContent("You're all caught up");
    expect(screen.queryByTestId("next-actions")).not.toBeInTheDocument();
    for (const c of screen.getAllByTestId("queue-card")) expect(c).toHaveAttribute("data-count", "0");
  });
  it("one failing list only marks the cards that use it (samples 500): order/job/shipment queues still work and the page never signs out", async () => {
    api({ "GET /admin/samples": json(500, { statusCode: 500, message: "boom" }) });
    renderWithClient(<CommandCenter />);
    await waitFor(() => expect(screen.getAllByTestId("queue-error").length).toBeGreaterThan(0));
    const card = (q: string) => screen.getByTestId("queue-grid").querySelector(`[data-queue="${q}"]`) as HTMLElement;
    expect(within(card("newRequests")).getByTestId("queue-error")).toBeInTheDocument();
    expect(within(card("inProduction")).queryByTestId("queue-error")).not.toBeInTheDocument();
    await waitFor(() => expect(card("deliveryIssues").getAttribute("data-count")).toBe("1"));
    expect(card("inProduction").getAttribute("data-count")).toBe("1");
  });
  it("a user with none of the source permissions (e.g. QC) sees no Command Center content", () => {
    perms = ["quality_kpis.read"];
    const calls = mockApi({});
    renderWithClient(<CommandCenter />);
    expect(screen.queryByTestId("command-center")).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
  it("the dashboard puts actions before analytics: Command Center → Needs attention → management intelligence", async () => {
    api();
    renderWithClient(<ManagementDashboard />);
    const cc = await screen.findByTestId("command-center");
    const att = await screen.findByTestId("needs-attention");
    expect(cc.compareDocumentPosition(att) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Command Center" })).toBeInTheDocument();
  });
});

describe("start production from a ready sample (the Command Center destination)", () => {
  const sd = (status: string) => ({ id: "s1", sampleNumber: "SMP-000001", status, revisionOfId: null, revisionNumber: 1 }) as never;
  it("a READY_FOR_PRODUCTION sample with no live job offers 'Create production job' (factory_jobs.manage) and posts to create-factory-job; the job opens in Production", async () => {
    const calls = mockApi({ "GET /admin/samples/s1/production-specs": [], "GET /admin/factory-jobs": page([]), "POST /admin/samples/s1/create-factory-job": json(201, { id: "j7", jobNumber: "JOB-000007" }) });
    renderWithClient(<ProductionPanel sample={sd("READY_FOR_PRODUCTION")} canSeeJobs />);
    await userEvent.click(await screen.findByRole("button", { name: "Create production job" }));
    const dlg = await screen.findByRole("dialog", { name: /Create production job for SMP-000001/ });
    await userEvent.click(within(dlg).getByRole("button", { name: "Create factory job" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/admin/samples/s1/create-factory-job")?.method).toBe("POST"));
  });
  it("no button for other statuses, without the permission, or when a live job exists", async () => {
    mockApi({ "GET /admin/samples/s1/production-specs": [], "GET /admin/factory-jobs": page([{ id: "j1", jobNumber: "JOB-1", sourceType: "SAMPLE_PRODUCTION", status: "IN_PROGRESS", priority: "NORMAL", sampleNumber: "SMP-000001", progress: null, startedAt: null, completedAt: null, targetCompletionDate: null }]) });
    const a = renderWithClient(<ProductionPanel sample={sd("READY_FOR_PRODUCTION")} canSeeJobs />);
    await screen.findByTestId("sample-jobs");
    expect(screen.queryByRole("button", { name: "Create production job" })).not.toBeInTheDocument();
    a.unmount();
    mockApi({ "GET /admin/samples/s1/production-specs": [], "GET /admin/factory-jobs": page([]) });
    const b = renderWithClient(<ProductionPanel sample={sd("IN_PRODUCTION")} canSeeJobs />);
    await screen.findByText("No production job yet");
    expect(screen.queryByRole("button", { name: "Create production job" })).not.toBeInTheDocument();
    b.unmount();
    perms = ["samples.read"];
    mockApi({ "GET /admin/samples/s1/production-specs": [], "GET /admin/factory-jobs": page([]) });
    renderWithClient(<ProductionPanel sample={sd("READY_FOR_PRODUCTION")} canSeeJobs />);
    await screen.findByText("No production job yet");
    expect(screen.queryByRole("button", { name: "Create production job" })).not.toBeInTheDocument();
  });
});
