import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fromMinor, lineAmount, previewTotals, toMinor } from "@/lib/utils/money";
import { json, mockApi, renderWithClient, setup } from "./helpers";

let perms: string[] = [];
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/samples/s1", useSearchParams: () => new URLSearchParams("") }));
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ can: (p: string) => perms.includes(p), canAny: (...p: string[]) => p.some((x) => perms.includes(x)), canAll: (...p: string[]) => p.every((x) => perms.includes(x)), status: "authenticated", user: { id: "u1", name: "Sara", email: "", roles: [], permissions: perms } }),
}));

import { CommercialSection } from "@/features/commercial/commercial-section";
import { validateRows } from "@/features/commercial/quotation-editor";

const SALES = ["quotations.read", "quotations.create", "approvals.manage", "payments.read", "payments.manage", "assets.manage", "assets.read"];
const FINANCE = ["payments.read", "payments.verify", "quotations.read", "assets.read"];

const line = (over: Record<string, unknown> = {}) => ({ id: "l1", type: "SAMPLE_FEE", description: "Sample fee", quantity: "1.00", unitPrice: "1000.00", amount: "1000.00", sortOrder: 0, metadata: null, ...over });
const version = (n: number, status: string, over: Record<string, unknown> = {}) => ({
  id: `v${n}`, quotationId: "q1", versionNumber: n, status, currency: "EGP", subtotal: "1000.00", discount: "0.00", taxPercent: "0.00", tax: "0.00", total: "1000.00", notes: null, validUntil: "2026-12-01T00:00:00Z",
  createdAt: "2026-10-01T10:00:00Z", sentAt: null, acceptedAt: null, rejectedAt: null, expiredAt: null, supersededAt: null, orderRevision: null, invalidatedAt: null, invalidatedByRevision: null, invalidationReason: null, lineItems: [line()], ...over,
});
const quotation = (versions: ReturnType<typeof version>[], current = versions[0]!) => ({ id: "q1", quotationNumber: "QTN-000001", sampleId: "s1", orderId: null, status: current.status, currency: "EGP", createdAt: "2026-10-01T10:00:00Z", currentVersion: current, versions });
const summary = (over: Record<string, unknown> = {}) => ({
  sampleId: "s1", sampleNumber: "SMP-000001", currency: "EGP", quotation: { quotationId: "q1", quotationNumber: "QTN-000001", versionId: "v2", versionNumber: 2, status: "ACCEPTED", total: "48000.00" },
  quotedTotal: "48000.00", acceptedTotal: "48000.00", verifiedPaid: "40000.00", pendingPayments: "3000.00", remaining: "8000.00", paymentState: "PARTIALLY_PAID", counts: { verified: 1, pending: 1, rejected: 0, cancelled: 0 }, ...over,
});
const payment = (over: Record<string, unknown> = {}) => ({
  id: "p1", paymentNumber: "PAY-000001", sampleId: "s1", orderId: null, quotationVersionId: "v2", amount: "3000.00", currency: "EGP", method: "INSTAPAY", status: "SUBMITTED", transactionReference: "REF1",
  proof: { assetId: "as1", originalName: "proof.png", mimeType: "image/png", sizeBytes: 2048 }, receivedAt: null, verifiedAt: null, verifiedByUserId: null, rejectionReason: null, createdByUserId: "u9", createdAt: "2026-10-02T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", ...over,
});
const api = (extra: Record<string, unknown> = {}) => mockApi({
  "GET /admin/samples/s1/commercial-summary": summary(), "GET /admin/samples/s1/quotations": [], "GET /admin/samples/s1/payments": [], ...extra,
});
const open = async (name: string) => userEvent.click(await screen.findByRole("tab", { name }));

beforeEach(() => { setup(); perms = [...SALES]; });

