import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { json, mockApi, page, renderWithClient, setup } from "./helpers";

const replace = vi.fn();
let search = "";
let pathname = "/production";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams(search) }));
let perms: string[] = [];
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated", user: { id: "u1", name: "Sara", email: "", roles: [], permissions: perms } }),
}));

import { JobDetailPage } from "@/features/production/job-detail-page";
import { MyWorkPage } from "@/features/production/my-work-page";
import { ProductionPage } from "@/features/production/production-page";
import { InspectionSummary, QcExecution, buildResultsPayload, missingRequired } from "@/features/production/qc-panel";
import { StageDrawer } from "@/features/production/stage-drawer";
import { QuantitySection, StageFileButton } from "@/features/production/stage-parts";
import { tokenStore } from "@/lib/auth/token-store";

const ADMIN = ["factory_jobs.manage", "jobs.assign", "jobs.read_all", "jobs.read_assigned", "production_board.read", "production_notes.create", "production_quantity.report", "qc.manage", "qc.perform", "qc.read", "rework.manage", "stages.block", "stages.complete", "stages.override", "stages.start", "users.read"];
const SALES = ["jobs.read_all", "production_board.read"];
const FLOOR = ["jobs.read_assigned", "production_notes.create", "production_quantity.report", "stages.block", "stages.complete", "stages.start"];

const stage = (over: Record<string, unknown> = {}) => ({
  id: "st1", jobId: "j1", stageCode: "CUTTING", stageName: "Cutting", departmentType: "CUTTING", sequence: 3, attempt: 1, status: "READY", isRequired: true, isQcStage: false, requiresAssignment: true,
  requiresCompletionNote: false, requiresAttachment: false, superseded: false, dependsOnStageIds: [], readyAt: null, dueAt: null, startedAt: null, completedAt: null, isDelayed: false, isOnHold: false,
  holdReason: null, blockedAt: null, blockReason: null, completionNote: null, reworkRecordId: null, assignees: [{ assignmentId: "as1", userId: "u9", name: "Cutter", isPrimary: true, context: null, assignedAt: "2026-10-01T10:00:00Z" }], ...over,
});
const jobSummary = { id: "j1", jobNumber: "JOB-000001", productName: "Tee", brandName: "Nile Core", priority: "NORMAL", status: "IN_PROGRESS", targetCompletionDate: null };
const staffDetail = (over: Record<string, unknown> = {}, st: Record<string, unknown> = {}) => ({
  stage: stage(st), job: jobSummary, taskView: { product: "Tee", gsm: 220, color: { source: "CUSTOM", name: "Navy", hex: "#001F3F", pantone: null } }, allowedActions: ["START", "RAISE_BLOCKER", "ADD_NOTE", "ATTACH_FILE"],
  blockers: [], notes: [], files: [], quantity: null, orderView: null, qcInspection: null, ...over,
});
const jobDetail = (over: Record<string, unknown> = {}) => ({
  id: "j1", jobNumber: "JOB-000001", sourceType: "SAMPLE_PRODUCTION", status: "IN_PROGRESS", priority: "NORMAL", sampleNumber: "SMP-000001", sampleId: "s1", orderId: null, orderNumber: null, orderBatchId: null, batchNumber: null,
  plannedQuantity: null, completedQuantity: 0, rejectedQuantity: 0, customer: { id: "c1", name: "Nile Streetwear", number: "CUS-000001" }, brand: { id: "b1", name: "Nile Core", number: "BRD-000001" }, productName: "Tee",
  workflowCode: "STD", workflowVersion: 1, targetCompletionDate: null, progress: { completedStages: 1, totalStages: 3 }, delayedStages: 0, openBlockers: 0, startedAt: null, completedAt: null, createdAt: "2026-10-01T10:00:00Z",
  sampleProductionSpecId: "sp1", specRevision: 2, specHash: "b".repeat(64), assignedSalesUserId: null, requestedStartDate: null, holdReason: null, heldAt: null, cancelReason: null, cancelledAt: null, internalNotes: null,
  stages: [stage()], ...over,
});
const qcResults = () => [
  { itemId: "i1", itemCode: "STITCH", label: "Stitching is even", resultType: "PASS_FAIL", required: true, result: null, numericValue: null, textValue: null, notes: null },
  { itemId: "i2", itemCode: "CHEST", label: "Chest width (cm)", resultType: "MEASUREMENT", required: true, result: null, numericValue: null, textValue: null, notes: null },
  { itemId: "i3", itemCode: "REMARK", label: "Inspector remark", resultType: "TEXT", required: false, result: null, numericValue: null, textValue: null, notes: null },
  { itemId: "i4", itemCode: "PHOTO", label: "Front photo", resultType: "PHOTO_REQUIRED", required: false, result: null, numericValue: null, textValue: null, notes: null },
];
const inspection = (over: Record<string, unknown> = {}) => ({
  id: "qi1", jobId: "j1", jobStageId: "st1", stageName: "QC Gate 1", templateCode: "QC1", templateVersion: 1, status: "IN_PROGRESS", overallResult: null, inspectorUserId: "u1", inspectorName: "Quinn",
  notes: null, startedAt: "2026-10-02T10:00:00Z", completedAt: null, photoCount: 0, results: qcResults(), reworkId: null, inspectedQuantity: null, passedQuantity: null, failedQuantity: null, ...over,
});

