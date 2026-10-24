import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { tokenStore } from "@/lib/auth/token-store";

export const json = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

export type Handler = (req: { method: string; path: string; query: URLSearchParams; body: unknown }) => Response | undefined | Promise<Response | undefined>;

/** Routes fetch() to handlers by "METHOD /path-after-/api/v1". Records calls. */
export function mockApi(handlers: Record<string, Handler | Response | object>) {
  const calls: Array<{ method: string; path: string; query: string; body: unknown }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url, "http://x");
    const path = u.pathname.replace("/api/v1", "");
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, query: u.search, body });
    const h = handlers[`${method} ${path}`];
    if (h instanceof Response) return h.clone();
    if (typeof h === "function") return (await h({ method, path, query: u.searchParams, body })) ?? json(404, { statusCode: 404, message: "no handler" });
    if (h) return json(200, h);
    return json(404, { statusCode: 404, error: "Not Found", message: `no handler for ${method} ${path}` });
  }));
  return calls;
}

export function setup() {
  tokenStore.set("t");
}

export function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

export const customer = (over: Record<string, unknown> = {}) => ({
  id: "c1", customerNumber: "CUS-000001", displayName: "Nile Streetwear", email: "n@x.com", phone: "01001234567", whatsapp: null,
  country: "Egypt", city: "Cairo", instagram: null, source: null, notes: null, status: "ACTIVE",
  createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", archivedAt: null, ...over,
});

export const brand = (over: Record<string, unknown> = {}) => ({
  id: "b1", brandNumber: "BRD-000001", customerId: "c1", name: "Nile Core", instagram: null, website: null, description: null,
  primaryColor: "#112233", secondaryColor: null, status: "ACTIVE", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", archivedAt: null, ...over,
});

/* ---- master data fixtures (shapes captured from the live backend) ---- */
export const ref = (over: Record<string, unknown> = {}) => ({
  id: "r1", code: "CODE", name: "Name", description: null, isActive: true, sortOrder: 0,
  createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", archivedAt: null, ...over,
});
export const page = (data: unknown[], total = data.length) => ({ data, meta: { page: 1, pageSize: 20, total } });
export const productType = (over: Record<string, unknown> = {}) => ref({ id: "pt1", code: "TEE", name: "Tee", category: "TOPS", defaultSampleFee: null, ...over });
export const fabric = (over: Record<string, unknown> = {}) => ref({
  id: "f1", referenceNumber: "FAB-000001", code: "MILTON", name: "Milton", composition: "100% cotton", minGsm: 180, maxGsm: 240, defaultGsm: 200, unit: "GSM", notes: null,
  colors: [{ id: "col1", name: "Red", hex: "#CC0000", isAvailable: true }, { id: "col2", name: "Mystery", hex: null, isAvailable: true }],
  productTypes: [{ productTypeId: "pt1", code: "TEE", name: "Tee", isRecommended: true, isAllowed: true, notes: null }, { productTypeId: "pt2", code: "POLO", name: "Polo", isRecommended: false, isAllowed: false, notes: "too light" }],
  ...over,
});
export const pattern = (over: Record<string, unknown> = {}) => ({
  id: "pat1", referenceNumber: "PAT-000001", code: "TEE_REG", name: "Regular Tee", productType: { id: "pt1", code: "TEE", name: "Tee" }, description: null, fitType: "Regular",
  status: "ACTIVE", notes: null, currentVersionId: "v1", currentVersionNumber: 1, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", archivedAt: null, ...over,
});
export const version = (over: Record<string, unknown> = {}) => ({
  id: "v1", patternId: "pat1", versionNumber: 1, status: "APPROVED", notes: null, approvedAt: "2026-10-02T10:00:00Z", approvedByUserId: "u1", createdByUserId: "u1", createdAt: "2026-10-01T10:00:00Z", ...over,
});
export const asset = (over: Record<string, unknown> = {}) => ({
  id: "as1", type: "PATTERN", originalName: "tee-pattern.pdf", description: null, mimeType: "application/pdf", sizeBytes: 2048, checksum: null, uploadedByStaffUserId: "u1", createdAt: "2026-10-01T10:00:00Z", archivedAt: null, ...over,
});
export const sampleOptions = () => ({
  productTypes: [{ id: "pt1", code: "TEE", name: "Tee", description: null }, { id: "pt2", code: "POLO", name: "Polo", description: null }],
  fabrics: [
    { id: "f1", code: "MILTON", name: "Milton", description: null, composition: "cotton", minGsm: null, maxGsm: null, defaultGsm: null, colors: [{ id: "col1", name: "Red", hex: "#CC0000", pantone: null }, { id: "col2", name: "Mystery", hex: null, pantone: "11-0602" }], productTypes: [{ productTypeId: "pt1", isRecommended: true }, { productTypeId: "pt2", isRecommended: false, isAllowed: false }] },
    { id: "f2", code: "LYCRA", name: "Lycra", description: null, composition: null, minGsm: null, maxGsm: null, defaultGsm: null, colors: [], productTypes: [] },
  ],
  sizeScales: [{ id: "sc1", code: "STANDARD", name: "Standard", sizes: [{ id: "s1", code: "S", name: "S" }, { id: "s2", code: "M", name: "M" }] }],
  patterns: [{ patternId: "pat1", referenceNumber: "PAT-000001", code: "TEE_REG", name: "Regular Tee", fitType: "Regular", productTypeId: "pt1", patternVersionId: "v1", versionNumber: 2 }],
  printMethods: [{ id: "pm1", code: "DTF", name: "DTF", type: "PRINT", description: null, supportsFullColor: true, maxColors: null, minQuantity: null }],
  accessories: [{ id: "ac1", code: "ZIP", name: "Zip", category: "Hardware" }],
  components: [{ id: "co1", code: "NECK_LABEL", name: "Neck label", category: "LABEL" }],
  fitMethods: [{ value: "BENUE_PATTERN" }], fabricProviders: [{ value: "CUSTOMER" }], decorationSides: [{ value: "FRONT" }], measurementUnits: [{ value: "CM" }],
  terms: { id: "t1", code: "SAMPLE_TERMS", version: 1, title: "Terms" },
});

