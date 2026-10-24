import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { customer, json, mockApi, renderWithClient, setup } from "./helpers";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn(), refresh: vi.fn() }), usePathname: () => "/customers", useSearchParams: () => new URLSearchParams(search) }));
let perms: string[] = [];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated" }),
}));

import { ResponsibilitiesPage } from "@/features/responsibilities/responsibilities-page";
import { BulkResponsibilityDialog, CustomerOperations, CustomerResponsibilities } from "@/features/responsibilities/customer-sections";
import { ProcessPanel } from "@/features/responsibilities/process-panel";
import { CustomersPage } from "@/features/customers/customers-page";
import { CommandCenter } from "@/features/command-center/command-center";
import { filterNav, navSections } from "@/features/navigation/nav-config";
import { createPermissionChecker } from "@/lib/permissions";

const mahmoud = { id: "u1", name: "Mahmoud" };
const hassan = { id: "u2", name: "Hassan" };
const sara = { id: "u3", name: "Sara" };
const rule = (user = mahmoud, over: object = {}) => ({ scope: "GLOBAL", customerId: null, stageKey: "CUTTING", primaryUser: user, additionalUsers: [], health: "OK", reason: null, updatedAt: "2026-10-01T10:00:00Z", ...over });
const area = (over: object = {}) => ({ stageKey: "CUTTING", label: "Cutting", group: "FACTORY", eligibleRoleCodes: ["CUTTING"], globalDefault: rule(), effectiveUser: mahmoud, source: "GLOBAL_DEFAULT", health: "OK", reason: null, activeWork: 12, ...over });
const overview = [
  area({ stageKey: "FABRIC_PREPARATION", label: "Fabric Preparation", globalDefault: null, effectiveUser: null, source: "UNASSIGNED", health: "NOT_CONFIGURED", activeWork: 0 }),
  area(),
  area({ stageKey: "SEWING", label: "Sewing", globalDefault: rule({ id: "u9", name: "Ahmed" }, { stageKey: "SEWING", health: "NEEDS_ATTENTION", reason: "ASSIGNEE_DISABLED" }), effectiveUser: null, health: "NEEDS_ATTENTION", reason: "ASSIGNEE_DISABLED", activeWork: 0 }),
  area({ stageKey: "DELIVERY", label: "Delivery", group: "FULFILLMENT", globalDefault: rule({ id: "u7", name: "Omar" }, { stageKey: "DELIVERY" }), effectiveUser: { id: "u7", name: "Omar" }, activeWork: 2 }),
];
const users = { data: [{ id: "u1", name: "Mahmoud", email: "m@x.com", status: "ACTIVE", roles: [{ code: "CUTTING" }] }, { id: "u2", name: "Hassan", email: "h@x.com", status: "ACTIVE", roles: [{ code: "CUTTING" }] }, { id: "u5", name: "Karim", email: "k@x.com", status: "ACTIVE", roles: [{ code: "SALES" }] }], meta: { page: 1, pageSize: 20, total: 3 } };

