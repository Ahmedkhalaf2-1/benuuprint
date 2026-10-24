import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json, mockApi, renderWithClient } from "./helpers";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }), usePathname: () => "/account/samples/s1", useSearchParams: () => new URLSearchParams(search) }));
vi.mock("@/features/portal/auth/customer-auth-provider", () => ({ useCustomerAuth: () => ({ status: "authenticated", customer: { id: "c1", name: "Nile" }, login: vi.fn(), logout: vi.fn() }) }));

import { SampleDetailPage } from "@/features/portal/sample-detail";
import { ApprovalCard, JourneyFiles, PaymentTab, ProductionTracker, QuotationTab, can, primaryAction } from "@/features/portal/journey";
import type { CustomerAction, SampleDetail } from "@/features/portal/types";

const sample = (actions: CustomerAction[] = [], o: Record<string, unknown> = {}): SampleDetail => ({
  id: "s1", sampleNumber: "SMP-000001", status: "QUOTATION_READY", statusLabel: "Quotation ready", nextStep: "Review your quotation.", editable: false, brand: { id: "b1", name: "Nile Core" }, productName: "Tee", fabricName: null, colorName: null,
  submittedAt: "2026-10-02T10:00:00Z", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-03T10:00:00Z", revisionNumber: 1, productTypeId: null, customProductName: null, customProductDescription: null, fabricId: null, customFabricName: null, customFabricDescription: null,
  fabricProvider: null, gsm: null, fabricColorId: null, customColorName: null, customPantone: null, customHex: null, size: null, fitMethod: null, pattern: null, notes: null, fitNotes: null, printNotes: null, fabricNotes: null, specialInstructions: null,
  decorations: [], accessories: [], components: [], files: [], terms: { required: true, accepted: true, activeTermsVersionId: "t1", activeVersion: 1 }, allowedActions: actions, ...o,
}) as SampleDetail;

const version = (o: Record<string, unknown> = {}) => ({ id: "v2", versionNumber: 2, status: "SENT", isCurrent: true, actionable: true, currency: "EGP", lineItems: [{ type: "SAMPLE_FEE", description: "Sample fee", quantity: "1.00", unitPrice: "500.00", amount: "500.00" }], subtotal: "500.00", discount: "50.00", taxPercent: "14.00", tax: "63.00", total: "513.00", validUntil: "2026-12-01T00:00:00Z", sentAt: "2026-10-03T10:00:00Z", acceptedAt: null, rejectedAt: null, supersededAt: null, notes: "Valid for 30 days", ...o });
const quotations = (o: Record<string, unknown> = {}, versions = [version(), version({ id: "v1", versionNumber: 1, status: "SUPERSEDED", isCurrent: false, actionable: false, total: "400.00", supersededAt: "2026-10-03T09:00:00Z" })]) => ({ quotations: [{ id: "q1", quotationNumber: "QTN-000001", currency: "EGP", status: "SENT", versions }], actionableVersionId: "v2", requiresReview: false, notice: null, ...o });
const summary = (o: Record<string, unknown> = {}) => ({ status: "PAYMENT_REQUIRED", currency: "EGP", requiredAmount: "513.00", verifiedAmount: "0.00", pendingAmount: "0.00", remainingAmount: "513.00", ...o });
const payment = (o: Record<string, unknown> = {}) => ({ id: "p1", paymentNumber: "PAY-000001", amount: "513.00", currency: "EGP", method: "BANK_TRANSFER", status: "PENDING_VERIFICATION", transactionReference: "TX1", proofFileName: "receipt.pdf", hasProof: true, receivedAt: null, submittedAt: "2026-10-04T10:00:00Z", verifiedAt: null, message: null, canReplaceProof: false, ...o });

beforeEach(() => { replace.mockClear(); search = ""; });
afterEach(() => vi.unstubAllGlobals());

