import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { json, mockApi, renderWithClient, setup } from "./helpers";

const replace = vi.fn();
let search = "";
let pathname = "/dashboard";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams(search) }));
let perms: string[] = [];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated", user: { id: "u1", name: "Sara", email: "", roles: [], permissions: perms } }),
}));

import { filterNav } from "@/features/navigation/nav-config";
import { attentionHref, currencyKeys, etaView, formatMinutes, formatPercent, presetRange, rangeFromParams, referenceHref, utilizationState } from "@/features/management/logic";
import { AlertsPage, CommercialPage, ManagementDashboard, ProductionInsightsPage, QualityPage, WorkloadPage } from "@/features/management/pages";
import { BottlenecksSection, CapacitySection, CommercialBlocks, NeedsAttentionSection, WipSection } from "@/features/management/sections";
import { createPermissionChecker } from "@/lib/permissions";

const ALL = ["dashboard.read", "management_kpis.read", "quality_kpis.read", "commercial_kpis.read", "workload.read", "capacity.read", "automation.read", "eta.read"];
const stamp = { generatedAt: "2026-10-22T10:00:00Z", timezone: "Africa/Cairo", range: { from: "2026-09-22T10:00:00Z", to: "2026-10-22T10:00:00Z" } };
const production = (o: Record<string, unknown> = {}) => ({ ...stamp, activeJobs: 3, plannedJobs: 1, onHoldJobs: 0, blockedJobs: 2, delayedJobs: 4, completedJobs: 5, completedToday: 1, completedThisWeek: 2, averageLeadTimeMinutes: null, averageStageDurationMinutes: 12, stagesMeasured: 31, onTimeCompletion: { onTime: 0, measured: 0, ratePercent: null }, ...o });
const orders = { ...stamp, current: { inProduction: 1, productionCompleted: 0, readyForDelivery: 2, partiallyShipped: 3, outForDelivery: 0, delivered: 0, completed: 0, cancelled: 0, onHold: 0, delayed: 5 }, inRange: { delivered: 0, completed: 0, cancelled: 0 }, averageCycleTimeMinutes: null, onTimeDelivery: { onTime: 0, measured: 0, ratePercent: null } };
const delivery = { ...stamp, shipments: { draft: 0, ready: 1, dispatched: 0, inTransit: 0, failed: 2, deliveredInRange: 1, returnedInRange: 0 }, averageDispatchToDeliveryMinutes: null, dispatchToDeliveryMeasured: 0, partialDeliveryOrders: 1, overdueDeliveryCommitments: { ordersPastTargetDate: 3, shipmentsPastScheduledDate: 1 } };
const quality = (o: Record<string, unknown> = {}) => ({ ...stamp, inspections: { completed: 0, inProgress: 0, pass: 0, fail: 0, conditionalPass: 0, passRatePercent: null, failRatePercent: null, conditionalPassRatePercent: null, inspectedUnits: 0, failedUnits: 0 }, rework: { created: 0, open: 0, affectedQuantity: 0 }, rejectedUnits: 0, reworkFlaggedUnits: 0, failuresByStage: [], failuresByProduct: [], repeatFailure: { jobStagesWithFailure: 0, repeated: 0, ratePercent: null }, notDerived: ["Failures by fabric: the fabric is not stored on the job"], ...o });
const cur = (currency: string, v: string) => ({ currency, ordersWithAcceptedQuotation: 1, acceptedQuotationValue: v, verifiedPayments: "100.00", outstandingBalance: "900.00", overpaidAmount: "0.00" });
const commercial = (o: Record<string, unknown> = {}) => ({ ...stamp, byCurrency: [cur("EGP", "1000.00"), cur("USD", "50.00")], verifiedInRange: [{ currency: "EGP", target: "ORDER", total: "100.00", payments: 1 }, { currency: "USD", target: "ORDER", total: "20.00", payments: 1 }], orders: { unpaid: 1, partiallyPaid: 0, paid: 0, withoutAcceptedQuotation: 0, commercialReapprovalRequired: 0 }, ...o });
const attention = (items: unknown[], over: Record<string, unknown> = {}) => ({ generatedAt: "x", summary: { total: items.length, bySeverity: { CRITICAL: 1, WARNING: 0, INFO: 0 }, byType: { BLOCKED_STAGE: 1 } }, items, note: "ranked", ...over });
const item = (o: Record<string, unknown> = {}) => ({ type: "BLOCKED_STAGE", severity: "CRITICAL", entityType: "JOB_STAGE", entityId: "st1", reference: "JOB-000001", title: "Cutting · Tee", reason: "Blocked: no fabric", priority: "HIGH", responsible: { department: "CUTTING", users: [{ name: "Cara" }] }, ageMinutes: 125, dueAt: "2026-10-23T10:00:00Z", context: { jobId: "j1", stageId: "st1" }, ...o });
const noopDash = { "GET /admin/dashboard": { pipeline: { samples: { draft: 1 }, orders: { draft: 2 } } } };

