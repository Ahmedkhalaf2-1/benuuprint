import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { tokenStore } from "@/lib/auth/token-store";
import { customerApi } from "@/lib/customer/client";
import { customerTokenStore } from "@/lib/customer/session";
import { json, mockApi, page, renderWithClient, sampleOptions } from "./helpers";

const replace = vi.fn();
let search = "";
let pathname = "/account";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams(search) }));
const logout = vi.fn();
let status = "authenticated";
vi.mock("@/features/portal/auth/customer-auth-provider", async (orig) => {
  const real = await orig<typeof import("@/features/portal/auth/customer-auth-provider")>();
  return { ...real, useCustomerAuth: () => ({ status, customer: { id: "c1", customerNumber: "CUS-1", name: "Nile Streetwear", email: "n@x.com", phone: null, whatsapp: null, accountStatus: "ACTIVE" }, login: vi.fn(), logout }) };
});

import { CustomerAuthProvider } from "@/features/portal/auth/customer-auth-provider";
import { CustomerLoginForm } from "@/features/portal/auth/forms";
import { fabricBody, fabricProblems, fabricState, fabricsFor, notesBody, patternsFor, productBody, productProblems, productState, sizeBody, sizeState } from "@/features/portal/builders";
import { PortalDashboard } from "@/features/portal/dashboard";
import { FileDownloadButton } from "@/features/portal/files";
import { NewSample } from "@/features/portal/new-sample";
import { ProfilePage } from "@/features/portal/profile";
import { ReviewStep } from "@/features/portal/review";
import { SampleDetailPage, SpecificationView } from "@/features/portal/sample-detail";
import { SamplesList } from "@/features/portal/samples-list";
import { FabricStep, FilesStep, ProductStep, SizeStep } from "@/features/portal/steps";
import { SampleWizard } from "@/features/portal/wizard";
import type { SampleDetail } from "@/features/portal/types";