const stage = (over: object) => ({ stageKey: "CUTTING", label: "Cutting", sequence: 1, attempt: 1, status: "WAITING", isOnHold: false, responsibleUser: null, additionalUsers: [], assignmentSource: "UNASSIGNED", assignedAt: null, readyAt: null, startedAt: null, startedBy: null, completedAt: null, completedBy: null, durationMinutes: null, dueAt: null, blocker: null, handoff: null, ...over });
const todayAt = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
const journey = () => ({
  jobId: "j1", jobNumber: "JOB-000014", batchNumber: null,
  stages: [
    stage({ stageKey: "FABRIC_PREPARATION", label: "Fabric Preparation", sequence: 1, status: "COMPLETED", responsibleUser: { id: "u8", name: "Ahmed" }, completedBy: { id: "u8", name: "Ahmed" }, startedAt: todayAt(9, 0), completedAt: todayAt(9, 35), durationMinutes: 35, assignmentSource: "GLOBAL_DEFAULT", handoff: { toStageKey: "CUTTING", toLabel: "Cutting", toStatus: "IN_PROGRESS", toUser: mahmoud } }),
    stage({ stageKey: "CUTTING", label: "Cutting", sequence: 2, status: "IN_PROGRESS", responsibleUser: mahmoud, startedAt: todayAt(10, 30), assignmentSource: "CUSTOMER_OVERRIDE" }),
    stage({ stageKey: "QC_GATE_1", label: "QC Gate 1", sequence: 3, status: "WAITING", responsibleUser: sara }),
    stage({ stageKey: "SEWING", label: "Sewing", sequence: 4, status: "WAITING", responsibleUser: null }),
  ],
  currentStage: { stageKey: "CUTTING", label: "Cutting", status: "IN_PROGRESS", responsibleUser: mahmoud, startedAt: todayAt(10, 30) },
  nextStage: { stageKey: "QC_GATE_1", label: "QC Gate 1", status: "WAITING", responsibleUser: sara },
  lastCompleted: { stageKey: "FABRIC_PREPARATION", label: "Fabric Preparation" },
  activeStages: [], progress: { completedStages: 1, totalStages: 4, percent: 25 }, blocker: { active: false, reason: null, type: null, since: null }, attention: null,
});

beforeEach(() => { setup(); search = ""; replace.mockClear(); perms = ["responsibilities.read", "responsibilities.manage", "jobs.assign", "users.read", "jobs.read_all"]; });