beforeEach(() => { setup(); replace.mockClear(); search = ""; pathname = "/dashboard"; perms = [...ALL]; });

describe("pure management logic", () => {
  it("null is unknown, never zero: percentages, durations and ETA", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(88.94)).toBe("88.9%");
    expect(formatMinutes(null)).toBe("—");
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(125)).toBe("2h 5m");
    expect(utilizationState({ utilizationPercent: null, overloaded: false })).toBe("unknown");
    expect(utilizationState({ utilizationPercent: 0, overloaded: false })).toBe("idle");
    expect(utilizationState({ utilizationPercent: 120, overloaded: true })).toBe("overloaded");
  });
  it("ETA wording follows the backend's data quality; low confidence always carries the caveat; no estimate = Not estimable", () => {
    const f = () => "28 Oct 2026";
    expect(etaView("2026-10-28T00:00:00Z", "HIGH", f)).toEqual({ label: "Estimated completion: 28 Oct 2026", tone: "ok", caveat: null });
    expect(etaView("2026-10-28T00:00:00Z", "LOW", f).caveat).toBe("Low confidence — insufficient recent production data");
    expect(etaView("2026-10-28T00:00:00Z", "MEDIUM", f).tone).toBe("caution");
    expect(etaView(null, "HIGH", f)).toMatchObject({ label: "Not estimable", tone: "unknown" });
    expect(etaView("2026-10-28T00:00:00Z", undefined, f).caveat).toBe("Confidence not reported");
  });
  it("Needs Attention rows route straight to the entity (stage, shipment, payment tab, sample, reference search)", () => {
    expect(attentionHref(item() as never)).toBe("/production/jobs/j1?stage=st1");
    expect(attentionHref({ type: "SHIPMENT_FAILED", context: { shipmentId: "s1", orderId: "o1" } } as never)).toBe("/orders/o1?tab=shipments&shipment=s1");
    expect(attentionHref({ type: "PAYMENT_BLOCK", context: { orderId: "o1" } } as never)).toBe("/orders/o1?tab=commercial");
    expect(attentionHref({ type: "OVERDUE_ORDER", context: { orderId: "o1" } } as never)).toBe("/orders/o1");
    expect(attentionHref({ type: "X", context: { sampleId: "sa1" } } as never)).toBe("/samples/sa1");
    expect(attentionHref({ type: "X", entityType: "ORDER", entityId: "o9" } as never)).toBe("/orders/o9");
    expect(attentionHref({ type: "X", reference: "JOB-000007" } as never)).toBe("/production?view=table&search=JOB-000007");
    expect(referenceHref("ORD-000003")).toBe("/orders?search=ORD-000003");
    expect(referenceHref("unknown")).toBeNull();
  });
  it("range parsing: only business-day dates are accepted; presets are inclusive day ranges; currencies are never merged", () => {
    expect(rangeFromParams(new URLSearchParams("from=2026-10-01&to=bad"))).toEqual({ from: "2026-10-01", to: undefined });
    expect(presetRange(7, new Date("2026-10-22T12:00:00Z"))).toEqual({ from: "2026-10-15", to: "2026-10-22" });
    expect(currencyKeys([{ currency: "USD" }, { currency: "EGP" }, { currency: "USD" }])).toEqual(["EGP", "USD"]);
  });
  it("management nav is permission-based (codes only): SALES-like users do not get quality/commercial/workload/alerts", () => {
    const labels = (p: string[]) => filterNav(createPermissionChecker(p)).flatMap((s) => s.items.map((i) => i.label));
    expect(labels(["management_kpis.read"])).toEqual(expect.arrayContaining(["Production overview", "Delivery KPIs"]));
    for (const bad of ["Quality", "Commercial", "Workload & capacity", "Alerts"]) expect(labels(["management_kpis.read"])).not.toContain(bad);
    expect(labels(["quality_kpis.read"])).toContain("Quality");
    expect(labels(["capacity.read"])).toContain("Workload & capacity");
    expect(labels(ALL)).toEqual(expect.arrayContaining(["Quality", "Commercial", "Workload & capacity", "Alerts"]));
  });
});