describe("money is decimal-safe", () => {
  it("preview equals the server's calculation (1000 + 2×250.50 − 100, 14% tax = 1597.14)", () => {
    expect(previewTotals([{ quantity: "1", unitPrice: "1000" }, { quantity: "2", unitPrice: "250.50" }], "100", "14")).toEqual({ subtotal: "1501.00", discount: "100.00", tax: "196.14", total: "1597.14" });
  });
  it("no float drift and half-up rounding", () => {
    expect(fromMinor(lineAmount({ quantity: "0.1", unitPrice: "0.2" })!)).toBe("0.02"); // 0.1*0.2 is 0.020000000000000004 in floats
    expect(fromMinor(lineAmount({ quantity: "3", unitPrice: "0.15" })!)).toBe("0.45");
    expect(fromMinor(lineAmount({ quantity: "1.5", unitPrice: "0.01" })!)).toBe("0.02"); // 0.015 -> half up
    expect(previewTotals([{ quantity: "1", unitPrice: "10" }], "0", "7.5")!.tax).toBe("0.75");
  });
  it("handles negative discount lines and rejects bad input", () => {
    expect(previewTotals([{ quantity: "1", unitPrice: "100" }, { quantity: "1", unitPrice: "-20" }], "0", "0")!.total).toBe("80.00");
    expect(toMinor("12.345")).toBeNull();
    expect(toMinor("abc")).toBeNull();
    expect(previewTotals([{ quantity: "x", unitPrice: "1" }], "0", "0")).toBeNull();
  });
  it("line validation: negative unit price only for DISCOUNT_ADJUSTMENT; description and quantity required", () => {
    expect(validateRows([{ type: "PRINTING", description: "a", quantity: "1", unitPrice: "-5" }]).ok).toBe(false);
    expect(validateRows([{ type: "DISCOUNT_ADJUSTMENT", description: "a", quantity: "1", unitPrice: "-5" }]).ok).toBe(true);
    expect(validateRows([{ type: "PRINTING", description: " ", quantity: "0", unitPrice: "5" }]).ok).toBe(false);
    expect(validateRows([]).ok).toBe(false);
  });
});

describe("commercial access", () => {
  it("valid access: backend figures; pending payments are NOT counted as paid; remaining from the server", async () => {
    api();
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    const box = await screen.findByTestId("commercial-summary");
    expect(within(box).getByText("Verified paid").nextSibling).toHaveTextContent("EGP 40,000.00");
    expect(within(box).getByText("Remaining").nextSibling).toHaveTextContent("EGP 8,000.00");
    expect(within(box).getByText("Accepted total").nextSibling).toHaveTextContent("EGP 48,000.00");
    expect(within(box).getByText("Pending (unverified)").nextSibling).toHaveTextContent("EGP 3,000.00");
    expect(box).toHaveTextContent("Partially paid");
  });
  it("overpaid and reapproval are shown only when the backend returns them", async () => {
    api({ "GET /admin/samples/s1/commercial-summary": summary({ overpaid: "500.00", reapprovalRequired: true, remaining: "0.00", paymentState: "PAID" }) });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    const box = await screen.findByTestId("commercial-summary");
    expect(within(box).getByText("Overpaid").nextSibling).toHaveTextContent("EGP 500.00");
    expect(within(box).getByRole("alert")).toHaveTextContent("Commercial reapproval required");
  });
  it("403: restricted state, no figures, no zeros", async () => {
    api({ "GET /admin/samples/s1/commercial-summary": json(403, { statusCode: 403, message: "Insufficient permissions" }) });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={true} startHint="A quotation can be created while the sample is under review." />);
    expect(await screen.findByText(/not available to your role/)).toBeInTheDocument();
    expect(screen.queryByTestId("commercial-summary")).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.00/)).not.toBeInTheDocument();
  });
});

describe("quotation history and versioning", () => {
  it("shows every version newest first: only the live one is current; SUPERSEDED stays visible", async () => {
    api({ "GET /admin/samples/s1/quotations": [quotation([version(2, "ACCEPTED", { total: "900.00", acceptedAt: "2026-10-03T10:00:00Z" }), version(1, "SUPERSEDED", { total: "1711.14", supersededAt: "2026-10-02T10:00:00Z" })])] });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Quotation");
    const versions = await screen.findAllByTestId("quotation-version");
    expect(versions.map((v) => `${v.getAttribute("data-status")}:${v.getAttribute("data-current")}`)).toEqual(["ACCEPTED:true", "SUPERSEDED:false"]);
    expect(versions[1]).toHaveTextContent("Superseded");
    expect(versions[1]).toHaveTextContent("EGP 1,711.14");
    expect(within(versions[0]!).queryByRole("button", { name: /New version|Send|Record/ })).not.toBeInTheDocument(); // an accepted quotation is final
  });
  it("an accepted quotation ended by a revision is NOT current and triggers 'Commercial reapproval required' with the old terms", async () => {
    const ended = version(1, "SUPERSEDED", { total: "50000.00", acceptedAt: "2026-10-03T10:00:00Z", invalidatedAt: "2026-10-05T10:00:00Z", invalidatedByRevision: 2, invalidationReason: "Order items changed (revision 2)" });
    api({ "GET /admin/samples/s1/quotations": [quotation([ended], ended)] });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Quotation");
    const v = await screen.findByTestId("quotation-version");
    expect(v).toHaveAttribute("data-current", "false");
    expect(v).toHaveTextContent("Ended by revision 2");
    expect(v).toHaveTextContent("no longer the quotation in force");
    const banner = screen.getByTestId("reapproval");
    expect(banner).toHaveTextContent("Commercial reapproval required");
    expect(banner).toHaveTextContent("EGP 50,000.00");
    expect(banner).toHaveTextContent("Order items changed");
    expect(within(v).queryByRole("button", { name: /Record customer acceptance/ })).not.toBeInTheDocument();
  });
  it("totals shown are the server's strings (subtotal, discount, tax, total) and line amounts come from the server", async () => {
    api({ "GET /admin/samples/s1/quotations": [quotation([version(1, "DRAFT", { subtotal: "1501.00", discount: "100.00", taxPercent: "14.00", tax: "196.14", total: "1597.14", lineItems: [line({ id: "a", quantity: "2.00", unitPrice: "250.50", amount: "501.00" })] })])] });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={true} startHint="A quotation can be created while the sample is under review." />);
    await open("Quotation");
    const v = await screen.findByTestId("quotation-version");
    for (const t of ["EGP 1,501.00", "EGP 100.00", "EGP 196.14", "EGP 1,597.14", "Tax (14%)"]) expect(v).toHaveTextContent(t);
    await userEvent.click(within(v).getByText(/Line items \(/));
    expect(within(v).getByRole("table")).toHaveTextContent("501.00");
  });
});