describe("Factory Responsibilities page", () => {
  it("renders grouped area cards with owner, active load, factory default and the empty configuration message", async () => {
    mockApi({ "GET /admin/responsibilities": overview, "GET /admin/responsibilities/attention": { rulesNeedingAttention: { count: 1, items: [] }, unassignedActiveStages: { count: 3, byStageKey: [{ stageKey: "CUTTING", count: 3 }] } } });
    renderWithClient(<ResponsibilitiesPage />);
    expect(await screen.findByRole("heading", { name: "Factory Responsibilities" })).toBeInTheDocument();
    expect(screen.getByTestId("group-PRE_PRODUCTION")).toHaveTextContent("Fabric Preparation");
    expect(screen.getByTestId("group-PRODUCTION")).toHaveTextContent("Cutting");
    expect(screen.getByTestId("group-FULFILLMENT")).toHaveTextContent("Delivery");
    const cutting = screen.getAllByTestId("area-card").find((c) => c.dataset.stage === "CUTTING")!;
    expect(within(cutting).getByTestId("area-owner")).toHaveTextContent("Mahmoud");
    expect(within(cutting).getByTestId("area-load")).toHaveTextContent("12 active stages");
    expect(cutting).toHaveTextContent("Factory default");
    expect(screen.getAllByTestId("area-card").find((c) => c.dataset.stage === "FABRIC_PREPARATION")).toHaveTextContent("No default responsible worker is configured.");
  });
  it("a rule pointing at a disabled worker needs attention and offers another worker; the feed counts show", async () => {
    mockApi({ "GET /admin/responsibilities": overview, "GET /admin/responsibilities/attention": { rulesNeedingAttention: { count: 1, items: [] }, unassignedActiveStages: { count: 3, byStageKey: [{ stageKey: "CUTTING", count: 3 }] } } });
    renderWithClient(<ResponsibilitiesPage />);
    const sewing = (await screen.findAllByTestId("area-card")).find((c) => c.dataset.stage === "SEWING")!;
    expect(sewing).toHaveTextContent("Needs attention");
    expect(within(sewing).getByTestId("area-attention")).toHaveTextContent("Ahmed is no longer available");
    expect(within(sewing).getByRole("button", { name: "Assign another worker" })).toBeInTheDocument();
    const feed = screen.getByTestId("attention-summary");
    expect(feed).toHaveTextContent("Responsibilities need attention");
    expect(feed).toHaveTextContent("Unassigned active stages");
    expect(feed).toHaveTextContent("Cutting · 3");
  });
  it("changing the owner explains it is future work only, saves with PUT, then offers (never auto-applies) the active-work change", async () => {
    const calls = mockApi({ "GET /admin/responsibilities": overview, "GET /admin/responsibilities/attention": {}, "GET /admin/users": users, "PUT /admin/responsibilities/CUTTING": rule(hassan) });
    renderWithClient(<ResponsibilitiesPage />);
    const cutting = (await screen.findAllByTestId("area-card")).find((c) => c.dataset.stage === "CUTTING")!;
    await userEvent.click(within(cutting).getByRole("button", { name: "Change responsible" }));
    expect(await screen.findByRole("radio", { name: /Hassan/ })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Karim/ })).toBeNull(); // wrong role for Cutting
    await userEvent.click(screen.getByRole("radio", { name: /Hassan/ }));
    expect(screen.getByTestId("scope-text")).toHaveTextContent("Mahmoud → Hassan. Future Cutting work will be assigned to Hassan.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("radiogroup", { name: "How to apply" });
    const put = calls.find((c) => c.method === "PUT")!;
    expect(put.body).toEqual({ userId: "u2" });
    expect(calls.some((c) => c.path.endsWith("/apply-active"))).toBe(false); // nothing applied yet
  });
  it("apply-to-active: unassigned-only is the default; replace needs an explicit confirmation; the mode is sent as-is", async () => {
    const calls = mockApi({ "GET /admin/responsibilities": overview, "GET /admin/responsibilities/attention": {}, "POST /admin/responsibilities/CUTTING/apply-active": { assigned: 8, skipped: { started: 2 } } });
    renderWithClient(<ResponsibilitiesPage />);
    const cutting = (await screen.findAllByTestId("area-card")).find((c) => c.dataset.stage === "CUTTING")!;
    await userEvent.click(within(cutting).getByRole("button", { name: "Apply to active work" }));
    expect(screen.getByRole("radio", { name: /Assign unassigned only/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Started or completed work will not be changed.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Replace eligible existing assignments/ }));
    expect(screen.getByRole("button", { name: "Replace assignments" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Replace assignments" }));
    const res = await screen.findByTestId("apply-result");
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ mode: "REPLACE" });
    expect(res).toHaveTextContent("Assigned");
    expect(res).toHaveTextContent("Skipped started");
  });
  it("worker drilldown lists only what the backend returned", async () => {
    mockApi({ "GET /admin/responsibilities": overview, "GET /admin/responsibilities/attention": {} });
    renderWithClient(<ResponsibilitiesPage />);
    await userEvent.click((await screen.findAllByTestId("area-owner"))[0]!);
    const d = await screen.findByTestId("worker-drilldown");
    expect(d).toHaveTextContent("Cutting");
    expect(d).toHaveTextContent("12 active stages");
    expect(d).not.toHaveTextContent(/customers:|overrides:/i);
  });
  it("read-only roles see no edit buttons", async () => {
    perms = ["responsibilities.read"];
    mockApi({ "GET /admin/responsibilities": overview, "GET /admin/responsibilities/attention": {} });
    renderWithClient(<ResponsibilitiesPage />);
    await screen.findByTestId("group-PRODUCTION");
    expect(screen.queryByRole("button", { name: /Change responsible|Apply to active work|Clear default/ })).toBeNull();
  });
});