describe("Needs Attention", () => {
  it("renders severity, reference, reason, responsibility, age and a direct link; filters go to the backend (limit/type/minSeverity)", async () => {
    const calls = mockApi({ "GET /admin/management/needs-attention": () => json(200, attention([item(), item({ type: "SHIPMENT_FAILED", reference: "ORD-1", title: "Shipment SHP-1", severity: "WARNING", context: { shipmentId: "s1", orderId: "o1" } })])) });
    renderWithClient(<NeedsAttentionSection />);
    const rows = await screen.findAllByTestId("attention-item");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("JOB-000001");
    expect(rows[0]).toHaveTextContent("Blocked: no fabric");
    expect(rows[0]).toHaveTextContent("Cutting · Cara");
    expect(rows[0]).toHaveTextContent("2h 5m");
    expect(within(rows[0]!).getByRole("link", { name: /Open JOB-000001/ })).toHaveAttribute("href", "/production/jobs/j1?stage=st1");
    expect(within(rows[1]!).getByRole("link")).toHaveAttribute("href", "/orders/o1?tab=shipments&shipment=s1");
    expect(screen.getByTestId("attention-summary")).toHaveTextContent("2 open");
    expect(Object.fromEntries(new URLSearchParams(calls[0]!.query))).toEqual({ limit: "15" });
    await userEvent.click(screen.getByRole("combobox", { name: "Minimum severity" }));
    await userEvent.click(await screen.findByRole("option", { name: "Warning+" }));
    await waitFor(() => expect(calls.some((c) => new URLSearchParams(c.query).get("minSeverity") === "WARNING")).toBe(true));
  });
  it("an empty list is a positive state, not an error", async () => {
    mockApi({ "GET /admin/management/needs-attention": attention([], { summary: { total: 0, bySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 }, byType: {} } }) });
    renderWithClient(<NeedsAttentionSection />);
    expect(await screen.findByTestId("positive-empty")).toHaveTextContent("Nothing needs attention");
  });
});