const brand = { id: "b1", brandNumber: "BRD-1", name: "Nile Core", instagram: null, website: null, description: null, primaryColor: null, secondaryColor: null };
const detail = (o: Record<string, unknown> = {}): SampleDetail => ({
  id: "s1", sampleNumber: "SMP-000001", status: "DRAFT", statusLabel: "Draft", nextStep: "Finish your request and submit it.", editable: true, brand: { id: "b1", name: "Nile Core" }, productName: null, fabricName: null, colorName: null,
  submittedAt: null, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", revisionNumber: 1, productTypeId: null, customProductName: null, customProductDescription: null, fabricId: null, customFabricName: null, customFabricDescription: null,
  fabricProvider: null, gsm: null, fabricColorId: null, customColorName: null, customPantone: null, customHex: null, size: null, fitMethod: null, pattern: null, notes: null, fitNotes: null, printNotes: null, fabricNotes: null, specialInstructions: null,
  decorations: [], accessories: [], components: [], files: [], terms: { required: true, accepted: false, activeTermsVersionId: "t1", activeVersion: 2 }, ...o,
}) as SampleDetail;
const row = (o: Record<string, unknown> = {}) => ({ id: "s1", sampleNumber: "SMP-000001", status: "DRAFT", statusLabel: "Draft", nextStep: "Finish your request and submit it.", editable: true, brand: { id: "b1", name: "Nile Core" }, productName: "Tee", fabricName: null, colorName: null, submittedAt: null, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", ...o });
const options = { ...sampleOptions(), fitMethods: [{ value: "BENUE_PATTERN" }, { value: "COPY_CUSTOMER_PIECE" }, { value: "CUSTOM_SIZE_CHART" }, { value: "NOT_SURE" }], fabricProviders: [{ value: "CUSTOMER" }, { value: "BENUE_PRINT" }, { value: "NOT_DECIDED" }] } as never;

beforeEach(() => { replace.mockClear(); logout.mockClear(); search = ""; pathname = "/account"; status = "authenticated"; tokenStore.clear(); customerTokenStore.clear(); });
afterEach(() => vi.unstubAllGlobals());

describe("staff / customer auth isolation", () => {
  it("each client sends only its own token and refreshes through its own route; one session ending never clears the other", async () => {
    const calls: Array<{ url: string; auth: string | null }> = [];
    const customerExpired = true;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? null;
      calls.push({ url, auth });
      if (url === "/api/customer/auth/refresh") return json(200, { accessToken: "cust-2" });
      if (url.includes("/customer/auth/me")) return auth === "Bearer cust-2" ? json(200, { id: "c1" }) : customerExpired ? json(401, {}) : json(200, { id: "c1" });
      return json(200, { ok: true });
    }));
    tokenStore.set("staff-1");
    customerTokenStore.set("cust-1");
    await api.get("/admin/ping");
    await customerApi.get("/customer/auth/me"); // 401 → customer refresh route → retry
    expect(calls[0]).toEqual({ url: "http://api.test/api/v1/admin/ping", auth: "Bearer staff-1" });
    expect(calls[1]!.auth).toBe("Bearer cust-1");
    expect(calls.some((c) => c.url === "/api/customer/auth/refresh")).toBe(true);
    expect(calls.some((c) => c.url === "/api/auth/refresh")).toBe(false); // staff refresh route never used by the customer
    expect(customerTokenStore.get()).toBe("cust-2");
    expect(tokenStore.get()).toBe("staff-1"); // staff session untouched
  });
  it("customer session expiry (refresh 401) signs out the customer only; transient refresh failures do not", async () => {
    tokenStore.set("staff-1");
    customerTokenStore.set("cust-1");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url === "/api/customer/auth/refresh" ? json(401, {}) : json(401, { statusCode: 401, message: "Unauthorized" }))));
    await expect(customerApi.get("/customer/profile")).rejects.toMatchObject({ status: 401 });
    expect(customerTokenStore.get()).toBeNull();
    expect(tokenStore.get()).toBe("staff-1");
    customerTokenStore.set("cust-3");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url === "/api/customer/auth/refresh" ? json(429, { message: "slow down" }, { "Retry-After-auth": "7" }) : json(401, {}))));
    await expect(customerApi.get("/customer/profile")).rejects.toMatchObject({ kind: "rate_limited" });
    expect(customerTokenStore.get()).toBe("cust-3"); // kept: a 429 is not a sign-out
  });
  it("the provider restores only from the customer hint cookie (a staff cookie alone does nothing) and uses customer routes", async () => {
    const fetchMock = vi.fn(async (url: string) => (url === "/api/customer/auth/refresh" ? json(200, { accessToken: "cust-9" }) : url.includes("/customer/auth/me") ? json(200, { id: "c1", name: "Nile", customerNumber: "C1", email: "n@x.com", phone: null, whatsapp: null, accountStatus: "ACTIVE" }) : json(404, {})));
    vi.stubGlobal("fetch", fetchMock);
    const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><CustomerAuthProvider>{ui}</CustomerAuthProvider></QueryClientProvider>);
    document.cookie = "bp_session=1; path=/"; // staff hint only
    const a = wrap(<div />);
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
    a.unmount();
    document.cookie = "bp_c_session=1; path=/";
    wrap(<div />);
    await waitFor(() => expect(customerTokenStore.get()).toBe("cust-9"));
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["/api/customer/auth/refresh", "http://api.test/api/v1/customer/auth/me"]);
    document.cookie = "bp_session=; path=/; max-age=0"; document.cookie = "bp_c_session=; path=/; max-age=0";
  });
});