describe("process timeline", () => {
  it("shows the current stage, its owner and start time, the next owner, progress, a completed stage with its handoff, and unassigned work", async () => {
    mockApi({ "GET /admin/orders/o1/process": [journey()] });
    renderWithClient(<ProcessPanel kind="orders" id="o1" />);
    const cur = await screen.findByTestId("current-stage");
    expect(within(cur).getByTestId("current-label")).toHaveTextContent("Cutting");
    expect(within(cur).getByTestId("current-owner")).toHaveTextContent("Mahmoud");
    expect(within(cur).getByTestId("current-owner")).toHaveTextContent("Currently handling Cutting");
    expect(cur).toHaveTextContent("In progress");
    expect(within(cur).getByTestId("next-stage")).toHaveTextContent("Next: QC Gate 1 — Sara");
    expect(within(cur).getByTestId("progress")).toHaveTextContent("1 of 4 stages");
    expect(document.body.textContent).not.toMatch(/IN_PROGRESS|WAITING|CUSTOMER_OVERRIDE/); // human wording only
    const rows = screen.getAllByTestId("process-stage");
    expect(rows.map((r) => r.dataset.state)).toEqual(["completed", "current", "waiting", "waiting"]);
    expect(rows[0]).toHaveTextContent("Ahmed completed Fabric Preparation");
    expect(within(rows[0]!).getByTestId("handoff")).toHaveTextContent("Handed off to Cutting — Mahmoud");
    expect(rows[1]).toHaveTextContent("Customer override");
    expect(rows[3]).toHaveTextContent("This stage has not been assigned yet.");
  });
  it("blocked work is loud and shows how long it has been blocked only when the backend gave a start", async () => {
    const p = journey();
    p.stages[1] = stage({ stageKey: "CUTTING", label: "Cutting", sequence: 2, status: "BLOCKED", responsibleUser: mahmoud, blocker: { active: true, reason: "Artwork clarification", type: "ARTWORK", since: new Date(Date.now() - 134 * 60_000).toISOString() } });
    p.currentStage = { stageKey: "CUTTING", label: "Cutting", status: "BLOCKED", responsibleUser: mahmoud, blocker: p.stages[1]!.blocker } as never;
    mockApi({ "GET /admin/jobs/j1/process": p });
    renderWithClient(<ProcessPanel kind="jobs" id="j1" />);
    const b = (await screen.findAllByTestId("blocker"))[0]!;
    expect(b).toHaveTextContent("Blocked — Artwork clarification");
    expect(b).toHaveTextContent("Blocked for 2h 14m");
    expect(screen.getByTestId("current-stage")).toHaveAttribute("data-state", "blocked");
  });
  it("an active stage nobody owns says so and links to assign", async () => {
    const p = journey();
    p.stages[1] = stage({ stageKey: "CUTTING", label: "Cutting", sequence: 2, status: "READY", responsibleUser: null });
    p.currentStage = { stageKey: "CUTTING", label: "Cutting", status: "READY", responsibleUser: null } as never;
    mockApi({ "GET /admin/samples/s1/process": { processes: [p] } });
    renderWithClient(<ProcessPanel kind="samples" id="s1" />);
    const owner = await screen.findByTestId("current-owner");
    expect(owner).toHaveTextContent("No one assigned");
    expect(within(owner).getByRole("link", { name: "Assign worker" })).toHaveAttribute("href", "/production/jobs/j1");
    expect(screen.getAllByTestId("needs-assignment")[0]).toHaveTextContent("Needs assignment");
  });
  it("a role without access sees no journey block and no error", async () => {
    mockApi({ "GET /admin/orders/o1/process": json(403, { statusCode: 403, message: "Forbidden" }) });
    const { container } = renderWithClient(<ProcessPanel kind="orders" id="o1" />);
    await waitFor(() => expect(container.querySelector('[data-testid="production-journey"]')).toBeNull());
    expect(screen.queryByTestId("process-error")).toBeNull();
  });
});