describe("KPIs: null vs zero, currencies", () => {
  it("quality: a null rate renders '—' (never 0%) while a real 0 renders 0 — and the stage failure list is ranked from the backend", async () => {
    mockApi({ "GET /admin/management/kpis/quality": () => json(200, quality()) });
    perms = ["quality_kpis.read"]; pathname = "/management/quality";
    renderWithClient(<QualityPage />);
    expect(await screen.findByTestId("pass-rate")).toHaveTextContent("—");
    expect(screen.getByTestId("pass-rate")).not.toHaveTextContent("0%");
    expect(screen.getByTestId("pass-rate")).toHaveTextContent("No inspections in range");
    expect(screen.getByTestId("fail-rate")).toHaveTextContent("—");
    expect(await screen.findByTestId("repeat-rate")).toHaveTextContent("—");
    expect(screen.getByTestId("not-derived")).toHaveTextContent("Failures by fabric");
    expect(screen.getAllByTestId("positive-empty").length).toBeGreaterThan(0);
  });
  it("quality with real numbers: rates, segment bar and failures by stage", async () => {
    mockApi({ "GET /admin/management/kpis/quality": () => json(200, quality({ inspections: { completed: 9, inProgress: 0, pass: 8, fail: 1, conditionalPass: 0, passRatePercent: 88.9, failRatePercent: 11.1, conditionalPassRatePercent: 0, inspectedUnits: 180, failedUnits: 4 }, failuresByStage: [{ stageCode: "QC_GATE_1", stageName: "QC Gate 1", failures: 1, failedUnits: 4 }], repeatFailure: { jobStagesWithFailure: 1, repeated: 0, ratePercent: 0 } })) });
    perms = ["quality_kpis.read"];
    renderWithClient(<QualityPage />);
    expect(await screen.findByTestId("pass-rate")).toHaveTextContent("88.9%");
    expect(screen.getByRole("img", { name: /Inspection results: Pass 8, Conditional 0, Fail 1/ })).toBeInTheDocument();
    expect(await screen.findByTestId("repeat-rate")).toHaveTextContent("0%"); // a real zero is shown as 0
    expect(screen.getByTestId("ranked-bars")).toHaveTextContent("QC Gate 1");
  });
  it("commercial: each currency in its own block, amounts formatted per currency, never summed", async () => {
    mockApi({ "GET /admin/management/kpis/commercial": () => json(200, commercial()) });
    perms = ["commercial_kpis.read"]; pathname = "/management/commercial";
    renderWithClient(<CommercialPage />);
    const egp = await screen.findByTestId("currency-EGP");
    const usd = screen.getByTestId("currency-USD");
    expect(egp).toHaveTextContent("1,000.00");
    expect(usd).toHaveTextContent("50.00");
    expect(egp.textContent).not.toContain("1,050");
    expect(document.body.textContent).not.toContain("1,050.00");
    expect(await screen.findAllByTestId("verified-row")).toHaveLength(2);
    expect(screen.getByTestId("currencies")).toHaveTextContent("EGP, USD");
  });
  it("no accepted quotations: an explicit empty message, no fake 0.00 totals", () => {
    renderWithClient(<CommercialBlocks blocks={[]} />);
    expect(screen.getByTestId("no-currency")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("0.00");
  });
});

describe("dashboard architecture", () => {
  it("only the sections the permission set allows are requested; SALES-style users never call quality/commercial/workload/capacity/alerts", async () => {
    perms = ["dashboard.read", "management_kpis.read"];
    const calls = mockApi({ "GET /admin/management/needs-attention": attention([]), "GET /admin/management/kpis/production": production(), "GET /admin/management/kpis/orders": orders, "GET /admin/management/kpis/delivery": delivery, "GET /admin/management/bottlenecks": { ...stamp, orderedBy: "totalWaitMinutes", stages: [] }, ...noopDash });
    renderWithClient(<ManagementDashboard />);
    await screen.findByTestId("risk-section");
    await screen.findByTestId("bottlenecks");
    const paths = new Set(calls.map((c) => c.path));
    for (const bad of ["/admin/management/kpis/quality", "/admin/management/kpis/commercial", "/admin/management/workload/departments", "/admin/management/capacity/utilization", "/admin/automation/alerts"]) expect(paths.has(bad)).toBe(false);
    expect(screen.queryByTestId("quality-kpis")).not.toBeInTheDocument();
    expect(screen.queryByTestId("commercial-kpis")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workload")).not.toBeInTheDocument();
  });
  it("one failing endpoint only breaks its own card (quality 500) and a 403 section is a quiet note, never a sign-out", async () => {
    const calls = mockApi({
      "GET /admin/management/needs-attention": attention([item()]), "GET /admin/management/kpis/production": production(), "GET /admin/management/kpis/orders": orders, "GET /admin/management/kpis/delivery": delivery,
      "GET /admin/management/bottlenecks": { ...stamp, orderedBy: "totalWaitMinutes", stages: [] }, "GET /admin/management/kpis/quality": json(500, { statusCode: 500, message: "boom" }), "GET /admin/management/kpis/commercial": json(403, { statusCode: 403, message: "no" }),
      "GET /admin/management/workload/departments": { generatedAt: "x", departments: [] }, "GET /admin/management/capacity/utilization": { timezone: "Africa/Cairo", from: "a", to: "b", generatedAt: "x", assumptions: [], series: [], departmentsWithoutCapacity: [] },
      "GET /admin/automation/alerts": { data: [], meta: { page: 1, pageSize: 5, total: 0 } }, ...noopDash,
    });
    renderWithClient(<ManagementDashboard />);
    expect(await screen.findByTestId("attention-item")).toBeInTheDocument();
    const q = await screen.findByTestId("quality-kpis");
    await waitFor(() => expect(q).toHaveTextContent("Could not load quality"));
    expect(await within(screen.getByTestId("commercial-kpis")).findByTestId("section-forbidden")).toBeInTheDocument();
    expect(screen.getByTestId("production-kpis")).toHaveTextContent("Active jobs");
    expect(screen.getByTestId("production-kpis")).toHaveTextContent("—"); // null lead time: unknown, not 0
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining("/login"));
    expect(calls.length).toBeGreaterThan(8);
  });
  it("risk strip drills down: blocked → /production?blocked=true, delayed orders → /orders?delayed=true, failed deliveries → /delivery?status=FAILED", async () => {
    perms = ["dashboard.read", "management_kpis.read"];
    mockApi({ "GET /admin/management/needs-attention": attention([]), "GET /admin/management/kpis/production": production(), "GET /admin/management/kpis/orders": orders, "GET /admin/management/kpis/delivery": delivery, "GET /admin/management/bottlenecks": { ...stamp, orderedBy: "x", stages: [] }, ...noopDash });
    renderWithClient(<ManagementDashboard />);
    const risk = await screen.findByTestId("risk-section");
    await waitFor(() => expect(within(risk).getByRole("link", { name: /Blocked jobs/ })).toHaveTextContent("2"));
    expect(within(risk).getByRole("link", { name: /Blocked jobs/ })).toHaveAttribute("href", "/production?blocked=true");
    expect(within(risk).getByRole("link", { name: /Delayed orders/ })).toHaveAttribute("href", "/orders?delayed=true");
    expect(within(risk).getByRole("link", { name: /Failed deliveries/ })).toHaveAttribute("href", "/delivery?status=FAILED");
    expect(within(risk).getByRole("link", { name: /Past target date/ })).toHaveTextContent("3");
  });
  it("the date range is forwarded to every KPI endpoint as from/to", async () => {
    search = "from=2026-10-01&to=2026-10-15";
    perms = ["dashboard.read", "management_kpis.read"];
    const calls = mockApi({ "GET /admin/management/needs-attention": attention([]), "GET /admin/management/kpis/production": production(), "GET /admin/management/kpis/orders": orders, "GET /admin/management/kpis/delivery": delivery, "GET /admin/management/bottlenecks": { ...stamp, orderedBy: "x", stages: [] }, ...noopDash });
    renderWithClient(<ManagementDashboard />);
    await screen.findByTestId("production-kpis");
    await waitFor(() => expect(calls.filter((c) => c.path.includes("/kpis/")).length).toBeGreaterThanOrEqual(3));
    for (const c of calls.filter((c) => c.path.includes("/kpis/") || c.path.includes("bottlenecks"))) expect(Object.fromEntries(new URLSearchParams(c.query))).toMatchObject({ from: "2026-10-01", to: "2026-10-15" });
    expect(calls.find((c) => c.path.includes("needs-attention"))!.query).not.toContain("from=");
  });
  it("without dashboard.read the dashboard is Access denied (no requests)", async () => {
    perms = ["quality_kpis.read"];
    const calls = mockApi({});
    renderWithClient(<ManagementDashboard />);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});

describe("bottlenecks, WIP, capacity", () => {
  const stage = (o: Record<string, unknown>) => ({ stageCode: "CUTTING", stageName: "Cutting", department: "CUTTING", completedInRange: 5, averageDurationMinutes: 4, startedInRange: 5, averageWaitBeforeStartMinutes: null, queuedNow: 0, queuedJobsNow: 0, blockedNow: 0, overdueNow: 0, qcInspections: null, qcFailureRatePercent: null, reworkTargeted: 0, reworkRatePercent: null, totalWaitMinutes: 0, ...o });
  it("bottlenecks keep the backend order (most accumulated waiting first), show null waits as '—', and flag blocked/overdue", async () => {
    mockApi({ "GET /admin/management/bottlenecks": { ...stamp, orderedBy: "totalWaitMinutes", caution: "Descriptive only.", stages: [stage({ stageCode: "SEWING", stageName: "Sewing", totalWaitMinutes: 300, queuedNow: 4, overdueNow: 2, averageWaitBeforeStartMinutes: 75 }), stage({ stageName: "Cutting", totalWaitMinutes: 20 })] } });
    renderWithClient(<BottlenecksSection range={{}} />);
    const rows = await screen.findAllByTestId("bottleneck-row");
    expect(rows.map((r) => r.querySelector("th")?.textContent)).toEqual(["Sewing", "Cutting"]);
    expect(rows[0]).toHaveTextContent("1h 15m");
    expect(rows[1]).toHaveTextContent("—");
    expect(screen.getByText("Descriptive only.")).toBeInTheDocument();
  });
  it("no queued/blocked/overdue work is a positive state, not an error", async () => {
    mockApi({ "GET /admin/management/bottlenecks": { ...stamp, orderedBy: "totalWaitMinutes", stages: [stage({})] } });
    renderWithClient(<BottlenecksSection range={{}} />);
    expect(await screen.findByTestId("positive-empty")).toHaveTextContent("No current bottlenecks");
  });
  it("WIP: per-stage queued/active/blocked bars from backend counts; nothing in progress = positive empty", async () => {
    const w = (q: number, a: number, b: number) => ({ stageCode: "CUTTING", stageName: "Cutting", department: "CUTTING", sequence: 30, queued: { stages: q, jobs: q, units: 0 }, active: { stages: a, jobs: a, units: 0 }, blocked: { stages: b, jobs: b, units: 0 }, upcomingStages: 0, completedToday: { stages: 2, units: 0 } });
    mockApi({ "GET /admin/management/wip": { generatedAt: "x", stages: [w(2, 1, 1)] } });
    const a = renderWithClient(<WipSection />);
    expect(await screen.findByRole("img", { name: /Cutting: Queued 2, Active 1, Blocked 1/ })).toBeInTheDocument();
    a.unmount();
    mockApi({ "GET /admin/management/wip": { generatedAt: "x", stages: [w(0, 0, 0)] } });
    renderWithClient(<WipSection />);
    expect(await screen.findByTestId("positive-empty")).toHaveTextContent("No work in progress");
  });
  it("capacity: backend flags decide overloaded; null utilization is '—' (no capacity), and no configured capacity is stated plainly", async () => {
    const day = (o: Record<string, unknown>) => ({ date: "2026-10-22", demand: 6, capacity: 5, utilizationPercent: 120, overloaded: true, remainingCapacity: 0, capacityUnit: "JOBS", ...o });
    mockApi({ "GET /admin/management/capacity/utilization": { timezone: "Africa/Cairo", from: "2026-10-22", to: "2026-10-23", generatedAt: "x", assumptions: ["Every calendar day is a working day"], departmentsWithoutCapacity: ["SEWING"], series: [{ departmentType: "CUTTING", stageDefinitionId: null, stageCode: null, overloadedDays: 1, days: [day({}), day({ date: "2026-10-23", utilizationPercent: null, overloaded: false, capacity: 0, demand: 2 })] }] } });
    const a = renderWithClient(<CapacitySection />);
    const row = await screen.findByTestId("capacity-row");
    const cells = row.querySelectorAll("[data-state]");
    expect([...cells].map((c) => c.getAttribute("data-state"))).toEqual(["overloaded", "unknown"]);
    expect(cells[1]).toHaveTextContent("—");
    expect(screen.getByTestId("without-capacity")).toHaveTextContent("Sewing");
    a.unmount();
    mockApi({ "GET /admin/management/capacity/utilization": { timezone: "Africa/Cairo", from: "a", to: "b", generatedAt: "x", assumptions: [], series: [], departmentsWithoutCapacity: [] } });
    renderWithClient(<CapacitySection />);
    expect(await screen.findByTestId("no-capacity")).toHaveTextContent("No department capacity is configured");
  });
});

describe("management board: ETA confidence and drill-down", () => {
  const row = (o: Record<string, unknown> = {}) => ({ jobId: "j1", jobNumber: "JOB-000001", kind: "BULK", orderId: "o1", orderNumber: "ORD-1", sampleId: null, sampleNumber: null, batchNumber: null, customerName: "Nile", brandName: "Core", productName: "Tee", priority: "HIGH", status: "IN_PROGRESS", currentStages: [{ stageId: "st1", stageCode: "SEWING", stageName: "Sewing", department: "SEWING", status: "IN_PROGRESS", dueAt: null, assignees: [] }], progress: { stagesCompleted: 4, stagesRequired: 10, percent: 40, completedQuantity: 10, plannedQuantity: 100 }, assignees: [], blocked: false, delayed: true, delayReasons: ["STAGE_OVERDUE"], delayMinutes: 125, targetCompletionDate: null, estimatedCompletionAt: "2026-10-28T10:00:00Z", etaDataQuality: "LOW", projectedLate: true, ...o });
  it("rows open the real Factory Job (and stage), show delay reasons and ETA with its confidence; callers without eta.read get no ETA column", async () => {
    pathname = "/management/production";
    mockApi({ "GET /admin/management/production-board": { data: [row(), row({ jobId: "j2", jobNumber: "JOB-000002", estimatedCompletionAt: null, etaDataQuality: "LOW", projectedLate: false, delayed: false, delayReasons: [] })], meta: { page: 1, pageSize: 20, total: 2 }, generatedAt: "x", etaIncluded: true }, "GET /admin/management/bottlenecks": { ...stamp, orderedBy: "x", stages: [] }, "GET /admin/management/wip": { generatedAt: "x", stages: [] } });
    const a = renderWithClient(<ProductionInsightsPage />);
    const rows = await screen.findAllByTestId("board-row");
    expect(within(rows[0]!).getByRole("link", { name: "JOB-000001" })).toHaveAttribute("href", "/production/jobs/j1");
    expect(within(rows[0]!).getByRole("link", { name: "Sewing" })).toHaveAttribute("href", "/production/jobs/j1?stage=st1");
    expect(rows[0]).toHaveTextContent("Delayed 2h 5m");
    expect(rows[0]).toHaveTextContent("Projected late");
    expect(rows[0]!.querySelector("[data-testid=eta]")).toHaveAttribute("data-quality", "LOW");
    expect(rows[0]).toHaveTextContent("Low confidence");
    expect(rows[1]!.querySelector("[data-testid=eta]")).toHaveTextContent("Not estimable");
    expect(rows[1]).toHaveTextContent("On track");
    a.unmount();
    mockApi({ "GET /admin/management/production-board": { data: [row({ estimatedCompletionAt: undefined, etaDataQuality: undefined, projectedLate: undefined })], meta: { page: 1, pageSize: 20, total: 1 }, generatedAt: "x", etaIncluded: false }, "GET /admin/management/bottlenecks": { ...stamp, orderedBy: "x", stages: [] } });
    perms = ["management_kpis.read"];
    renderWithClient(<ProductionInsightsPage />);
    await screen.findAllByTestId("board-row");
    expect(screen.queryByText("Estimated completion")).not.toBeInTheDocument();
    expect(screen.queryByTestId("eta")).not.toBeInTheDocument();
  });
  it("filters go to the backend as supported params (department, priority, kind, delayed, blocked, stageCode)", async () => {
    search = "department=SEWING&priority=URGENT&kind=BULK&delayed=true&blocked=true&stageCode=SEWING";
    const calls = mockApi({ "GET /admin/management/production-board": { data: [], meta: { page: 1, pageSize: 20, total: 0 }, generatedAt: "x", etaIncluded: false }, "GET /admin/management/bottlenecks": { ...stamp, orderedBy: "x", stages: [] }, "GET /admin/management/wip": { generatedAt: "x", stages: [] } });
    renderWithClient(<ProductionInsightsPage />);
    await screen.findByText("No jobs match");
    expect(Object.fromEntries(new URLSearchParams(calls.find((c) => c.path.endsWith("production-board"))!.query))).toMatchObject({ department: "SEWING", priority: "URGENT", kind: "BULK", delayed: "true", blocked: "true", stageCode: "SEWING" });
  });
});

describe("alerts and workload", () => {
  const alert = (o: Record<string, unknown>) => ({ id: "a1", type: "BLOCKED_STAGE", entityType: "JOB_STAGE", entityId: "st1", status: "OPEN", severity: "CRITICAL", reference: "JOB-000001", title: "Cutting · Tee", reason: "Blocked 3h", department: "CUTTING", firstDetectedAt: "2026-10-22T08:00:00Z", lastDetectedAt: "2026-10-22T10:00:00Z", resolvedAt: null, lastNotifiedAt: null, lastNotifiedSeverity: null, escalationLevel: 2, ...o });
  it("alerts show severity, state and escalation exactly as the backend says; there is NO resolve/acknowledge action (read-only); filters are backend params", async () => {
    pathname = "/management/alerts"; search = "severity=CRITICAL&type=BLOCKED_STAGE";
    const calls = mockApi({ "GET /admin/automation/alerts": { data: [alert({}), alert({ id: "a2", status: "RESOLVED", resolvedAt: "2026-10-22T11:00:00Z", severity: "INFO", escalationLevel: 0, reference: "ORD-000002" })], meta: { page: 1, pageSize: 20, total: 2 } }, "GET /admin/automation/scheduler": { enabled: true, intervals: { outbox: 10, dispatch: 15, alerts: 300 }, runningNow: [] } });
    renderWithClient(<AlertsPage />);
    const rows = await screen.findAllByTestId("alert-row");
    expect(rows[0]).toHaveAttribute("data-severity", "CRITICAL");
    expect(rows[0]).toHaveTextContent("escalation level 2");
    expect(rows[0]).toHaveTextContent("Open");
    expect(rows[1]).toHaveAttribute("data-status", "RESOLVED");
    expect(rows[1]).toHaveTextContent("Resolved");
    expect(rows[1]).toHaveTextContent("not escalated");
    expect(within(rows[0]!).getByRole("link", { name: /Open/ })).toHaveAttribute("href", "/production?view=table&search=JOB-000001");
    expect(screen.queryByRole("button", { name: /resolve|acknowledge|dismiss/i })).not.toBeInTheDocument();
    expect(await screen.findByTestId("scheduler-state")).toHaveTextContent("Automation is running");
    expect(Object.fromEntries(new URLSearchParams(calls.find((c) => c.path === "/admin/automation/alerts")!.query))).toMatchObject({ status: "OPEN", severity: "CRITICAL", type: "BLOCKED_STAGE" });
  });
  it("alerts need automation.read; no open alerts is a positive state", async () => {
    pathname = "/management/alerts"; perms = ["management_kpis.read"];
    const r = renderWithClient(<AlertsPage />);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    r.unmount();
    perms = ["automation.read"];
    mockApi({ "GET /admin/automation/alerts": { data: [], meta: { page: 1, pageSize: 20, total: 0 } }, "GET /admin/automation/scheduler": { enabled: false, intervals: { outbox: 10, dispatch: 15, alerts: 300 }, runningNow: ["alerts"] } });
    renderWithClient(<AlertsPage />);
    expect(await screen.findByText("No open alerts.")).toBeInTheDocument();
    expect(await screen.findByTestId("scheduler-state")).toHaveTextContent("Automation is disabled");
  });
  it("workload: departments and staff render backend numbers; null staff capacity is '—'; unassigned/overdue are highlighted", async () => {
    pathname = "/management/workload";
    mockApi({
      "GET /admin/management/workload/departments": { generatedAt: "x", note: "Paused jobs are excluded.", departments: [{ department: "SEWING", readyStages: 2, inProgressStages: 3, blockedStages: 1, jobsInvolved: 4, plannedUnits: 100, remainingUnits: 60, overdueStages: 2, unassignedReadyStages: 1, assignedStaffCount: 2, eligibleStaffCount: 5 }] },
      "GET /admin/management/capacity/utilization": { timezone: "Africa/Cairo", from: "a", to: "b", generatedAt: "x", assumptions: [], series: [], departmentsWithoutCapacity: [] },
      "GET /admin/management/workload/staff": { data: [{ userId: "u1", name: "Sam Sewer", roles: ["SEWING"], activeAssignments: 3, readyAssignments: 1, inProgressAssignments: 2, blockedAssignments: 0, overdueAssignments: 2, plannedQuantity: 0, assignedExpectedMinutes: 0, capacityMinutesPerDay: null, stagesCompleted: 7, producedQuantity: 0, rejectedQuantity: 0, averageCompletionMinutes: null, onTimeCompletionRate: null, reworkOnAssignedStages: 0 }], meta: { page: 1, pageSize: 20, total: 1 }, note: "Operational planning data only." },
    });
    renderWithClient(<WorkloadPage />);
    const dep = await screen.findByTestId("workload-row");
    expect(dep).toHaveTextContent("Sewing");
    expect(dep).toHaveTextContent("2/5");
    const staff = await screen.findByTestId("staff-row");
    expect(staff).toHaveTextContent("Sam Sewer");
    expect(staff).toHaveTextContent("—"); // null on-time / avg completion / capacity are unknown, not 0
    expect(staff).not.toHaveTextContent("0%");
  });
});