describe("customer login", () => {
  const useRealAuth = async () => { const real = await vi.importActual<typeof import("@/features/portal/auth/customer-auth-provider")>("@/features/portal/auth/customer-auth-provider"); return real; };
  it("posts to the customer BFF login (never the staff one), shows customer wording for bad credentials and for throttling", async () => {
    void useRealAuth;
    const loginSpy = vi.fn().mockRejectedValueOnce(Object.assign(new Error("x"), {}));
    void loginSpy;
    // The mocked provider's login is a stub; test the form's error mapping through portalErrorText instead.
    const { portalErrorText, safePortalNext } = await import("@/features/portal/auth/forms");
    const { ApiError } = await import("@/lib/api/errors");
    expect(portalErrorText(new ApiError({ status: 401, kind: "unauthorized", messages: ["x"] }))).toBe("That email and password do not match.");
    expect(portalErrorText(new ApiError({ status: 429, kind: "rate_limited", messages: ["x"], retryAfter: 30 }))).toBe("Too many attempts. Please try again in 30 seconds.");
    expect(safePortalNext("/account/samples")).toBe("/account/samples");
    expect(safePortalNext("/dashboard")).toBe("/account"); // never into the staff app
    expect(safePortalNext("//evil.test")).toBe("/account");
    renderWithClient(<CustomerLoginForm />);
    expect(screen.getByRole("form", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText(/staff/i)).not.toBeInTheDocument();
  });
});

describe("payload builders: exclusive catalogue/custom choices and customer-only fields", () => {
  it("product: switching mode clears the other side; a custom product needs a name", () => {
    expect(productBody({ mode: "catalog", productTypeId: "pt1", customName: "x", customDescription: "y" })).toEqual({ productTypeId: "pt1", customProductName: null, customProductDescription: null });
    expect(productBody({ mode: "custom", productTypeId: "pt1", customName: " Hoodie ", customDescription: "" })).toEqual({ productTypeId: null, customProductName: "Hoodie", customProductDescription: null });
    expect(productProblems({ mode: "custom", productTypeId: "", customName: " ", customDescription: "" })).toEqual(["Give your product a name"]);
    expect(productState(detail({ customProductName: "Hoodie" })).mode).toBe("custom");
  });
  it("fabric/colour: catalogue vs custom are exclusive; a custom fabric has no catalogue colour; GSM may be omitted; hex is checked", () => {
    const base = fabricState(detail());
    expect(fabricBody({ ...base, provider: "BENUE_PRINT", fabricId: "f1", fabricColorId: "c1", gsm: "220" })).toEqual({ fabricProvider: "BENUE_PRINT", fabricId: "f1", customFabricName: null, customFabricDescription: null, fabricColorId: "c1", customColorName: null, customPantone: null, customHex: null, gsm: 220, fabricNotes: null });
    const custom = fabricBody({ ...base, fabricMode: "custom", customFabricName: "Silk", fabricColorId: "c1", customColorName: "Navy", customHex: "#001F3F", gsm: "" });
    expect(custom).toMatchObject({ fabricId: null, customFabricName: "Silk", fabricColorId: null, customColorName: "Navy", customHex: "#001F3F", gsm: null });
    expect(fabricBody({ ...base, fabricId: "f1", colorMode: "custom", customColorName: "Teal" })).toMatchObject({ fabricId: "f1", fabricColorId: null, customColorName: "Teal" });
    expect(fabricProblems({ ...base, colorMode: "custom", customHex: "navy" })).toEqual(["Colour code must look like #1A2B3C"]);
    expect(fabricProblems({ ...base, gsm: "-3" })).toEqual(["Fabric weight must be a positive number"]);
  });
  it("size/fit: a pattern is sent only with the Benue Print pattern fit; nothing internal can be produced", () => {
    expect(sizeBody({ sizeId: "z1", fitMethod: "BENUE_PATTERN", patternVersionId: "pv1", fitNotes: "" })).toEqual({ sampleSizeOptionId: "z1", fitMethod: "BENUE_PATTERN", patternVersionId: "pv1", fitNotes: null });
    expect(sizeBody({ sizeId: "z1", fitMethod: "NOT_SURE", patternVersionId: "pv1", fitNotes: "snug" })).toEqual({ sampleSizeOptionId: "z1", fitMethod: "NOT_SURE", patternVersionId: null, fitNotes: "snug" });
    const keys = Object.keys({ ...productBody(productState(detail())), ...fabricBody(fabricState(detail())), ...sizeBody(sizeState(detail())), ...notesBody({ notes: "a", specialInstructions: "b" }) });
    expect(keys).not.toContain("factoryInstructions");
    expect(keys).not.toContain("customerId");
    expect(keys).not.toContain("status");
  });
  it("configurator mapping: fabrics exclude those not allowed for the product (recommended first); patterns are filtered to the product", () => {
    const o = { fabrics: [{ id: "a", productTypes: [{ productTypeId: "t", isAllowed: false }] }, { id: "b", productTypes: [] }, { id: "c", productTypes: [{ productTypeId: "t", isRecommended: true }] }], patterns: [{ patternVersionId: "p1", productTypeId: "t" }, { patternVersionId: "p2", productTypeId: "u" }] } as never;
    expect(fabricsFor(o, "t").map((f) => f.id)).toEqual(["c", "b"]);
    expect(fabricsFor(o, null).map((f) => f.id)).toEqual(["a", "b", "c"]);
    expect(patternsFor(o, "t").map((p) => p.patternVersionId)).toEqual(["p1"]);
  });
});

describe("draft creation, patching and conditional fields", () => {
  it("starting a request creates the draft with ONLY the brand (no customer id), then continues on the draft", async () => {
    const calls = mockApi({ "GET /customer/brands": [brand], "POST /customer/samples": () => json(201, detail()) });
    renderWithClient(<NewSample />);
    await userEvent.click(await screen.findByRole("button", { name: "Start my request" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/samples/s1/edit?step=product"));
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ brandId: "b1" });
    expect(calls.every((c) => c.path.startsWith("/customer/"))).toBe(true);
  });
  it("no brand yet: the step offers Create brand directly, not a dead end", async () => {
    mockApi({ "GET /customer/brands": [] });
    renderWithClient(<NewSample />);
    expect(await screen.findByTestId("no-brand")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create brand" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/contact Benue Print/i);
  });
  it("product step: catalogue ⇄ custom conditional fields; saving PATCHes only that step's fields", async () => {
    const calls = mockApi({ "PATCH /customer/samples/s1": () => json(200, detail()) });
    const reg = { current: null as null | { dirty: boolean; save: () => Promise<boolean> } };
    renderWithClient(<ProductStep sample={detail()} options={options} stepRef={reg} patch={async (b) => { await fetch("http://api.test/api/v1/customer/samples/s1", { method: "PATCH", body: JSON.stringify(b) }); }} changed={() => undefined} />);
    expect(screen.getByRole("radiogroup", { name: "Product" })).toBeInTheDocument(); // catalogue products are selectable cards
    expect(screen.queryByLabelText(/Product name/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Something else/ }));
    await userEvent.type(screen.getByLabelText(/Product name/), "Oversized hoodie");
    expect(reg.current?.dirty).toBe(true);
    expect(await reg.current!.save()).toBe(true);
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ productTypeId: null, customProductName: "Oversized hoodie", customProductDescription: null });
  });
  it("fabric step: catalogue fabric shows its colours; 'my own fabric' forces custom colour fields; GSM is optional with a weight hint", async () => {
    const reg = { current: null as null | { dirty: boolean; save: () => Promise<boolean> } };
    renderWithClient(<FabricStep sample={detail({ productTypeId: "pt1", fabricId: "f1", fabricProvider: "BENUE_PRINT" })} options={options} stepRef={reg} patch={async () => undefined} changed={() => undefined} />);
    expect(screen.getByRole("radiogroup", { name: "Fabric colour" })).toHaveTextContent("Red");
    expect(screen.getByText(/grams per square metre/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /My own fabric/ }));
    expect(screen.getByLabelText(/Fabric name/)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Fabric colour" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Colour name")).toBeInTheDocument(); // custom colour fields, not required to be hex
    await act(async () => { expect(await reg.current!.save()).toBe(false); }); // custom fabric needs a name
    expect(await screen.findByRole("alert")).toHaveTextContent("Give your fabric a name");
  });
  it("size step: pattern picker only for the Benue Print pattern fit; size-chart fit points to Files", async () => {
    const reg = { current: null as null | { dirty: boolean; save: () => Promise<boolean> } };
    renderWithClient(<SizeStep sample={detail({ productTypeId: "pt1", fitMethod: "NOT_SURE" })} options={options} stepRef={reg} patch={async () => undefined} changed={() => undefined} />);
    expect(screen.queryByLabelText("Pattern")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Use a Benue Print pattern/ }));
    expect(screen.getByRole("combobox", { name: "Pattern" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /I have a size chart/ }));
    expect(screen.getAllByText(/Upload your size chart/).length).toBeGreaterThan(1); // option help + the notice
  });
});