const work = (n: number, over: object = {}) => ({ referenceType: "ORDER", referenceId: `o${n}`, referenceNumber: `ORD-00002${n}`, jobId: `j${n}`, jobNumber: `JOB-00001${n}`, batchNumber: null, currentStage: { stageKey: "CUTTING", label: "Cutting", status: "IN_PROGRESS", responsibleUser: mahmoud, startedAt: todayAt(10, 30) }, nextStage: { stageKey: "SEWING", label: "Sewing", responsibleUser: { id: "u8", name: "Ahmed" } }, progress: { completedStages: 3, totalStages: 8, percent: 38 }, blocker: null, priority: "NORMAL", productName: "Tee", eta: null, ...over });
describe("customer operations", () => {
  it("lists every active work item in the backend's order with summary tiles, a blocked item and an unassigned one", async () => {
    const items = [
      work(1, { currentStage: { stageKey: "PRINTING_EMBROIDERY", label: "Printing / Embroidery", status: "BLOCKED", responsibleUser: { id: "u4", name: "Karim" }, blocker: { active: true, reason: "Artwork clarification", type: "ARTWORK", since: null } }, blocker: { active: true, reason: "Artwork clarification", type: "ARTWORK", since: null } }),
      work(2), work(3, { referenceType: "SAMPLE", referenceNumber: "SMP-000030", currentStage: { stageKey: "CUTTING", label: "Cutting", status: "READY", responsibleUser: null } }),
    ];
    mockApi({ "GET /admin/customers/c1/operations": { currentWork: items, activeSamples: [], activeOrders: [] } });
    renderWithClient(<CustomerOperations customerId="c1" />);
    const cards = await screen.findAllByTestId("work-card");
    expect(cards.map((c) => c.querySelector('[data-testid="work-stage"]')?.textContent)).toEqual(["Printing / Embroidery", "Cutting", "Cutting"]); // order untouched
    expect(cards[0]).toHaveAttribute("data-state", "blocked");
    expect(cards[0]).toHaveTextContent("Artwork clarification");
    expect(cards[1]).toHaveTextContent("Mahmoud");
    expect(cards[1]).toHaveTextContent("3 of 8 stages");
    expect(cards[2]).toHaveTextContent("Needs assignment");
    expect(within(cards[2]!).getByRole("link", { name: "Assign worker" })).toHaveAttribute("href", "/production/jobs/j3");
    const tiles = within(screen.getByTestId("customer-operations")).getAllByRole("definition").map((d) => d.textContent);
    expect(tiles).toEqual(["3", "1", "1", "1"]);
    expect(within(cards[1]!).getByRole("link", { name: /View full process/ })).toHaveAttribute("href", "/orders/o2?tab=production");
  });
  it("no active production has a clear empty state", async () => {
    mockApi({ "GET /admin/customers/c1/operations": { currentWork: [] } });
    renderWithClient(<CustomerOperations customerId="c1" />);
    expect(await screen.findByText("No active factory work for this customer.")).toBeInTheDocument();
  });
});