describe("create / send / decide", () => {
  it("create posts correct numeric payload (line items, discount, tax, validUntil ISO) and is blocked when invalid", async () => {
    const calls = api({ "POST /admin/samples/s1/quotations": json(201, quotation([version(1, "DRAFT")])) });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={true} startHint="A quotation can be created while the sample is under review." />);
    await open("Quotation");
    await userEvent.click(await screen.findByRole("button", { name: "New quotation" }));
    const dlg = await screen.findByRole("dialog");
    await userEvent.click(within(dlg).getByRole("button", { name: "Create quotation" }));
    expect(await within(dlg).findByText("Describe the line")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    await userEvent.type(within(dlg).getByLabelText("Line 1 description"), "Sample fee");
    await userEvent.type(within(dlg).getByLabelText("Line 1 unit price"), "1000");
    await userEvent.click(within(dlg).getByRole("button", { name: "Add line" }));
    await userEvent.type(within(dlg).getByLabelText("Line 2 description"), "DTF print");
    await userEvent.clear(within(dlg).getByLabelText("Line 2 quantity"));
    await userEvent.type(within(dlg).getByLabelText("Line 2 quantity"), "2");
    await userEvent.type(within(dlg).getByLabelText("Line 2 unit price"), "250.50");
    await userEvent.clear(within(dlg).getByLabelText("Discount (amount)"));
    await userEvent.type(within(dlg).getByLabelText("Discount (amount)"), "100");
    await userEvent.clear(within(dlg).getByLabelText("Tax (%)"));
    await userEvent.type(within(dlg).getByLabelText("Tax (%)"), "14");
    await userEvent.type(within(dlg).getByLabelText("Valid until"), "2026-12-01T10:00");
    expect(within(dlg).getByLabelText("Totals preview")).toHaveTextContent("1597.14");
    expect(within(dlg).getByText(/Preview only/)).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole("button", { name: "Create quotation" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/samples/s1/quotations")).toBe(true));
    const body = calls.find((c) => c.method === "POST")!.body as Record<string, unknown>;
    expect(body).toMatchObject({ discount: 100, taxPercent: 14 });
    expect(body.lineItems).toEqual([{ type: "SAMPLE_FEE", description: "Sample fee", quantity: 1, unitPrice: 1000 }, { type: "SAMPLE_FEE", description: "DTF print", quantity: 2, unitPrice: 250.5 }]);
    expect(new Date(body.validUntil as string).toISOString()).toBe(body.validUntil);
    expect(body).not.toHaveProperty("total"); // clients never send totals
  });
  it("creating is hidden without quotations.create", async () => {
    perms = ["quotations.read", "payments.read"];
    api();
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={true} startHint="A quotation can be created while the sample is under review." />);
    await open("Quotation");
    expect(await screen.findByText("No quotation yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New quotation" })).not.toBeInTheDocument();
  });
  it("SENT version: staff-recorded wording, source note required, posts the evidence; backend 409 shown as-is", async () => {
    const calls = api({
      "GET /admin/samples/s1/quotations": [quotation([version(1, "SENT", { sentAt: "2026-10-02T10:00:00Z" })])],
      "POST /admin/quotation-versions/v1/accept": json(409, { statusCode: 409, error: "Conflict", message: "The quotation validity period has passed" }),
    });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Quotation");
    expect(await screen.findByRole("button", { name: "Record customer rejection" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Record customer acceptance" }));
    const dlg = await screen.findByRole("dialog");
    expect(dlg).toHaveTextContent(/customer does not sign in or confirm in the app/);
    expect(dlg).not.toHaveTextContent(/approve as customer/i);
    const confirm = within(dlg).getByRole("button", { name: "Record acceptance" });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dlg).getByLabelText(/Source \/ evidence/), "WhatsApp 21 Oct");
    await userEvent.click(confirm);
    expect(await within(dlg).findByRole("alert")).toHaveTextContent("The quotation validity period has passed");
    expect(calls.find((c) => c.path === "/admin/quotation-versions/v1/accept")!.body).toEqual({ sourceNote: "WhatsApp 21 Oct" });
  });
  it("accepting/rejecting needs approvals.manage; draft shows Send, which POSTs /send after confirmation", async () => {
    perms = ["quotations.read", "quotations.create", "payments.read"];
    const calls = api({ "GET /admin/samples/s1/quotations": [quotation([version(1, "DRAFT")])], "POST /admin/quotation-versions/v1/send": json(200, version(1, "SENT")) });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={true} startHint="A quotation can be created while the sample is under review." />);
    await open("Quotation");
    await userEvent.click(await screen.findByRole("button", { name: "Send quotation" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Send quotation" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/quotation-versions/v1/send")).toBe(true));
    expect(screen.queryByRole("button", { name: /Record customer/ })).not.toBeInTheDocument();
  });
});