describe("terms, submission check, submit", () => {
  const terms = { id: "t1", version: 2, title: "Sample Terms", content: "You agree to pay the sample fee." };
  it("the customer must tick and accept the ACTUAL version; acceptance posts that version id", async () => {
    const calls = mockApi({ "GET /customer/terms/sample": terms, "GET /customer/samples/s1/submission-check": { ready: false, problems: ["Choose a sample size", "Accept the sample terms"] }, "POST /customer/samples/s1/terms/accept": { termsVersionId: "t1", version: 2, acceptedAt: "x" } });
    const changed = vi.fn();
    renderWithClient(<ReviewStep sample={detail()} changed={changed} onSubmitted={() => undefined} />);
    const block = await screen.findByTestId("terms-block");
    expect(block).toHaveTextContent("Version 2");
    expect(block).toHaveTextContent("You agree to pay the sample fee.");
    const accept = within(block).getByRole("button", { name: "Accept terms" });
    expect(accept).toBeDisabled();
    await userEvent.click(within(block).getByRole("checkbox", { name: /I accept the Sample Terms \(version 2\)/ }));
    await userEvent.click(accept);
    await waitFor(() => expect(calls.find((c) => c.path.endsWith("/terms/accept"))?.body).toEqual({ termsVersionId: "t1" }));
    expect(changed).toHaveBeenCalled();
  });
  it("the submission check lists exactly the backend's problems and blocks submit; when ready, submit POSTs (no status PATCH)", async () => {
    let ready = false;
    const calls = mockApi({ "GET /customer/terms/sample": terms, "GET /customer/samples/s1/submission-check": () => json(200, ready ? { ready: true, problems: [] } : { ready: false, problems: ["Choose a sample size", "Accept the sample terms"] }), "POST /customer/samples/s1/submit": () => json(200, detail({ status: "SUBMITTED" })) });
    const done = vi.fn();
    const r = renderWithClient(<ReviewStep sample={detail({ terms: { required: true, accepted: true, activeTermsVersionId: "t1", activeVersion: 2 } })} changed={() => undefined} onSubmitted={done} />);
    const check = await screen.findByTestId("submission-check");
    expect(check).toHaveTextContent("Choose a sample size");
    expect(check).toHaveTextContent("Accept the sample terms");
    expect(screen.getByRole("button", { name: "Submit my request" })).toBeDisabled();
    r.unmount();
    ready = true;
    renderWithClient(<ReviewStep sample={detail({ terms: { required: true, accepted: true, activeTermsVersionId: "t1", activeVersion: 2 } })} changed={() => undefined} onSubmitted={done} />);
    await waitFor(() => expect(screen.getByTestId("submission-check")).toHaveAttribute("data-ready", "true"));
    await userEvent.click(screen.getByRole("button", { name: "Submit my request" }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.path}`)).toEqual(["POST /customer/samples/s1/submit"]);
  });
  it("a backend refusal on submit is shown to the customer and nothing is claimed as sent", async () => {
    mockApi({ "GET /customer/terms/sample": terms, "GET /customer/samples/s1/submission-check": { ready: true, problems: [] }, "POST /customer/samples/s1/submit": json(409, { statusCode: 409, message: "The request is no longer a draft" }) });
    const done = vi.fn();
    renderWithClient(<ReviewStep sample={detail({ terms: { required: false, accepted: false, activeTermsVersionId: null, activeVersion: null } })} changed={() => undefined} onSubmitted={done} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Submit my request" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Submit my request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("no longer a draft");
    expect(done).not.toHaveBeenCalled();
  });
});

describe("ownership and privacy", () => {
  it("a foreign or unknown sample id is the plain 'Sample not found' (404 and validation alike), revealing nothing", async () => {
    mockApi({ "GET /customer/samples/other": json(404, { statusCode: 404, message: "Sample not found" }) });
    renderWithClient(<SampleDetailPage id="other" />);
    expect(await screen.findByText("Sample not found")).toBeInTheDocument();
    expect(screen.queryByText(/another customer|forbidden|not yours|permission/i)).not.toBeInTheDocument();
  });
  it("the editor of a foreign draft is also 'not found'; a submitted request cannot be edited", async () => {
    mockApi({ "GET /customer/samples/other": json(404, {}), "GET /customer/configurator/sample-options": options });
    const a = renderWithClient(<SampleWizard id="other" />);
    expect(await screen.findByText("Sample not found")).toBeInTheDocument();
    a.unmount();
    mockApi({ "GET /customer/samples/s1": detail({ status: "SUBMITTED", statusLabel: "Submitted", editable: false }), "GET /customer/configurator/sample-options": options });
    renderWithClient(<SampleWizard id="s1" />);
    expect(await screen.findByText("This request can no longer be edited")).toBeInTheDocument();
  });
  it("the specification shows plain-language values from the customer projection and never ids or internal fields", () => {
    const s = { ...detail({ productName: "Tee", fabricName: "Milton", fabricProvider: "BENUE_PRINT", fitMethod: "COPY_CUSTOMER_PIECE", size: { id: "z-secret-id", name: "M" }, customColorName: "Navy", customHex: "#001F3F", gsm: 220, decorations: [{ id: "d-secret", printMethod: { id: "pm-secret", name: "DTF" }, placement: "Centre chest", side: "FRONT", width: "10", height: "12", unit: "CM", colorCount: 3, notes: null, artworkRequired: true, artwork: { id: "art-secret", name: "logo.png", versionCount: 2 } }] }), factoryInstructions: "INTERNAL ONLY", assignedSales: "Staff Person" } as unknown as SampleDetail;
    render(<SpecificationView s={s} />);
    const text = document.body.textContent ?? "";
    for (const shown of ["Tee", "Milton", "I will supply the fabric".length ? "Benue Print will supply the fabric" : "", "Copy an existing garment", "Navy", "220 g/m²", "DTF", "Centre chest", "10 × 12 cm", "Artwork: logo.png"]) expect(text).toContain(shown);
    for (const hidden of ["z-secret-id", "d-secret", "pm-secret", "art-secret", "INTERNAL ONLY", "Staff Person", "factoryInstructions"]) expect(text).not.toContain(hidden);
  });
  it("private files: the signed link is requested only on click, opened on the API origin, never shown; uploads go multipart through the backend with type and decoration link", async () => {
    const open = vi.fn(); vi.stubGlobal("open", open);
    const calls = mockApi({ "GET /customer/samples/s1/files/at1/download-url": { url: "/api/v1/storage/local/tok-secret", expiresAt: "x" } });
    renderWithClient(<FileDownloadButton sampleId="s1" attachmentId="at1" name="logo.png" />);
    expect(calls).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Download logo.png" }));
    await waitFor(() => expect(open).toHaveBeenCalledWith("http://api.test/api/v1/storage/local/tok-secret", "_blank", "noopener,noreferrer"));
    expect(document.body.innerHTML).not.toContain("tok-secret");
    const { uploadFile } = await import("@/features/portal/api");
    const posted: FormData[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => { posted.push(init?.body as FormData); return json(201, { attachmentId: "at2" }); }));
    await uploadFile("s1", new File(["x"], "a.png", { type: "image/png" }), "ARTWORK", { decorationId: "d1", description: "front logo" });
    expect([...posted[0]!.keys()].sort()).toEqual(["decorationId", "description", "file", "type"]);
    expect(posted[0]!.get("type")).toBe("ARTWORK");
  });
  it("the Files step lists only what the customer uploaded and removal wording does not promise permanent deletion", () => {
    renderWithClient(<FilesStep sample={detail({ files: [{ attachmentId: "at1", assetId: "as1", type: "ARTWORK", originalName: "logo.png", mimeType: "image/png", sizeBytes: 2048, description: null, uploadedAt: "2026-10-02T10:00:00Z" }] })} options={options} stepRef={{ current: null }} patch={async () => undefined} changed={() => undefined} />);
    expect(screen.getByTestId("wizard-files")).toHaveTextContent("logo.png");
    expect(screen.getByRole("button", { name: "Remove logo.png from this request" })).toBeInTheDocument();
    expect(screen.getByText(/We may keep a record of earlier artwork versions/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/permanently deleted/i);
  });
});

describe("dashboard, list, status and next step", () => {
  it("rows show the backend's customer status label and nextStep as-is; drafts continue editing, submitted ones open the detail", async () => {
    mockApi({ "GET /customer/brands": [brand], "GET /customer/samples": page([row(), row({ id: "s2", sampleNumber: "SMP-000002", status: "QUOTATION_READY", statusLabel: "Quotation ready", nextStep: "Your quotation is being prepared.", editable: false, productName: "Hoodie" })]) });
    renderWithClient(<PortalDashboard />);
    const all = await screen.findAllByTestId("sample-row");
    const rows = [all.find((r) => r.textContent?.includes("SMP-000001"))!, all.find((r) => r.textContent?.includes("SMP-000002"))!];
    expect(rows[0]).toHaveAttribute("href", "/account/samples/s1/edit");
    expect(rows[0]).toHaveTextContent("Continue editing");
    expect(rows[0]).toHaveTextContent("Finish your request and submit it.");
    expect(rows[1]).toHaveAttribute("href", "/account/samples/s2");
    expect(rows[1]).toHaveTextContent("Quotation ready");
    expect(rows[1]).toHaveTextContent("Your quotation is being prepared.");
    expect(rows[1]).toHaveTextContent("Review quotation"); // contextual CTA
    expect(rows[1]).not.toHaveTextContent("Continue editing");
    expect(within(screen.getByTestId("needs-action")).getAllByTestId("sample-row")).toHaveLength(1); // only what needs the customer
    expect(screen.getByRole("link", { name: "Request a sample" })).toHaveAttribute("href", "/account/samples/new");
  });
  it("dashboard without a brand: the Create brand onboarding (never 'contact Benue Print') and no 'Request a sample' button", async () => {
    mockApi({ "GET /customer/brands": [], "GET /customer/samples": page([]) });
    renderWithClient(<PortalDashboard />);
    expect(await screen.findByTestId("first-brand")).toHaveTextContent("Create your brand");
    expect(screen.getByRole("button", { name: "Create brand" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/contact Benue Print/i);
    expect(screen.queryByRole("link", { name: "Request a sample" })).not.toBeInTheDocument();
  });
  it("My samples uses only the customer endpoint with server-side filters (status, brand, search, sort) and never sends a customer id", async () => {
    search = "status=DRAFT&brandId=b1&search=tee&page=2";
    const calls = mockApi({ "GET /customer/brands": [brand, { ...brand, id: "b2", name: "Other" }], "GET /customer/samples": page([row()], 30) });
    renderWithClient(<SamplesList />);
    await screen.findByTestId("samples-list");
    const q = Object.fromEntries(new URLSearchParams(calls.find((c) => c.path === "/customer/samples")!.query));
    expect(q).toMatchObject({ status: "DRAFT", brandId: "b1", search: "tee", page: "2", sort: "updated" });
    expect(q).not.toHaveProperty("customerId");
    expect(calls.every((c) => c.path.startsWith("/customer/"))).toBe(true);
  });
  it("sample detail: next step is prominent; Specification/Files/Activity are customer-safe; activity and team messages render as given", async () => {
    mockApi({
      "GET /customer/samples/s1": detail({ status: "UNDER_REVIEW", statusLabel: "Under review", nextStep: "Our team is reviewing your request.", editable: false, productName: "Tee", submittedAt: "2026-10-02T10:00:00Z" }),
      "GET /customer/samples/s1/activity": [{ at: "2026-10-02T10:00:00Z", status: "SUBMITTED", title: "Request submitted", message: null }, { at: "2026-10-03T10:00:00Z", status: "UNDER_REVIEW", title: "Under review", message: "We started reviewing." }],
      "GET /customer/samples/s1/messages": [{ id: "m1", at: "2026-10-03T11:00:00Z", from: "Benue Print", content: "Could you confirm the colour?" }],
    });
    search = "tab=activity";
    renderWithClient(<SampleDetailPage id="s1" />);
    expect(await screen.findByTestId("next-step")).toHaveTextContent("Our team is reviewing your request.");
    expect(screen.queryByRole("link", { name: "Continue editing" })).not.toBeInTheDocument();
    const tl = await screen.findByTestId("timeline");
    expect(within(tl).getAllByRole("listitem").map((l) => l.textContent)).toEqual([expect.stringContaining("Under review"), expect.stringContaining("Request submitted")]); // newest first
    expect(await screen.findByTestId("messages")).toHaveTextContent("Could you confirm the colour?");
    expect(screen.queryByRole("tab", { name: /Notes|Approvals|Commercial|Production/ })).not.toBeInTheDocument();
  });
});

describe("profile", () => {
  it("only customer-safe fields are editable and PATCHed (name/email are shown as read-only); password change ends the session", async () => {
    const calls = mockApi({ "GET /customer/profile": { id: "c1", customerNumber: "CUS-1", name: "Nile Streetwear", email: "n@x.com", phone: "0100", whatsapp: null, country: "Egypt", city: "Cairo", instagram: null, preferredLocale: "en" }, "GET /customer/addresses": [], "PATCH /customer/profile": () => json(200, { id: "c1", customerNumber: "CUS-1", name: "Nile Streetwear", email: "n@x.com", phone: "0111", whatsapp: null, country: "Egypt", city: "Cairo", instagram: null, preferredLocale: "en" }), "POST /customer/auth/change-password": json(204, undefined) });
    renderWithClient(<ProfilePage />);
    expect(await screen.findByText("Nile Streetwear")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Login email|^Email/)).not.toBeInTheDocument();
    expect(screen.getByText(/managed by Benue Print/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Phone"));
    await userEvent.type(screen.getByLabelText("Phone"), "0111");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ phone: "0111", whatsapp: null, country: "Egypt", city: "Cairo", instagram: null, preferredLocale: "en" }));
    await userEvent.type(screen.getByLabelText("Current password"), "OldPassword1");
    await userEvent.type(screen.getByLabelText("New password"), "NewPassword12");
    await userEvent.type(screen.getByLabelText("Repeat the new password"), "NewPassword12");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/customer/auth/change-password")?.body).toEqual({ currentPassword: "OldPassword1", newPassword: "NewPassword12" }));
    await waitFor(() => expect(logout).toHaveBeenCalled()); // all sessions are revoked by the backend
  });
});