describe("allowedActions drive the call to action (no local state machine)", () => {
  it("only what the backend lists is offered, in journey order", () => {
    const p = (a: CustomerAction[]) => primaryAction({ allowedActions: a });
    expect(p(["ACCEPT_QUOTATION", "REJECT_QUOTATION"])).toEqual({ label: "Review quotation", kind: "tab", tab: "quotation" });
    expect(p(["UPLOAD_PAYMENT_PROOF"])).toEqual({ label: "Upload payment proof", kind: "tab", tab: "payment" });
    expect(p(["APPROVE_SAMPLE", "REQUEST_CHANGES"])).toEqual({ label: "Review sample", kind: "tab", tab: "production" });
    expect(p(["EDIT_REQUEST", "SUBMIT_REQUEST"])).toEqual({ label: "Continue editing", kind: "edit" });
    expect(p(["UPLOAD_PAYMENT_PROOF", "ACCEPT_QUOTATION"])?.tab).toBe("quotation");
    expect(p([])).toBeNull();
    expect(primaryAction({ allowedActions: undefined })).toBeNull();
    expect(can({ allowedActions: ["APPROVE_SAMPLE"] }, "ACCEPT_QUOTATION")).toBe(false);
  });
  it("the sample page shows status, next step and ONE primary CTA that opens the right section; tabs appear only when there is something to show", async () => {
    mockApi({
      "GET /customer/samples/s1": sample(["ACCEPT_QUOTATION", "REJECT_QUOTATION"]),
      "GET /customer/samples/s1/commercial": { sampleId: "s1", quotation: { quotationId: "q1", quotationNumber: "QTN-000001", versionId: "v2", versionNumber: 2, status: "SENT", total: "513.00", currency: "EGP", validUntil: null, requiresReview: false }, payment: summary({ status: "NOT_REQUIRED_YET", requiredAmount: null, remainingAmount: null }), nextAction: "REVIEW_QUOTATION", allowedActions: ["ACCEPT_QUOTATION", "REJECT_QUOTATION"] },
      "GET /customer/samples/s1/production": { phase: "NOT_STARTED", steps: [] },
    });
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByTestId("next-step")).toHaveTextContent("Review your quotation.");
    const cta = await screen.findByTestId("primary-cta");
    expect(cta).toHaveTextContent("Review quotation");
    await waitFor(() => expect(screen.getByRole("tab", { name: "Quotation" })).toBeInTheDocument());
    expect(screen.queryByRole("tab", { name: "Payment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Production" })).not.toBeInTheDocument();
    await userEvent.click(cta);
    expect(replace).toHaveBeenCalledWith("/account/samples/s1?tab=quotation", { scroll: false });
  });
});