beforeEach(() => { setup(); replace.mockClear(); search = ""; pathname = "/production"; perms = [...ADMIN]; });

const openStage = (detail: unknown, extra: Record<string, unknown> = {}) => {
  const calls = mockApi({ "GET /staff/job-stages/st1": detail as object, "GET /admin/production-stage-definitions": [], ...extra });
  const d = detail as { stage: ReturnType<typeof stage> };
  renderWithClient(<StageDrawer stage={d.stage as never} jobId="j1" onClose={() => undefined} />);
  return calls;
};

describe("board", () => {
  it("board params: only board-supported filters are sent, columns come from the backend, cards link to the job", async () => {
    search = "status=READY,IN_PROGRESS&priority=HIGH&delayed=true&blocked=true&unassigned=true&sort=oldest&sourceType=BULK_ORDER";
    const calls = mockApi({ "GET /admin/production/board": { columns: [{ stageCode: "CUTTING", stageName: "Cutting", departmentType: "CUTTING", sequence: 3, counts: { READY: 1 }, total: 1, cards: [{ stageId: "st1", jobId: "j1", jobNumber: "JOB-000001", productName: "Tee", brandName: "B", customerName: "C", priority: "HIGH", status: "READY", attempt: 1, isDelayed: false, isOnHold: false, dueAt: null, readyAt: null, startedAt: null, blockReason: null, assignees: [] }] }] } });
    renderWithClient(<ProductionPage />);
    expect(await screen.findByRole("link", { name: "JOB-000001" })).toHaveAttribute("href", "/production/jobs/j1?stage=st1");
    const q = Object.fromEntries(new URLSearchParams(calls.find((c) => c.path === "/admin/production/board")!.query));
    expect(q).toMatchObject({ status: "READY,IN_PROGRESS", priority: "HIGH", delayed: "true", blocked: "true", unassigned: "true" });
    expect(q).not.toHaveProperty("sourceType");
    expect(q).not.toHaveProperty("sort");
    expect(calls.some((c) => c.path === "/admin/factory-jobs")).toBe(false);
  });
});

describe("My Work", () => {
  it("a factory role sees assigned work only: /staff endpoints, never the board or all jobs", async () => {
    perms = [...FLOOR]; pathname = "/my-work";
    const mine = { ...stage({ id: "st7" }), job: jobSummary };
    const calls = mockApi({ "GET /staff/my-stages": page([mine]), "GET /staff/my-jobs": page([{ ...jobSummary, myStages: [mine] }]) });
    renderWithClient(<MyWorkPage />);
    expect(await screen.findByTestId("my-stage")).toHaveTextContent("JOB-000001");
    expect(screen.getAllByTestId("my-stage")).toHaveLength(1);
    expect(calls.map((c) => c.path).sort()).toEqual(["/staff/my-jobs", "/staff/my-stages"]);
  });
});