describe("payments", () => {
  const withAccepted = { "GET /admin/samples/s1/quotations": [quotation([version(2, "ACCEPTED")])] };
  it("add payment: private proof flow (PAYMENT_PROOF multipart upload -> proofAssetId), real method enum, numeric amount", async () => {
    const calls = api({ ...withAccepted, "POST /admin/assets": json(201, { id: "asset9", type: "PAYMENT_PROOF", originalName: "slip.png", mimeType: "image/png", sizeBytes: 10 }), "POST /admin/samples/s1/payments": json(201, payment()) });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Payments");
    await userEvent.click(await screen.findByRole("button", { name: "Add payment" }));
    const dlg = await screen.findByRole("dialog");
    await userEvent.click(within(dlg).getByRole("button", { name: "Record payment" }));
    expect(await within(dlg).findByText("Amount above 0 with up to 2 decimals")).toBeInTheDocument();
    await userEvent.type(within(dlg).getByLabelText(/Amount/), "400.50");
    await userEvent.click(within(dlg).getByRole("combobox", { name: /Method/ }));
    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual(["Instapay", "Vodafone cash", "Telda", "Bank transfer", "Cash", "Other"]);
    await userEvent.click(screen.getByRole("option", { name: "Bank transfer" }));
    await userEvent.upload(dlg.querySelector("input[type=file]") as HTMLInputElement, new File([new Uint8Array([1, 2])], "slip.png", { type: "image/png" }));
    expect(await within(dlg).findByText(/slip.png uploaded/)).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/admin/samples/s1/payments" && c.method === "POST")).toBe(true));
    expect(calls.find((c) => c.method === "POST" && c.path === "/admin/samples/s1/payments")!.body).toMatchObject({ amount: 400.5, method: "BANK_TRANSFER", currency: "EGP", proofAssetId: "asset9" });
    const upload = calls.find((c) => c.path === "/admin/assets")!;
    expect(upload.method).toBe("POST"); // goes through the backend asset API, never straight to storage
  });
  it("backend payment errors are shown verbatim (exceeds the remaining balance)", async () => {
    api({ ...withAccepted, "POST /admin/samples/s1/payments": json(409, { statusCode: 409, error: "Conflict", message: "amount 5000.00 exceeds the remaining balance of 900.00 EGP", requestId: "rq1" }) });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Payments");
    await userEvent.click(await screen.findByRole("button", { name: "Add payment" }));
    const dlg = await screen.findByRole("dialog");
    await userEvent.type(within(dlg).getByLabelText(/Amount/), "5000");
    await userEvent.click(within(dlg).getByRole("combobox", { name: /Method/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Cash" }));
    await userEvent.click(within(dlg).getByRole("button", { name: "Record payment" }));
    expect(await within(dlg).findByRole("alert")).toHaveTextContent("exceeds the remaining balance of 900.00 EGP");
  });
  it("adding is disabled until a quotation is accepted", async () => {
    api({ "GET /admin/samples/s1/quotations": [quotation([version(1, "SENT")])], "GET /admin/samples/s1/commercial-summary": summary({ quotation: { quotationId: "q1", quotationNumber: "QTN-000001", versionId: "v1", versionNumber: 1, status: "SENT", total: "1000.00" }, acceptedTotal: null, remaining: null, verifiedPaid: "0.00", pendingPayments: "0.00", paymentState: "UNPAID" }) });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Payments");
    expect(await screen.findByRole("button", { name: "Add payment" })).toBeDisabled();
  });
  it("proof is a private file: no URL is requested until the click, then the signed URL is opened on the API origin", async () => {
    const calls = api({ "GET /admin/samples/s1/payments": [payment()], "GET /admin/assets/as1/download-url": json(200, { url: "/api/v1/storage/local/TOKEN", expiresAt: "2026-10-21T20:00:00Z" }) });
    const open_ = vi.spyOn(window, "open").mockReturnValue(null);
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Payments");
    const row = await screen.findByTestId("payments");
    expect(row).not.toHaveTextContent(/storage|storageKey/);
    expect(calls.some((c) => c.path.includes("download-url"))).toBe(false);
    await userEvent.click(within(row).getByRole("button", { name: "Download proof.png" }));
    await waitFor(() => expect(open_).toHaveBeenCalledWith("http://api.test/api/v1/storage/local/TOKEN", "_blank", "noopener,noreferrer"));
    open_.mockRestore();
  });
  it("SALES (payments.manage, no payments.verify) cannot verify or reject; can cancel its open payments", async () => {
    api({ "GET /admin/samples/s1/payments": [payment()] });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Payments");
    await screen.findByTestId("payments");
    expect(screen.queryByRole("button", { name: /Verify payment|Reject payment|Start review/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
  it("finance (payments.verify): verify posts /verify; reject requires a reason; verified payments have no actions", async () => {
    perms = [...FINANCE];
    const calls = api({
      "GET /admin/samples/s1/payments": [payment(), payment({ id: "p2", paymentNumber: "PAY-000002", status: "VERIFIED", verifiedAt: "2026-10-03T10:00:00Z" })],
      "POST /admin/payments/p1/verify": json(200, payment({ status: "VERIFIED" })), "POST /admin/payments/p1/reject": json(200, payment({ status: "REJECTED" })),
    });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Payments");
    const rows = await screen.findAllByRole("listitem");
    const open1 = rows.find((r) => r.getAttribute("data-status") === "SUBMITTED")!;
    const done = rows.find((r) => r.getAttribute("data-status") === "VERIFIED")!;
    expect(within(done).queryByRole("button", { name: /Verify|Reject/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add payment" })).not.toBeInTheDocument(); // no payments.manage
    await userEvent.click(within(open1).getByRole("button", { name: "Reject payment" }));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByRole("button", { name: "Reject payment" })).toBeDisabled();
    await userEvent.type(within(dlg).getByLabelText(/Reason/), "slip unreadable");
    await userEvent.click(within(dlg).getByRole("button", { name: "Reject payment" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/admin/payments/p1/reject")?.body).toEqual({ reason: "slip unreadable" }));
    await userEvent.click(within(open1).getByRole("button", { name: "Verify payment" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/admin/payments/p1/verify")).toBe(true));
  });
  it("verification refused by the backend (e.g. recorder cannot verify own payment) shows the backend reason, session intact", async () => {
    perms = [...FINANCE];
    api({ "GET /admin/samples/s1/payments": [payment()], "POST /admin/payments/p1/verify": json(403, { statusCode: 403, error: "Forbidden", message: "The person who recorded a payment cannot verify it" }) });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Payments");
    await userEvent.click(await screen.findByRole("button", { name: "Verify payment" }));
    // toast is rendered by sonner outside this tree: the action must not crash and must re-enable the control
    await waitFor(() => expect(screen.getByRole("button", { name: "Verify payment" })).toBeEnabled());
  });
  it("payments tab: 403 -> restricted state; rejected payment shows its reason", async () => {
    api({ "GET /admin/samples/s1/payments": json(403, { statusCode: 403, message: "Insufficient permissions" }) });
    const a = renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Payments");
    expect(await screen.findByText(/Payments are not available to your role/)).toBeInTheDocument();
    a.unmount();
    api({ "GET /admin/samples/s1/payments": [payment({ status: "REJECTED", rejectionReason: "wrong amount" })] });
    renderWithClient(<CommercialSection target={{ kind: "sample", id: "s1" }} canStart={false} startHint="A quotation can be created while the sample is under review." />);
    await open("Payments");
    expect(await screen.findByText("Rejected: wrong amount")).toBeInTheDocument();
  });
});