describe("quotation", () => {
  it("current vs previous quotation are labelled; only the backend's actionable version has buttons; no internal fields appear", async () => {
    const q = quotations();
    (q.quotations[0]!.versions[0] as Record<string, unknown>).internalCost = "SECRET-COST";
    mockApi({ "GET /customer/samples/s1/quotation": q });
    renderWithClient(<QuotationTab sample={sample(["ACCEPT_QUOTATION", "REJECT_QUOTATION"])} />);
    const cards = await screen.findAllByTestId("quotation-version");
    expect(cards[0]).toHaveTextContent("Current quotation");
    expect(cards[0]).toHaveTextContent("version 2");
    expect(cards[0]).toHaveTextContent("EGP 513.00");
    expect(cards[0]).toHaveTextContent("Discount");
    expect(cards[0]).toHaveTextContent("Tax (14%)");
    expect(cards[0]).toHaveTextContent("Valid for 30 days");
    expect(within(cards[0]!).getByRole("button", { name: "Accept quotation" })).toBeInTheDocument();
    expect(cards[1]).toHaveTextContent("Previous quotation");
    expect(cards[1]).toHaveTextContent("Superseded");
    expect(within(cards[1]!).queryByRole("button")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("SECRET-COST");
  });
  it("a version that is not the backend's actionable one never gets buttons, and without ACCEPT/REJECT in allowedActions there are none at all", async () => {
    mockApi({ "GET /customer/samples/s1/quotation": quotations({ actionableVersionId: null }, [version({ actionable: false, status: "ACCEPTED", acceptedAt: "2026-10-04T10:00:00Z" })]) });
    const a = renderWithClient(<QuotationTab sample={sample(["ACCEPT_QUOTATION"])} />);
    await screen.findByTestId("quotation-version");
    expect(screen.queryByRole("button", { name: "Accept quotation" })).not.toBeInTheDocument();
    a.unmount();
    mockApi({ "GET /customer/samples/s1/quotation": quotations() });
    renderWithClient(<QuotationTab sample={sample([])} />);
    await screen.findAllByTestId("quotation-version");
    expect(screen.queryByRole("button", { name: /Accept quotation|Reject quotation/ })).not.toBeInTheDocument();
  });
  it("re-review: a newer quotation shows the backend's notice and does not imply the old acceptance applies", async () => {
    mockApi({ "GET /customer/samples/s1/quotation": quotations({ requiresReview: true, notice: "A new quotation requires your review." }) });
    renderWithClient(<QuotationTab sample={sample(["ACCEPT_QUOTATION"])} />);
    const n = await screen.findByTestId("re-review");
    expect(n).toHaveTextContent("A new quotation requires your review.");
    expect(n).toHaveTextContent("Any earlier acceptance no longer applies");
  });
  it("accept: asks for confirmation, POSTs to the version's accept route (no body ids), then refreshes the sample, commercial state and timeline", async () => {
    const calls = mockApi({ "GET /customer/samples/s1/quotation": quotations(), "POST /customer/quotation-versions/v2/accept": () => json(200, sample([], { status: "PAYMENT_REQUIRED" })), "GET /customer/samples/s1": sample(), "GET /customer/samples/s1/commercial": {}, "GET /customer/samples/s1/activity": [] });
    const r = renderWithClient(<QuotationTab sample={sample(["ACCEPT_QUOTATION", "REJECT_QUOTATION"])} />);
    await userEvent.click(await screen.findByRole("button", { name: "Accept quotation" }));
    const dlg = await screen.findByRole("dialog", { name: "Accept this quotation?" });
    expect(dlg).toHaveTextContent("EGP 513.00");
    expect(calls.some((c) => c.method === "POST")).toBe(false); // nothing sent before confirming
    await userEvent.click(within(dlg).getByRole("button", { name: "Accept quotation" }));
    await waitFor(() => expect(calls.find((c) => c.method === "POST")?.path).toBe("/customer/quotation-versions/v2/accept"));
    expect(calls.find((c) => c.method === "POST")?.body).toBeUndefined();
    r.unmount();
  });
  it("reject: optional reason; a backend refusal (409) is shown verbatim", async () => {
    let fail = true;
    const calls = mockApi({ "GET /customer/samples/s1/quotation": quotations(), "POST /customer/quotation-versions/v2/reject": () => (fail ? json(409, { statusCode: 409, message: "This quotation has expired" }) : json(200, sample([], { status: "UNDER_REVIEW" }))) });
    renderWithClient(<QuotationTab sample={sample(["ACCEPT_QUOTATION", "REJECT_QUOTATION"])} />);
    await userEvent.click(await screen.findByRole("button", { name: "Reject quotation" }));
    const dlg = await screen.findByRole("dialog", { name: "Reject this quotation?" });
    await userEvent.type(within(dlg).getByLabelText(/Reason/), "Too expensive");
    await userEvent.click(within(dlg).getByRole("button", { name: "Reject quotation" }));
    expect(await within(dlg).findByText("This quotation has expired")).toBeInTheDocument();
    fail = false;
    await userEvent.click(within(dlg).getByRole("button", { name: "Reject quotation" }));
    await waitFor(() => expect(calls.filter((c) => c.method === "POST").at(-1)?.body).toEqual({ reason: "Too expensive" }));
  });
});

describe("payment", () => {
  it("customer-friendly state and amounts in the quotation's single currency; the customer has no verify action", async () => {
    mockApi({ "GET /customer/samples/s1/payments": { summary: summary({ status: "PAYMENT_UNDER_REVIEW", pendingAmount: "513.00", remainingAmount: "0.00" }), payments: [payment()] } });
    renderWithClient(<PaymentTab sample={sample([])} />);
    expect(await screen.findByTestId("payment-status")).toHaveTextContent("Payment under review");
    const sum = screen.getByTestId("payment-summary");
    expect(sum).toHaveTextContent("EGP 513.00");
    expect(sum).toHaveTextContent("All amounts are in EGP.");
    expect(screen.getByTestId("payment-entry-status")).toHaveTextContent("Under review");
    expect(screen.queryByRole("button", { name: /verify|approve payment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Upload payment proof" })).not.toBeInTheDocument(); // not in allowedActions
  });
  it("proof upload exists only with UPLOAD_PAYMENT_PROOF: validates amount/file locally, then posts multipart (file, amount, method, reference) to the sample's payments route", async () => {
    const posted: FormData[] = [];
    mockApi({ "GET /customer/samples/s1/payments": { summary: summary(), payments: [] } });
    renderWithClient(<PaymentTab sample={sample(["UPLOAD_PAYMENT_PROOF"])} />);
    await screen.findByRole("form", { name: "Upload payment proof" });
    vi.stubGlobal("fetch", vi.fn(async (u: string, init?: RequestInit) => { if (init?.method === "POST") { posted.push(init.body as FormData); return json(201, payment()); } return json(200, { summary: summary(), payments: [] }); }));
    await userEvent.click(screen.getByRole("button", { name: "Send payment proof" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a photo or PDF");
    await userEvent.type(screen.getByLabelText(/Transaction reference/), "TX99");
    await userEvent.upload(screen.getByLabelText(/Payment receipt/), new File(["x"], "receipt.png", { type: "image/png" }));
    await userEvent.clear(screen.getByLabelText(/Amount paid/));
    await userEvent.type(screen.getByLabelText(/Amount paid/), "900");
    await userEvent.click(screen.getByRole("button", { name: "Send payment proof" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("cannot be more than what is still due");
    expect(posted).toHaveLength(0);
    await userEvent.clear(screen.getByLabelText(/Amount paid/));
    await userEvent.type(screen.getByLabelText(/Amount paid/), "513");
    await userEvent.click(screen.getByRole("button", { name: "Send payment proof" }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect([...posted[0]!.keys()].sort()).toEqual(["amount", "file", "method", "transactionReference"]);
    expect(posted[0]!.get("amount")).toBe("513");
    expect(posted[0]!.get("method")).toBe("BANK_TRANSFER");
  });
  it("rejected proof: only the team's customer-facing message is shown; replace is offered only when the backend says so; proof opens via a signed link on click only", async () => {
    const open = vi.fn(); vi.stubGlobal("open", open);
    const calls = mockApi({
      "GET /customer/samples/s1/payments": { summary: summary(), payments: [payment({ status: "REJECTED", message: "The amount on the receipt is different. Please send the correct receipt.", internalReason: "FINANCE-ONLY fraud suspicion", canReplaceProof: true })] },
      "GET /customer/payments/p1/proof/download-url": { url: "/api/v1/storage/local/tok-proof", expiresAt: "x" },
      "POST /customer/payments/p1/proof": () => json(200, payment()),
    });
    renderWithClient(<PaymentTab sample={sample(["UPLOAD_PAYMENT_PROOF"])} />);
    expect(await screen.findByTestId("payment-message")).toHaveTextContent("The amount on the receipt is different");
    expect(screen.getByTestId("payment-entry-status")).toHaveTextContent("Could not be verified");
    expect(document.body.textContent).not.toContain("FINANCE-ONLY");
    expect(calls.some((c) => c.path.includes("download-url"))).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: /View proof/ }));
    await waitFor(() => expect(open).toHaveBeenCalledWith("http://api.test/api/v1/storage/local/tok-proof", "_blank", "noopener,noreferrer"));
    expect(document.body.innerHTML).not.toContain("tok-proof");
    await userEvent.upload(screen.getByLabelText("Replace proof for PAY-000001"), new File(["x"], "new.png", { type: "image/png" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/customer/payments/p1/proof")).toBe(true));
  });
  it("no replace button when the backend does not allow it; a verified payment shows 'Payment verified'", async () => {
    mockApi({ "GET /customer/samples/s1/payments": { summary: summary({ status: "PAID", verifiedAmount: "513.00", remainingAmount: "0.00" }), payments: [payment({ status: "VERIFIED", verifiedAt: "2026-10-05T10:00:00Z" })] } });
    renderWithClient(<PaymentTab sample={sample([])} />);
    expect(await screen.findByTestId("payment-status")).toHaveTextContent("Payment verified");
    expect(screen.queryByText("Replace proof")).not.toBeInTheDocument();
  });
});

describe("production, files, approval", () => {
  it("the tracker renders exactly the backend's six coarse steps in order with their states, and nothing internal", () => {
    const steps = [["PREPARING_MATERIALS", "Preparing materials", "DONE"], ["PATTERN_AND_CUTTING", "Pattern & cutting", "DONE"], ["DECORATION", "Decoration", "ACTIVE"], ["SEWING", "Sewing", "PENDING"], ["QUALITY_CHECK", "Quality check", "PENDING"], ["SAMPLE_READY", "Sample ready", "PENDING"]].map(([code, label, state]) => ({ code, label, state, stageName: "QC_GATE_2", assignee: "Staff Person", blockerReason: "NO FABRIC" }));
    renderWithClient(<ProductionTracker production={{ phase: "IN_PROGRESS", steps } as never} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-code"))).toEqual(["PREPARING_MATERIALS", "PATTERN_AND_CUTTING", "DECORATION", "SEWING", "QUALITY_CHECK", "SAMPLE_READY"]);
    expect(items.map((i) => i.getAttribute("data-state"))).toEqual(["DONE", "DONE", "ACTIVE", "PENDING", "PENDING", "PENDING"]);
    expect(document.body.textContent).not.toMatch(/QC_GATE|Staff Person|NO FABRIC/);
  });
  it("overview shows the production card while in production, with the backend's next step", async () => {
    mockApi({
      "GET /customer/samples/s1": sample([], { status: "IN_SAMPLE_PRODUCTION", nextStep: "We are making your sample." }),
      "GET /customer/samples/s1/commercial": { sampleId: "s1", quotation: null, payment: summary({ status: "PAID" }), nextAction: "NONE", allowedActions: [] },
      "GET /customer/samples/s1/production": { phase: "IN_PROGRESS", steps: [{ code: "SEWING", label: "Sewing", state: "ACTIVE" }] },
    });
    renderWithClient(<SampleDetailPage id="s1" />);
    const card = await screen.findByTestId("production-card");
    expect(card).toHaveTextContent("Sewing");
    expect(card).toHaveTextContent("We are making your sample.");
  });
  it("files split into 'Provided by Benue Print' (customer-visible staff files) and 'Uploaded by you'", async () => {
    const f = (o: Record<string, unknown>) => ({ attachmentId: "a1", assetId: "x", type: "OTHER", originalName: "mine.png", mimeType: "image/png", sizeBytes: 1024, description: null, uploadedAt: "2026-10-02T10:00:00Z", source: "YOU", ...o });
    mockApi({ "GET /customer/samples/s1/files": [f({}), f({ attachmentId: "a2", originalName: "finished-sample.jpg", source: "BENUE_PRINT" })] });
    renderWithClient(<JourneyFiles sample={sample()} />);
    expect(await screen.findByTestId("files-staff")).toHaveTextContent("finished-sample.jpg");
    expect(screen.getByTestId("files")).toHaveTextContent("mine.png");
    expect(screen.getByTestId("files")).not.toHaveTextContent("finished-sample.jpg");
  });
  it("approval card appears only with approval actions; approve asks for confirmation ('reference for future bulk production') and posts; the result refreshes the sample", async () => {
    const calls = mockApi({ "GET /customer/samples/s1/files": [], "POST /customer/samples/s1/approve": () => json(200, sample([], { status: "APPROVED" })), "GET /customer/samples/s1": sample() });
    const a = renderWithClient(<ApprovalCard sample={sample([])} />);
    expect(screen.queryByTestId("approval-card")).not.toBeInTheDocument();
    a.unmount();
    renderWithClient(<ApprovalCard sample={sample(["APPROVE_SAMPLE", "REQUEST_CHANGES"])} />);
    expect(await screen.findByText("Your sample is ready for review")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Approve sample" }));
    const dlg = await screen.findByRole("dialog", { name: "Approve this sample?" });
    expect(dlg).toHaveTextContent("Approve this sample as the reference for future bulk production?");
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    await userEvent.type(within(dlg).getByLabelText(/Comment/), "Looks great");
    await userEvent.click(within(dlg).getByRole("button", { name: "Approve sample" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/customer/samples/s1/approve")?.body).toEqual({ note: "Looks great" }));
  });
  it("only APPROVE_SAMPLE → no 'Request changes'; request changes needs a reason (3+ chars), sends reason + categories, and shows backend refusals", async () => {
    let fail = true;
    const calls = mockApi({ "GET /customer/samples/s1/files": [], "POST /customer/samples/s1/request-changes": () => (fail ? json(409, { statusCode: 409, message: "The sample is no longer awaiting your approval" }) : json(200, sample([], { status: "REVISION_REQUESTED" }))) });
    const a = renderWithClient(<ApprovalCard sample={sample(["APPROVE_SAMPLE"])} />);
    await screen.findByTestId("approval-card");
    expect(screen.queryByRole("button", { name: "Request changes" })).not.toBeInTheDocument();
    a.unmount();
    renderWithClient(<ApprovalCard sample={sample(["APPROVE_SAMPLE", "REQUEST_CHANGES"])} />);
    await userEvent.click(await screen.findByRole("button", { name: "Request changes" }));
    const dlg = await screen.findByRole("dialog", { name: "What would you like changed?" });
    const send = within(dlg).getByRole("button", { name: "Send change request" });
    expect(send).toBeDisabled();
    await userEvent.type(within(dlg).getByLabelText(/What would you like changed\?/), "The colour is too light");
    await userEvent.click(within(dlg).getByRole("checkbox", { name: "Colour" }));
    await userEvent.click(within(dlg).getByRole("checkbox", { name: "Fit" }));
    await userEvent.click(send);
    expect(await within(dlg).findByText("The sample is no longer awaiting your approval")).toBeInTheDocument();
    fail = false;
    await userEvent.click(send);
    await waitFor(() => expect(calls.filter((c) => c.method === "POST").at(-1)?.body).toEqual({ reason: "The colour is too light", categories: ["COLOUR", "FIT"] }));
  });
  it("every journey request is a /customer/* call and none carries a customer id", async () => {
    const calls = mockApi({ "GET /customer/samples/s1/quotation": quotations(), "GET /customer/samples/s1/payments": { summary: summary(), payments: [payment()] }, "GET /customer/samples/s1/files": [] });
    renderWithClient(<><QuotationTab sample={sample([])} /><PaymentTab sample={sample([])} /><JourneyFiles sample={sample()} /></>);
    await screen.findAllByTestId("quotation-version");
    await screen.findByTestId("payments");
    expect(calls.length).toBeGreaterThan(2);
    for (const c of calls) { expect(c.path.startsWith("/customer/")).toBe(true); expect(c.path + c.query).not.toMatch(/customerId/i); }
  });
});