/* ---- sample fixtures (shapes captured from the live backend) ---- */
export const sampleItem = (over: Record<string, unknown> = {}) => ({
  id: "s1", sampleNumber: "SMP-000001", status: "DRAFT", paymentState: "UNPAID", revisionNumber: 1,
  customer: { id: "c1", customerNumber: "CUS-000001", displayName: "Nile Streetwear" }, brand: { id: "b1", brandNumber: "BRD-000001", name: "Nile Core" },
  productType: { id: "pt1", code: "TEE", name: "Tee" }, customProductName: null, fabric: { id: "f1", code: "MILTON", name: "Milton" }, customFabricName: null,
  assignedSales: null, submittedAt: null, approvedAt: null, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", archivedAt: null, ...over,
});
export const sampleDetail = (over: Record<string, unknown> = {}) => ({
  ...sampleItem(), holdPreviousStatus: null, revisionOfId: null, customProductDescription: null, customFabricDescription: null, fabricColor: null,
  customColorName: "Navy", customPantone: null, customHex: "#001F3F", fabricProvider: "BENUE_PRINT", gsm: 220, sampleSize: { id: "z1", code: "M", name: "M", scaleCode: "STANDARD" },
  fitMethod: "NOT_SURE", patternVersion: null, notes: "customer note", fitNotes: null, printNotes: null, fabricNotes: null, specialInstructions: null, factoryInstructions: "internal only",
  reviewedAt: null, completedAt: null, decorations: [], accessories: [], components: [], attachments: [], termsAcceptances: [], allowedActions: ["submit", "cancel"], ...over,
});