const matrixRow = (over: object) => ({ stageKey: "CUTTING", label: "Cutting", group: "FACTORY", eligibleRoleCodes: ["CUTTING"], source: "GLOBAL_DEFAULT", effectiveUser: mahmoud, globalDefaultUser: mahmoud, customerOverrideUser: null, health: "OK", reason: null, activeWork: 4, ...over });
describe("customer responsibility matrix", () => {
  it("groups areas, shows source, sales owner as the backend returns it, and overrides and resets with the exact calls", async () => {
    const calls = mockApi({
      "GET /admin/customers/c1/responsibilities": { items: [matrixRow({}), matrixRow({ stageKey: "SEWING", label: "Sewing", source: "CUSTOMER_OVERRIDE", effectiveUser: hassan, customerOverrideUser: hassan }), matrixRow({ stageKey: "DELIVERY", label: "Delivery", group: "FULFILLMENT", effectiveUser: null, source: "UNASSIGNED", globalDefaultUser: null })], commercial: { salesOwner: { user: { id: "u5", name: "Karim" }, referenceNumber: "ORD-000021" } } },
      "GET /admin/users": users, "PUT /admin/customers/c1/responsibilities/CUTTING": rule(hassan, { scope: "CUSTOMER", customerId: "c1" }), "DELETE /admin/customers/c1/responsibilities/SEWING": new Response(null, { status: 204 }),
    });
    renderWithClient(<CustomerResponsibilities customerId="c1" customerName="ABC Fashion" />);
    const rows = await screen.findAllByTestId("matrix-row");
    expect(screen.getByTestId("sales-owner")).toHaveTextContent("Karim");
    expect(screen.getByTestId("sales-owner")).toHaveTextContent("ORD-000021");
    expect(rows.map((r) => r.querySelector('[data-testid="matrix-source"]')?.textContent)).toEqual(["Factory default", "Customer override", "Unassigned"]);
    expect(rows[1]).toHaveTextContent("Factory default: Mahmoud");
    expect(within(rows[1]!).getByRole("button", { name: "Use factory default" })).toBeInTheDocument();
    expect(within(rows[0]!).queryByRole("button", { name: "Use factory default" })).toBeNull();
    await userEvent.click(within(rows[0]!).getByRole("button", { name: "Override for this customer" }));
    await userEvent.click(await screen.findByRole("radio", { name: /Hassan/ }));
    expect(screen.getByTestId("scope-text")).toHaveTextContent("This changes future work for this customer only.");
    await userEvent.click(screen.getByRole("button", { name: "Save override" }));
    await screen.findByRole("radiogroup", { name: "How to apply" });
    expect(calls.find((c) => c.method === "PUT")!.body).toEqual({ userId: "u2" });
    await userEvent.click(screen.getByRole("button", { name: "Not now" }));
    await userEvent.click(within(rows[1]!).getByRole("button", { name: "Use factory default" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Use factory default" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.path === "/admin/customers/c1/responsibilities/SEWING")).toBe(true));
  });
});

describe("bulk responsibility", () => {
  it("sets an override for all selected customers in one call, or clears it", async () => {
    const calls = mockApi({ "GET /admin/responsibilities": overview, "GET /admin/users": users, "POST /admin/responsibilities/bulk-customer-overrides": { affected: 2 } });
    const onDone = vi.fn();
    renderWithClient(<BulkResponsibilityDialog customers={[{ id: "c1", name: "A" }, { id: "c2", name: "B" }]} onClose={vi.fn()} onDone={onDone} />);
    expect(await screen.findByText("2 customers selected")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("radio", { name: "Cutting" }));
    await userEvent.click(screen.getByRole("button", { name: "Choose responsible…" }));
    await userEvent.click(await screen.findByRole("radio", { name: /Hassan/ }));
    await userEvent.click(screen.getByRole("button", { name: "Apply override" }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ customerIds: ["c1", "c2"], stageKey: "CUTTING", userId: "u2" });
  });
  it("Use factory default sends clear: true", async () => {
    const calls = mockApi({ "GET /admin/responsibilities": overview, "POST /admin/responsibilities/bulk-customer-overrides": {} });
    renderWithClient(<BulkResponsibilityDialog customers={[{ id: "c1", name: "A" }]} onClose={vi.fn()} onDone={vi.fn()} />);
    await userEvent.click(await screen.findByRole("radio", { name: "Cutting" }));
    await userEvent.click(screen.getByRole("button", { name: "Use factory default" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ customerIds: ["c1"], stageKey: "CUTTING", clear: true });
  });
});

describe("customers list operations summary", () => {
  const cur = (over: object = {}) => ({ referenceNumber: "ORD-000021", jobNumber: "JOB-000014", stage: "CUTTING", stageLabel: "Cutting", status: "IN_PROGRESS", attention: null, responsibleUser: mahmoud, startedAt: todayAt(10, 30), progressPercent: 65, blocked: false, ...over });
  const summary = (user: object | null) => ({ salesOwner: null, areas: [{ stageKey: "CUTTING", label: "Cutting", user, source: "GLOBAL_DEFAULT", health: "OK" }], configuredCount: 1, totalAreas: 9, needsAttention: 0 });
  it("asks for the summary in the single list call, shows the current job with '+N more', and filters by area and responsible", async () => {
    const rows = [
      customer({ id: "c1", displayName: "ABC Fashion", currentProcess: cur(), currentProcesses: [cur()], activeJobCount: 3, responsibilitySummary: summary(mahmoud) }),
      customer({ id: "c2", displayName: "Blocked Co", currentProcess: cur({ referenceNumber: "SMP-000030", stageLabel: "Printing", blocked: true, status: "BLOCKED", responsibleUser: sara, progressPercent: 40 }), currentProcesses: [], activeJobCount: 1, responsibilitySummary: summary(hassan) }),
      customer({ id: "c3", displayName: "Idle Ltd", currentProcess: null, activeJobCount: 0, responsibilitySummary: summary(mahmoud) }),
    ];
    const calls = mockApi({ "GET /admin/customers": { data: rows, meta: { page: 1, pageSize: 20, total: 3 } }, "GET /admin/responsibilities": overview });
    search = "";
    const { unmount } = renderWithClient(<CustomersPage />);
    const cells = await screen.findAllByTestId("current-work");
    expect(new URLSearchParams(calls.find((c) => c.path === "/admin/customers")!.query).get("includeOperations")).toBe("true");
    expect(calls.filter((c) => c.path.startsWith("/admin/customers/")).length).toBe(0); // no N+1
    expect(cells[0]).toHaveTextContent("ORD-000021");
    expect(cells[0]).toHaveTextContent("Cutting");
    expect(cells[0]).toHaveTextContent("Mahmoud · In progress · 65%");
    expect(cells[0]).toHaveTextContent("+2 more active jobs");
    expect(cells[1]).toHaveAttribute("data-blocked", "true");
    expect(screen.getByTestId("no-work")).toHaveTextContent("No active work");
    unmount();
    search = "area=CUTTING&responsible=u1";
    renderWithClient(<CustomersPage />);
    await screen.findByText("ABC Fashion");
    expect(screen.queryByText("Blocked Co")).toBeNull();
    expect(screen.getByText("Idle Ltd")).toBeInTheDocument();
    const q = new URLSearchParams(calls.filter((c) => c.path === "/admin/customers").at(-1)!.query);
    expect(q.has("area")).toBe(false); // client-side narrowing; never leaked to the backend
    expect(q.has("responsible")).toBe(false);
  });
  it("selecting customers offers the bulk action to responsibility managers only", async () => {
    mockApi({ "GET /admin/customers": { data: [customer({ id: "c1", displayName: "ABC Fashion" })], meta: { page: 1, pageSize: 20, total: 1 } }, "GET /admin/responsibilities": overview });
    perms = ["customers.read", "responsibilities.read", "responsibilities.manage"];
    renderWithClient(<CustomersPage />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select ABC Fashion" }));
    expect(screen.getByTestId("bulk-bar")).toHaveTextContent("1 selected");
    expect(screen.getByRole("button", { name: "Set responsibility" })).toBeInTheDocument();
  });
  it("without responsibilities.read the summary is not requested", async () => {
    perms = ["customers.read"];
    const calls = mockApi({ "GET /admin/customers": { data: [customer()], meta: { page: 1, pageSize: 20, total: 1 } } });
    renderWithClient(<CustomersPage />);
    await screen.findByText("Nile Streetwear");
    expect(new URLSearchParams(calls[0]!.query).has("includeOperations")).toBe(false);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

describe("Command Center and navigation", () => {
  it("shows responsibility cards only when the feed has something, linking to the responsibilities page", async () => {
    perms = ["responsibilities.read", "samples.read"];
    mockApi({ "GET /admin/samples": { data: [], meta: { page: 1, pageSize: 100, total: 0 } }, "GET /admin/responsibilities/attention": { rulesNeedingAttention: { count: 2, items: [] }, unassignedActiveStages: { count: 3 } } });
    renderWithClient(<CommandCenter />);
    expect(await screen.findByTestId("resp-attention-card")).toHaveTextContent("2");
    expect(screen.getByTestId("resp-unassigned-card")).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: /Open responsibilities/ })).toHaveAttribute("href", "/responsibilities");
    expect(screen.getByRole("link", { name: /See which areas/ })).toHaveAttribute("href", "/responsibilities#unassigned");
  });
  it("the Responsibilities nav item needs responsibilities.read", () => {
    const labels = (p: string[]) => filterNav(createPermissionChecker(p), navSections).flatMap((s) => s.items.map((i) => i.label));
    expect(labels(["responsibilities.read"])).toContain("Responsibilities");
    expect(labels(["customers.read"])).not.toContain("Responsibilities");
  });
});

describe("customer portal isolation", () => {
  it("no portal or public code imports or names the staff responsibility/process code", () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = path.join(dir, f); return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(f) ? [p] : []; });
    const roots = ["src/features/portal", "src/app/account", "src/lib/customer"].map((r) => path.join(process.cwd(), r));
    for (const f of roots.flatMap(walk)) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/features\/responsibilities|\/admin\/(responsibilities|customers\/[^"'`]*\/(operations|responsibilities)|[a-z]+\/[^"'`]*\/process)|assignmentSource|responsibleUser/);
    }
  });
});
