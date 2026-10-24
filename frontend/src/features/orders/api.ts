import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/types/api";
import type { ItemInput, OrderActivity, OrderSpec, OrderBatch, OrderDetail, OrderListItem, OrderRevision, ProductionSummary } from "./types";

const enc = encodeURIComponent;
const base = (id: string) => `/admin/orders/${enc(id)}`;

export const listOrders = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<OrderListItem>>("/admin/orders", { query, signal });
export const getOrder = (id: string, signal?: AbortSignal) => api.get<OrderDetail>(base(id), { signal });
export const getProductionSummary = (id: string, signal?: AbortSignal) => api.get<ProductionSummary>(`${base(id)}/production-summary`, { signal });
export const listActivities = (id: string, signal?: AbortSignal) => api.get<Paginated<OrderActivity>>(`${base(id)}/activities`, { query: { pageSize: 50 }, signal });
export const listRevisions = (id: string, signal?: AbortSignal) => api.get<OrderRevision[]>(`${base(id)}/revisions`, { signal });
export const listSpecs = (id: string, signal?: AbortSignal) => api.get<OrderSpec[]>(`${base(id)}/production-specs`, { signal });
export const listBatches = (id: string, signal?: AbortSignal) => api.get<OrderBatch[]>(`${base(id)}/batches`, { signal });

/** Orders are created from an APPROVED sample (its APPROVED_REFERENCE is pinned): there is no standalone create. */
export interface CreateOrderBody { targetDeliveryDate?: string; priority?: string; assignedSalesUserId?: string; internalNotes?: string; items?: ItemInput[] }
export const createOrderFromSample = (sampleId: string, body: CreateOrderBody) => api.post<OrderDetail>(`/admin/samples/${enc(sampleId)}/create-order`, body);

export const updateOrder = (id: string, body: { targetDeliveryDate?: string | null; assignedSalesUserId?: string | null; internalNotes?: string | null }) => api.patch<OrderDetail>(base(id), body);
/** DRAFT only. Rows with an id are updated, rows without are created, missing rows are removed. */
export const replaceItems = (id: string, items: ItemInput[]) => api.put<OrderDetail>(`${base(id)}/items`, { items });
export const changePriority = (id: string, priority: string, reason?: string) => api.patch<OrderDetail>(`${base(id)}/priority`, { priority, ...(reason ? { reason } : {}) });

/** Lifecycle: explicit action routes (there is no "set status"). */
export const orderAction = (id: string, route: string, body?: { reason?: string }) => api.post<OrderDetail>(`${base(id)}/${route}`, body);
export const reviseOrder = (id: string, body: { reason: string; items?: ItemInput[]; targetDeliveryDate?: string | null; internalNotes?: string | null }) => api.post<OrderDetail>(`${base(id)}/revise`, body);
export const reorder = (id: string, body: { cloneItems?: boolean; targetDeliveryDate?: string; priority?: string; internalNotes?: string }) => api.post<OrderDetail>(`${base(id)}/reorder`, body);

export interface AllocationInput { orderVariantId: string; quantity: number }
export const createBatch = (orderId: string, body: { targetStartDate?: string; targetCompletionDate?: string; allocations: AllocationInput[] }) => api.post<OrderBatch>(`${base(orderId)}/batches`, body);
export const replaceAllocations = (batchId: string, body: { allocations: AllocationInput[]; targetStartDate?: string; targetCompletionDate?: string }) => api.put<OrderBatch>(`/admin/order-batches/${enc(batchId)}/allocations`, body);
export const batchAction = (batchId: string, route: "ready" | "hold" | "resume" | "cancel", body?: { reason?: string }) => api.post<OrderBatch>(`/admin/order-batches/${enc(batchId)}/${route}`, body);

/** Creates the bulk job (whole order, no batches) or the batch job; the Factory Operations UI is a later phase. */
export interface FactoryJobBody { priority?: string; targetCompletionDate?: string; requestedStartDate?: string; internalNotes?: string; release?: boolean }
export const createOrderJob = (orderId: string, body: FactoryJobBody) => api.post<{ id: string; jobNumber: string }>(`${base(orderId)}/create-factory-job`, body);
export const createBatchJob = (batchId: string, body: FactoryJobBody) => api.post<{ id: string; jobNumber: string }>(`/admin/order-batches/${enc(batchId)}/create-factory-job`, body);