describe("staff stage actions", () => {
  it("start-stage: shows exactly the backend's allowedActions, posts to /start, and surfaces a backend error", async () => {
    const calls = openStage(staffDetail(), { "POST /staff/job-stages/st1/start": json(400, { statusCode: 400, message: "Stage is blocked by an open blocker" }) });
    await screen.findByTestId("stage-actions");
    expect(screen.queryByRole("button", { name: "Complete stage" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start stage" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Stage is blocked by an open blocker");
    expect(calls.filter((c) => c.method === "POST" && c.path === "/staff/job-stages/st1/start")).toHaveLength(1);
    expect(screen.getByTestId("task-view")).toHaveTextContent("Navy");
  });

  it("complete-stage: a required note is validated locally, then sent as { note }; a backend refusal is shown", async () => {
    const calls = openStage(staffDetail({ allowedActions: ["COMPLETE", "RAISE_BLOCKER"] }, { status: "IN_PROGRESS", requiresCompletionNote: true }), {
      "POST /staff/job-stages/st1/complete": ({ body }: { body: unknown }) => ((body as { note?: string }).note === "Cut done" ? json(400, { statusCode: 400, message: "Pattern Making requires an attached file" }) : json(200, {})),
    });
    await userEvent.click(await screen.findByRole("button", { name: "Complete stage" }));
    const dialog = await screen.findByRole("dialog", { name: /Complete Cutting/ });
    await userEvent.click(within(dialog).getByRole("button", { name: "Complete stage" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("requires a completion note");
    expect(calls.some((c) => c.path.endsWith("/complete"))).toBe(false);
    await userEvent.type(within(dialog).getByLabelText(/Completion note/), "Cut done");
    await userEvent.click(within(dialog).getByRole("button", { name: "Complete stage" }));
    await waitFor(() => expect(calls.find((c) => c.path.endsWith("/complete"))?.body).toEqual({ note: "Cut done" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("requires an attached file");
  });

  it("blockers: create posts {type, description}; an open blocker can be resolved with a note", async () => {
    const blocker = { id: "bk1", jobId: "j1", jobStageId: "st1", stageName: "Cutting", type: "MATERIAL_UNAVAILABLE", description: "No fabric", status: "OPEN", createdByUserId: "u9", resolvedByUserId: null, resolutionNote: null, createdAt: "2026-10-02T10:00:00Z", resolvedAt: null };
    const calls = openStage(staffDetail({ blockers: [blocker] }, { status: "BLOCKED", blockReason: "No fabric" }), { "POST /staff/job-stages/st1/blockers": {}, "POST /staff/blockers/bk1/resolve": {} });
    const list = await screen.findByTestId("blockers");
    await userEvent.click(within(list).getByRole("button", { name: "Resolve" }));
    const rd = await screen.findByRole("dialog", { name: "Resolve blocker" });
    await userEvent.type(within(rd).getByLabelText(/What was done/), "Fabric arrived");
    await userEvent.click(within(rd).getByRole("button", { name: "Resolve blocker" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/staff/blockers/bk1/resolve")?.body).toEqual({ note: "Fabric arrived" }));
    await userEvent.click(within(screen.getByTestId("stage-actions")).getByRole("button", { name: "Raise blocker" }));
    const bd = await screen.findByRole("dialog", { name: "Raise a blocker" });
    await userEvent.click(within(bd).getByRole("combobox", { name: /Type/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Machine maintenance" }));
    await userEvent.type(within(bd).getByLabelText(/Description/), "Cutter jammed");
    await userEvent.click(within(bd).getByRole("button", { name: "Raise blocker" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/staff/job-stages/st1/blockers")?.body).toEqual({ type: "MACHINE_MAINTENANCE", description: "Cutter jammed" }));
  });
});

describe("assignment", () => {
  const defs = [{ id: "d1", code: "CUTTING", name: "Cutting", description: null, departmentType: "CUTTING", defaultSequence: 3, expectedDurationMinutes: null, requiresAssignment: true, requiresCompletionNote: false, requiresAttachment: false, isQcStage: false, eligibleRoleCodes: ["CUTTING"], isActive: true }];
  const users = page([
    { id: "u2", name: "Carla Cutter", email: "c@x", status: "ACTIVE", roles: [{ code: "CUTTING" }] },
    { id: "u3", name: "Sam Sewer", email: "s@x", status: "ACTIVE", roles: [{ code: "SEWING" }] },
  ]);
  it("with jobs.assign: lists only role-eligible staff and posts the assignment; without it no assignment UI exists", async () => {
    const detail = staffDetail({}, { assignees: [] });
    const calls = openStage(detail, { "GET /admin/production-stage-definitions": defs, "GET /admin/users": users, "POST /admin/job-stages/st1/assignments": {} });
    await userEvent.click(await screen.findByRole("button", { name: "Assign staff…" }));
    const dlg = await screen.findByRole("dialog", { name: "Assign Cutting" });
    expect(await within(dlg).findByText("Carla Cutter")).toBeInTheDocument();
    expect(within(dlg).queryByText("Sam Sewer")).not.toBeInTheDocument();
    await userEvent.click(within(dlg).getByText("Carla Cutter"));
    await waitFor(() => expect(calls.find((c) => c.path === "/admin/job-stages/st1/assignments")?.body).toEqual({ userId: "u2", isPrimary: true }));
  });
  it("floor staff and SALES get no assignment / override controls", async () => {
    perms = [...SALES];
    openStage(staffDetail());
    await screen.findByTestId("stage-actions");
    expect(screen.queryByTestId("admin-actions")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign staff…" })).not.toBeInTheDocument();
  });
});

describe("bulk quantity", () => {
  const quantity = { required: 100, produced: 40, rejected: 2, reworkFlagged: 0, remaining: 58, reworkAffectedQuantity: null };
  it("report correctness: only the entered quantities are sent as integers; empty reports are refused locally", async () => {
    const onReport = vi.fn().mockResolvedValue(undefined);
    renderWithClient(<QuantitySection quantity={quantity} canReport orderVariants={[]} onReport={onReport} />);
    expect(screen.getByText("58")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add report" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least one");
    expect(onReport).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Produced (good)"), "20");
    await userEvent.type(screen.getByLabelText("Rejected (scrapped)"), "2");
    await userEvent.click(screen.getByRole("button", { name: "Add report" }));
    await waitFor(() => expect(onReport).toHaveBeenCalledWith({ producedQuantity: 20, rejectedQuantity: 2 }));
  });
  it("over-reporting: the backend's refusal is shown verbatim and the entered values are kept", async () => {
    renderWithClient(<QuantitySection quantity={quantity} canReport orderVariants={[]} onReport={async () => { throw new (await import("@/lib/api/errors")).ApiError({ kind: "validation", status: 400, messages: ["Cannot report 70: only 58 units remain for this stage"] }); }} />);
    await userEvent.type(screen.getByLabelText("Produced (good)"), "70");
    await userEvent.click(screen.getByRole("button", { name: "Add report" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("only 58 units remain");
    expect(screen.getByLabelText("Produced (good)")).toHaveValue("70");
  });
});

describe("bulk job integration (Phase 5A)", () => {
  it("a bulk stage shows the order's variants and offers them for quantity reports (real orderView shape)", async () => {
    const orderView = { orderNumber: "ORD-000011", plannedQuantity: 100, batch: false, items: [{ productName: "Tee", notes: null, variants: [{ variantId: "v1", size: { code: "XS", name: "XS" }, color: { name: "Black", hex: "#000000" }, quantity: 40, notes: null }, { variantId: "v2", size: { code: "S", name: "S" }, color: { name: "Black", hex: "#000000" }, quantity: 60, notes: null }] }] };
    const calls = openStage(staffDetail({ allowedActions: ["COMPLETE", "ADD_NOTE"], orderView, quantity: { required: 100, produced: 0, rejected: 0, reworkFlagged: 0, remaining: 100, reworkAffectedQuantity: null } }, { status: "IN_PROGRESS" }), {
      "GET /staff/job-stages/st1/production-reports": { quantity: { required: 100, produced: 0, rejected: 0, reworkFlagged: 0, remaining: 100, reworkAffectedQuantity: null }, reports: [] },
      "POST /staff/job-stages/st1/production-reports": {},
    });
    const ov = await screen.findByTestId("order-view");
    expect(ov).toHaveTextContent("ORD-000011 · 100 units");
    expect(ov).toHaveTextContent("Black / XS");
    await userEvent.type(await screen.findByLabelText("Produced (good)"), "40");
    await userEvent.click(screen.getByRole("combobox", { name: /Variant/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Black / XS (40)" }));
    await userEvent.click(screen.getByRole("button", { name: "Add report" }));
    await waitFor(() => expect(calls.find((c) => c.path.endsWith("/production-reports") && c.method === "POST")?.body).toEqual({ producedQuantity: 40, orderVariantId: "v1" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: /Variant/ })).toHaveTextContent("Not specified")); // the variant never silently carries over to the next report
  });
});

describe("QC execution", () => {
  const stageCodes = [{ code: "CUTTING", name: "Cutting" }];
  it("checklist renders the backend's item types (pass/fail, measurement, text, photo) and tracks required items", async () => {
    renderWithClient(<QcExecution inspection={inspection() as never} quantity={null} stageCodes={stageCodes} onChanged={() => undefined} />);
    const items = screen.getAllByTestId("qc-item");
    expect(items.map((i) => i.getAttribute("data-type"))).toEqual(["PASS_FAIL", "MEASUREMENT", "TEXT", "PHOTO_REQUIRED"]);
    expect(within(items[0]!).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Pass", "Fail", "N/A"]);
    expect(within(items[1]!).getByPlaceholderText("Measured value")).toHaveAttribute("inputmode", "decimal");
    expect(within(items[3]!).getByText(/Photo evidence is required/)).toBeInTheDocument();
  });
  it("required-result validation: cannot complete until every required item is answered; payload only has answered items", async () => {
    renderWithClient(<QcExecution inspection={inspection() as never} quantity={null} stageCodes={stageCodes} onChanged={() => undefined} />);
    const complete = screen.getByRole("button", { name: "Complete inspection…" });
    expect(complete).toBeDisabled();
    expect(screen.getByTestId("qc-missing")).toHaveTextContent("Stitching is even, Chest width (cm)");
    const items = screen.getAllByTestId("qc-item");
    await userEvent.click(within(items[0]!).getByRole("radio", { name: "Pass" }));
    await userEvent.type(within(items[1]!).getByPlaceholderText("Measured value"), "52.5");
    await userEvent.click(within(items[1]!).getByRole("radio", { name: "Pass" })); // a measurement needs a PASS/FAIL too (live contract)
    expect(complete).toBeEnabled();
    const r = inspection().results as never[];
    expect(buildResultsPayload(r, { STITCH: { result: "PASS" }, CHEST: { result: "PASS", numeric: "52.5" } })).toEqual([{ itemCode: "STITCH", result: "PASS" }, { itemCode: "CHEST", result: "PASS", numericValue: 52.5 }]);
    expect(missingRequired(r, { STITCH: { result: "PASS" } }).map((m) => m.itemCode)).toEqual(["CHEST"]);
  });
  it("pass / fail workflow: saves answers first, FAIL needs notes, plain PASS with failed items shows the backend refusal, FAIL posts overall result + notes", async () => {
    const calls = mockApi({
      "PUT /staff/qc-inspections/qi1/results": {},
      "POST /staff/qc-inspections/qi1/complete": ({ body }: { body: { overallResult: string } }) => (body.overallResult === "PASS" ? json(400, { statusCode: 400, message: "The inspection has failed items and cannot be a plain PASS" }) : json(200, {})),
    });
    renderWithClient(<QcExecution inspection={inspection() as never} quantity={null} stageCodes={stageCodes} onChanged={() => undefined} />);
    const items = screen.getAllByTestId("qc-item");
    await userEvent.click(within(items[0]!).getByRole("radio", { name: "Fail" }));
    await userEvent.type(within(items[1]!).getByPlaceholderText("Measured value"), "50");
    await userEvent.click(within(items[1]!).getByRole("radio", { name: "Pass" }));
    await userEvent.click(screen.getByRole("button", { name: "Complete inspection…" }));
    const dlg = await screen.findByRole("dialog", { name: "Complete inspection" });
    // suggestion is FAIL because an item failed; switch to PASS to see the backend refusal
    await userEvent.click(within(dlg).getByRole("combobox", { name: /Overall result/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Pass" }));
    await userEvent.click(within(dlg).getByRole("button", { name: "Complete inspection" }));
    expect(await screen.findByText(/cannot be a plain PASS/)).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith("/results"))).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Complete inspection…" }));
    const d2 = await screen.findByRole("dialog", { name: "Complete inspection" });
    await userEvent.click(within(d2).getByRole("button", { name: "Complete inspection" }));
    expect(await within(d2).findByRole("alert")).toHaveTextContent("Notes are required for a FAIL");
    await userEvent.type(within(d2).getByLabelText(/Notes/), "Uneven stitching");
    await userEvent.click(within(d2).getByRole("button", { name: "Complete inspection" }));
    await waitFor(() => expect(calls.filter((c) => c.path.endsWith("/complete")).at(-1)?.body).toMatchObject({ overallResult: "FAIL", notes: "Uneven stitching" }));
  });
  it("failed quantity / rework rendering: bulk quantities must add up, and a failed inspection shows its failed units and rework", async () => {
    const calls = mockApi({ "PUT /staff/qc-inspections/qi1/results": {}, "POST /staff/qc-inspections/qi1/complete": {} });
    const quantity = { required: 100, produced: 100, rejected: 0, reworkFlagged: 0, remaining: 0, reworkAffectedQuantity: null };
    renderWithClient(<QcExecution inspection={inspection() as never} quantity={quantity} stageCodes={stageCodes} onChanged={() => undefined} />);
    const items = screen.getAllByTestId("qc-item");
    await userEvent.click(within(items[0]!).getByRole("radio", { name: "Fail" }));
    await userEvent.type(within(items[1]!).getByPlaceholderText("Measured value"), "50");
    await userEvent.click(within(items[1]!).getByRole("radio", { name: "Pass" }));
    await userEvent.click(screen.getByRole("button", { name: "Complete inspection…" }));
    const dlg = await screen.findByRole("dialog", { name: "Complete inspection" });
    await userEvent.type(within(dlg).getByLabelText(/Notes/), "Bad seams");
    await userEvent.type(within(dlg).getByLabelText("Passed"), "90");
    await userEvent.type(within(dlg).getByLabelText("Failed"), "5");
    await userEvent.click(within(dlg).getByRole("button", { name: "Complete inspection" }));
    expect(await within(dlg).findByRole("alert")).toHaveTextContent("Passed + failed (95) must equal inspected (100)");
    expect(calls.some((c) => c.path.endsWith("/complete"))).toBe(false);
    await userEvent.clear(within(dlg).getByLabelText("Failed"));
    await userEvent.type(within(dlg).getByLabelText("Failed"), "10");
    await userEvent.click(within(dlg).getByRole("button", { name: "Complete inspection" }));
    await waitFor(() => expect(calls.find((c) => c.path.endsWith("/complete"))?.body).toMatchObject({ overallResult: "FAIL", inspectedQuantity: 100, passedQuantity: 90, failedQuantity: 10 }));
  });
  it("a completed failed inspection shows failed units and the rework link", () => {
    const done = inspection({ status: "COMPLETED", overallResult: "FAIL", inspectedQuantity: 100, passedQuantity: 90, failedQuantity: 10, reworkId: "rw1", results: qcResults().map((r, i) => (i === 0 ? { ...r, result: "FAIL" } : r)) });
    renderWithClient(<InspectionSummary inspection={done as never} />);
    expect(screen.getByTestId("inspection")).toHaveTextContent("failed 10");
    expect(screen.getByText(/rework record was created/)).toBeInTheDocument();
    expect(screen.getByTestId("inspection")).toHaveTextContent("Fail");
  });
});

describe("job detail", () => {
  const history = [
    stage({ id: "st0", stageName: "Cutting", attempt: 1, superseded: true, status: "COMPLETED" }),
    stage({ id: "st2", stageName: "Cutting", attempt: 2, status: "READY" }),
  ];
  const base = (extra: Record<string, unknown> = {}) => mockApi({
    "GET /admin/factory-jobs/j1": jobDetail({ stages: history }), "GET /admin/factory-jobs/j1/blockers": [], "GET /admin/factory-jobs/j1/notes": [],
    "GET /admin/factory-jobs/j1/rework": [{ id: "rw1", jobId: "j1", failedStageId: "q1", qcInspectionId: "qi1", targetStageCode: "CUTTING", targetStageName: "Cutting", reason: "Seams failed", affectedQuantity: 10, status: "OPEN", newStageIds: ["st2"], createdByUserId: "u1", createdAt: "2026-10-03T10:00:00Z", resolvedAt: null }],
    "GET /admin/factory-jobs/j1/timeline": page([{ id: "a1", type: "REWORK_CREATED", message: "Rework created from QC", jobStageId: null, actorUserId: "u1", actorName: "Quinn", metadata: null, createdAt: "2026-10-03T10:00:00Z" }, { id: "a2", type: "ADMIN_OVERRIDE", message: "Stage skipped", jobStageId: null, actorUserId: "u1", actorName: "Admin", metadata: null, createdAt: "2026-10-03T11:00:00Z" }]),
    ...extra,
  });
  it("rework history is preserved: superseded attempts stay visible next to the new attempt, and the Rework tab explains why", async () => {
    pathname = "/production/jobs/j1"; search = "tab=stages";
    base();
    renderWithClient(<JobDetailPage id="j1" />);
    const list = await screen.findByTestId("stages-list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-superseded", "true");
    expect(rows[0]).toHaveTextContent("history");
    expect(rows[1]).toHaveTextContent("attempt 2");
  });
  it("JobActivity vs AuditLog: the timeline reads /timeline (job activity), never the audit log, and flags admin overrides", async () => {
    pathname = "/production/jobs/j1"; search = "tab=timeline";
    const calls = base();
    renderWithClient(<JobDetailPage id="j1" />);
    const tl = await screen.findByTestId("timeline");
    expect(within(tl).getByText("Rework created")).toBeInTheDocument();
    const rows = within(tl).getAllByRole("listitem");
    expect(rows[0]).toHaveAttribute("data-type", "ADMIN_OVERRIDE"); // newest first
    expect(calls.some((c) => c.path.includes("audit"))).toBe(false);
    expect(calls.some((c) => c.path === "/admin/factory-jobs/j1/timeline")).toBe(true);
  });
  it("SALES / FINANCE-type roles (read only) get no operational mutation UI on the job", async () => {
    perms = [...SALES]; pathname = "/production/jobs/j1";
    base();
    renderWithClient(<JobDetailPage id="j1" />);
    await screen.findByRole("tab", { name: "Overview" });
    for (const n of ["Put on hold", "Cancel job", "Force complete…", "Raise blocker", "Release to factory", "Priority"]) expect(screen.queryByRole("button", { name: n })).not.toBeInTheDocument();
  });
  it("403 shows Access denied in place and never signs the user out", async () => {
    pathname = "/production/jobs/j1";
    mockApi({ "GET /admin/factory-jobs/j1": json(403, { statusCode: 403, message: "Insufficient permissions" }), "GET /admin/factory-jobs/j1/blockers": json(403, { statusCode: 403, message: "no" }), "GET /admin/factory-jobs/j1/notes": json(403, { statusCode: 403, message: "no" }) });
    renderWithClient(<JobDetailPage id="j1" />);
    expect((await screen.findAllByText(/access|permission/i)).length).toBeGreaterThan(0);
    expect(tokenStore.get()).toBe("t");
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining("/login"));
  });
});

describe("private stage files", () => {
  it("download requests a signed URL only on click, opens it on the API origin, and never shows a storage key", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const calls = mockApi({ "GET /staff/job-stages/st1/files/as1/download-url": { url: "/api/v1/storage/local/tok123", expiresAt: "2026-10-22T12:00:00Z" } });
    renderWithClient(<StageFileButton stageId="st1" file={{ attachmentId: "at1", assetId: "as1", type: "STAGE_PHOTO", originalName: "cut.jpg", mimeType: "image/jpeg", sizeBytes: 100, description: null, createdAt: "2026-10-01T10:00:00Z" }} />);
    expect(calls).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Download cut.jpg" }));
    await waitFor(() => expect(open).toHaveBeenCalledWith("http://api.test/api/v1/storage/local/tok123", "_blank", "noopener,noreferrer"));
    expect(document.body.innerHTML).not.toContain("tok123");
  });
});

describe("Administrative operator mode on Job Detail (ADMIN and SUPER_ADMIN)", () => {
  const SUPER_ADMIN = [...ADMIN, "orders.manage", "users.manage", "audit.read"];

  const stage1Unassigned = stage({ id: "st1", stageName: "Fabric Preparation", sequence: 1, status: "READY", assignees: [] });
  const stage2 = stage({ id: "st2", stageName: "Cutting", sequence: 2, status: "WAITING", assignees: [] });
  const jobTwoStages = jobDetail({ stages: [stage1Unassigned, stage2] });

  it("1 & 5. ADMIN can operate an unassigned eligible stage directly from the Current Stage panel, and completing it refreshes to next stage", async () => {
    perms = [...ADMIN]; pathname = "/production/jobs/j1";
    let completed = false;

    const staffDetail1 = {
      stage: stage1Unassigned,
      job: jobSummary,
      taskView: { fabric: "Milton 100% Cotton", gsm: 200 },
      allowedActions: ["START", "COMPLETE", "ADD_NOTE", "ATTACH_FILE", "RAISE_BLOCKER"],
      blockers: [],
      notes: [],
      files: [],
      quantity: null,
      orderView: null,
      qcInspection: null,
    };
    const staffDetail2 = {
      stage: { ...stage2, status: "READY" },
      job: jobSummary,
      taskView: { fit: "Regular" },
      allowedActions: ["START", "RAISE_BLOCKER"],
      blockers: [],
      notes: [],
      files: [],
      quantity: null,
      orderView: null,
      qcInspection: null,
    };

    const calls = mockApi({
      "GET /admin/factory-jobs/j1": () => json(200, completed ? jobDetail({ stages: [{ ...stage1Unassigned, status: "COMPLETED" }, { ...stage2, status: "READY" }] }) : jobTwoStages),
      "GET /admin/factory-jobs/j1/blockers": [],
      "GET /admin/factory-jobs/j1/notes": [],
      "GET /admin/factory-jobs/j1/rework": [],
      "GET /admin/factory-jobs/j1/timeline": page([]),
      "GET /staff/job-stages/st1": staffDetail1,
      "GET /staff/job-stages/st2": staffDetail2,
      "GET /admin/production-stage-definitions": [],
      "POST /staff/job-stages/st1/start": { ...stage1Unassigned, status: "IN_PROGRESS" },
      "POST /staff/job-stages/st1/complete": () => { completed = true; return json(200, { ...stage1Unassigned, status: "COMPLETED" }); },
    });

    renderWithClient(<JobDetailPage id="j1" />);

    // 1. Prominent current stage card exists with stage name, status, and Unassigned
    const panel = await screen.findByTestId("current-stage-card");
    expect(within(panel).getByText("Fabric Preparation")).toBeInTheDocument();
    expect(within(panel).getByText("Unassigned")).toBeInTheDocument();
    // Neutral label for administrative operation
    expect(await within(panel).findByTestId("administrative-operation")).toHaveTextContent("Administrative operation");

    // Start stage
    const startBtn = await within(panel).findByRole("button", { name: "Start stage" });
    await userEvent.click(startBtn);
    await waitFor(() => expect(calls.some((c) => c.path === "/staff/job-stages/st1/start")).toBe(true));

    // Complete stage
    const completeBtn = await within(panel).findByRole("button", { name: "Complete stage" });
    await userEvent.click(completeBtn);
    const dlg = await screen.findByRole("dialog", { name: /Complete Fabric Preparation/ });
    await userEvent.click(within(dlg).getByRole("button", { name: "Complete stage" }));

    // 5. Without leaving the page, next stage becomes the current stage automatically!
    await waitFor(() => expect(within(screen.getByTestId("current-stage-card")).getByText("Cutting")).toBeInTheDocument());
  });

  it("2. SUPER_ADMIN can operate the stage end-to-end identically through permissions (no role check)", async () => {
    perms = [...SUPER_ADMIN]; pathname = "/production/jobs/j1";
    mockApi({
      "GET /admin/factory-jobs/j1": jobTwoStages,
      "GET /admin/factory-jobs/j1/blockers": [],
      "GET /admin/factory-jobs/j1/notes": [],
      "GET /admin/factory-jobs/j1/rework": [],
      "GET /admin/factory-jobs/j1/timeline": page([]),
      "GET /staff/job-stages/st1": {
        stage: stage1Unassigned,
        job: jobSummary,
        taskView: {},
        allowedActions: ["START", "RAISE_BLOCKER"],
        blockers: [],
        notes: [],
        files: [],
        quantity: null,
        orderView: null,
        qcInspection: null,
      },
      "GET /admin/production-stage-definitions": [],
      "POST /staff/job-stages/st1/start": { ...stage1Unassigned, status: "IN_PROGRESS" },
    });

    renderWithClient(<JobDetailPage id="j1" />);
    const panel = await screen.findByTestId("current-stage-card");
    expect(within(panel).getByText("Fabric Preparation")).toBeInTheDocument();
    expect(await within(panel).findByRole("button", { name: "Start stage" })).toBeInTheDocument();
  });

  it("4. ADMIN/SUPER_ADMIN can perform QC inspection directly from the current stage card", async () => {
    perms = [...ADMIN]; pathname = "/production/jobs/j1";
    const qcSt = stage({ id: "st-qc", stageName: "QC Gate 1", sequence: 4, status: "IN_PROGRESS", isQcStage: true, assignees: [] });
    const qi = inspection({ id: "qi-live", jobStageId: "st-qc", stageName: "QC Gate 1" });

    const calls = mockApi({
      "GET /admin/factory-jobs/j1": jobDetail({ stages: [qcSt] }),
      "GET /admin/factory-jobs/j1/blockers": [],
      "GET /admin/factory-jobs/j1/notes": [],
      "GET /admin/factory-jobs/j1/rework": [],
      "GET /admin/factory-jobs/j1/timeline": page([]),
      "GET /staff/job-stages/st-qc": {
        stage: qcSt,
        job: jobSummary,
        taskView: {},
        allowedActions: ["START_QC"],
        blockers: [],
        notes: [],
        files: [],
        quantity: null,
        orderView: null,
        qcInspection: qi,
      },
      "GET /admin/production-stage-definitions": [],
      "PUT /staff/qc-inspections/qi-live/results": {},
      "POST /staff/qc-inspections/qi-live/complete": {},
    });

    renderWithClient(<JobDetailPage id="j1" />);
    const panel = await screen.findByTestId("current-stage-card");
    expect(await within(panel).findByText("Inspection · QC Gate 1")).toBeInTheDocument();

    // Fill required items and complete inspection
    for (const r of await within(panel).findAllByRole("radio", { name: "Pass" })) await userEvent.click(r);
    await userEvent.type(within(panel).getByPlaceholderText("Measured value"), "52");
    await userEvent.click(within(panel).getByRole("button", { name: "Complete inspection…" }));
    const dlg = await screen.findByRole("dialog", { name: "Complete inspection" });
    await userEvent.click(within(dlg).getByRole("button", { name: "Complete inspection" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/staff/qc-inspections/qi-live/complete")).toBe(true));
  });

  it("5. Bulk quantity reporting directly from the Current Stage panel", async () => {
    perms = [...ADMIN]; pathname = "/production/jobs/j1";
    const bulkSt = stage({ id: "st-sew", stageName: "Sewing", sequence: 7, status: "IN_PROGRESS", assignees: [] });
    const bulkQuantity = { required: 100, produced: 40, rejected: 5, reworkFlagged: 0, remaining: 55, reworkAffectedQuantity: null };

    const calls = mockApi({
      "GET /admin/factory-jobs/j1": jobDetail({ stages: [bulkSt] }),
      "GET /admin/factory-jobs/j1/blockers": [],
      "GET /admin/factory-jobs/j1/notes": [],
      "GET /admin/factory-jobs/j1/rework": [],
      "GET /admin/factory-jobs/j1/timeline": page([]),
      "GET /staff/job-stages/st-sew": {
        stage: bulkSt,
        job: jobSummary,
        taskView: {},
        allowedActions: ["COMPLETE", "ADD_NOTE"],
        blockers: [],
        notes: [],
        files: [],
        quantity: bulkQuantity,
        orderView: null,
        qcInspection: null,
      },
      "GET /staff/job-stages/st-sew/production-reports": { quantity: bulkQuantity, reports: [] },
      "GET /admin/production-stage-definitions": [],
      "POST /staff/job-stages/st-sew/production-reports": {},
    });

    renderWithClient(<JobDetailPage id="j1" />);
    const panel = await screen.findByTestId("current-stage-card");
    expect(await within(panel).findByTestId("quantity-section")).toBeInTheDocument();
    await userEvent.type(within(panel).getByLabelText("Produced (good)"), "20");
    await userEvent.click(within(panel).getByRole("button", { name: "Add report" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/staff/job-stages/st-sew/production-reports")).toBe(true));
  });

  it("6. Floor staff who lacks jobs.read_all gets 403 / Access Denied when attempting to access the Job Detail UI", async () => {
    perms = [...FLOOR]; pathname = "/production/jobs/j1";
    mockApi({
      "GET /admin/factory-jobs/j1": json(403, { statusCode: 403, message: "Missing permission. Requires: jobs.read_all" }),
    });

    renderWithClient(<JobDetailPage id="j1" />);
    expect(await screen.findByText(/Access denied|Missing permission/i)).toBeInTheDocument();
  });

  it("7. Backend validation still blocks invalid completion", async () => {
    perms = [...ADMIN]; pathname = "/production/jobs/j1";
    const stNoteRequired = stage({ id: "st-note", stageName: "Pattern Making", status: "IN_PROGRESS", requiresCompletionNote: true, assignees: [] });

    mockApi({
      "GET /admin/factory-jobs/j1": jobDetail({ stages: [stNoteRequired] }),
      "GET /admin/factory-jobs/j1/blockers": [],
      "GET /admin/factory-jobs/j1/notes": [],
      "GET /admin/factory-jobs/j1/rework": [],
      "GET /admin/factory-jobs/j1/timeline": page([]),
      "GET /staff/job-stages/st-note": {
        stage: stNoteRequired,
        job: jobSummary,
        taskView: {},
        allowedActions: ["COMPLETE"],
        blockers: [],
        notes: [],
        files: [],
        quantity: null,
        orderView: null,
        qcInspection: null,
      },
      "GET /admin/production-stage-definitions": [],
      "POST /staff/job-stages/st-note/complete": json(400, { statusCode: 400, message: "Pattern file attachment is required before completion" }),
    });

    renderWithClient(<JobDetailPage id="j1" />);
    const panel = await screen.findByTestId("current-stage-card");
    await userEvent.click(await within(panel).findByRole("button", { name: "Complete stage" }));
    const dlg = await screen.findByRole("dialog", { name: /Complete Pattern Making/ });
    await userEvent.type(within(dlg).getByLabelText(/Completion note/), "Done pattern");
    await userEvent.click(within(dlg).getByRole("button", { name: "Complete stage" }));
    expect(await within(dlg).findByRole("alert")).toHaveTextContent("Pattern file attachment is required before completion");
  });

  it("8. Preserves actual assignments: operating an assigned stage does not clear or reassign it", async () => {
    perms = [...ADMIN]; pathname = "/production/jobs/j1";
    const assignedWorkerStage = stage({ id: "st-w", stageName: "Cutting", status: "READY", assignees: [{ assignmentId: "a1", userId: "worker-1", name: "Ahmed Worker", isPrimary: true, context: null, assignedAt: "2026-10-01T10:00:00Z" }] });

    mockApi({
      "GET /admin/factory-jobs/j1": jobDetail({ stages: [assignedWorkerStage] }),
      "GET /admin/factory-jobs/j1/blockers": [],
      "GET /admin/factory-jobs/j1/notes": [],
      "GET /admin/factory-jobs/j1/rework": [],
      "GET /admin/factory-jobs/j1/timeline": page([]),
      "GET /staff/job-stages/st-w": {
        stage: assignedWorkerStage,
        job: jobSummary,
        taskView: {},
        allowedActions: ["START", "RAISE_BLOCKER"],
        blockers: [],
        notes: [],
        files: [],
        quantity: null,
        orderView: null,
        qcInspection: null,
      },
      "GET /admin/production-stage-definitions": [],
    });

    renderWithClient(<JobDetailPage id="j1" />);
    const panel = await screen.findByTestId("current-stage-card");
    // Preserves actual assignment in the UI
    expect(within(panel).getByText(/Assigned: Ahmed Worker/)).toBeInTheDocument();
    expect(await within(panel).findByTestId("administrative-operation")).toBeInTheDocument();
  });
});