/* ---- order fixtures (shapes captured from the live backend) ---- */
export const orderVariant = (over: Record<string, unknown> = {}) => ({
  id: "v1", sizeOptionId: "z1", sizeName: "XS", customSizeName: null, fabricColorId: null, colorName: null, customColorName: "Black", pantone: null, hex: null, label: "Black / XS",
  quantity: 40, completedQuantity: 0, rejectedQuantity: 0, allocatedQuantity: 0, notes: null, ...over,
});
export const orderItem = (over: Record<string, unknown> = {}) => ({
  id: "it1", productName: "Tee", productTypeId: "pt1", quantity: 100, variantTotal: 100, notes: null,
  variants: [orderVariant(), orderVariant({ id: "v2", sizeOptionId: "z2", sizeName: "S", label: "Black / S", quantity: 60 })], ...over,
});
export const productionSummary = (over: Record<string, unknown> = {}) => ({
  orderId: "o1", orderNumber: "ORD-000001", status: "IN_PRODUCTION", totalQuantity: 500, completedQuantity: 320, rejectedQuantity: 4, reworkQuantity: 12, reworkFlaggedQuantity: 0, remainingQuantity: 176,
  progressPercent: 64.5, targetDeliveryDate: "2026-12-15T00:00:00Z", isPastTargetDate: false, batches: [], jobs: [], activeStages: [], blockedStages: [], delayedStages: [], currentStage: null, ...over,
});
export const orderBatch = (over: Record<string, unknown> = {}) => ({
  id: "b1", batchNumber: "BAT-000001", orderId: "o1", status: "PLANNED", quantity: 50, targetStartDate: null, targetCompletionDate: null, startedAt: null, completedAt: null, holdReason: null, cancelReason: null,
  allocations: [{ orderVariantId: "v1", label: "Black / XS", quantity: 30 }, { orderVariantId: "v2", label: "Black / S", quantity: 20 }], job: null, createdAt: "2026-10-02T10:00:00Z", ...over,
});
export const orderDetail = (over: Record<string, unknown> = {}) => ({
  id: "o1", orderNumber: "ORD-000001", status: "DRAFT", priority: "NORMAL", customer: { id: "c1", name: "Nile Streetwear", number: "CUS-000001" }, brand: { id: "b1", name: "Nile Core", number: "BRD-000001" },
  sampleNumber: "SMP-000001", reorderOfOrderNumber: null, totalQuantity: 100, completedQuantity: 0, rejectedQuantity: 0, progressPercent: 0, revisionNumber: 1, targetDeliveryDate: "2026-12-15T00:00:00Z",
  assignedSalesUserId: null, isDelayed: false, paymentState: "UNPAID", createdAt: "2026-10-01T10:00:00Z", sourceSampleId: "s1", sampleRevision: 1,
  approvedReference: { id: "ar1", revision: 1, kind: "APPROVED_REFERENCE", specHash: "a".repeat(64), sourceFactoryJobId: null, sourceFactoryJobNumber: null, createdAt: "2026-10-01T09:00:00Z" },
  currentSpec: null, reorderOfOrderId: null, confirmedAt: null, productionStartDate: null, completedAt: null, deliveredAt: null, closedAt: null, cancelledAt: null, cancellationReason: null, holdReason: null, internalNotes: null,
  items: [orderItem()], batches: [], factoryJobs: [], productionSummary: productionSummary({ status: "DRAFT" }),
  fulfillment: { deliveredQuantity: 0, inFlightQuantity: 0, shippableQuantity: 0, remainingDeliveryQuantity: 100, packagingDefined: false, packedQuantity: 0, packagingComplete: false, trackingEnabled: false }, recentActivities: [], ...over,
});
export const orderListItem = (over: Record<string, unknown> = {}) => ({
  id: "o1", orderNumber: "ORD-000001", status: "CONFIRMED", priority: "HIGH", customer: { id: "c1", name: "Nile Streetwear", number: "CUS-000001" }, brand: { id: "b1", name: "Nile Core", number: "BRD-000001" },
  sampleNumber: "SMP-000001", reorderOfOrderNumber: null, totalQuantity: 500, completedQuantity: 100, rejectedQuantity: 0, progressPercent: 20, revisionNumber: 1, targetDeliveryDate: "2026-12-15T00:00:00Z",
  assignedSalesUserId: null, isDelayed: true, paymentState: "PARTIALLY_PAID", createdAt: "2026-10-01T10:00:00Z", ...over,
});
