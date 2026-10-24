import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/types/api";
import type {
  Approval, Artwork, CommercialSummary, FactoryJobSummary, ProductionSpec, SampleDetail, SampleListItem, SampleNote, StaffUser,
  StatusHistoryEntry, Terms, TermsAcceptance,
} from "./types";
import type { Asset } from "@/features/master-data/types";

const enc = encodeURIComponent;

/* ---- samples ---- */
export const listSamples = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<SampleListItem>>("/admin/samples", { query, signal });
export const getSample = (id: string, signal?: AbortSignal) => api.get<SampleDetail>(`/admin/samples/${enc(id)}`, { signal });

/** Draft fields. Create omits empties; update sends `null` to clear (exclusive pairs are switched explicitly). */
export type SampleBody = Record<string, string | number | boolean | null | undefined>;
export const createSample = (body: SampleBody) => api.post<SampleDetail>("/admin/samples", body);
export const updateSample = (id: string, body: SampleBody) => api.patch<SampleDetail>(`/admin/samples/${enc(id)}`, body);

/** Lifecycle: explicit action routes only (the API has no "set status"). */
export const sampleAction = (id: string, route: string, body?: { reason?: string }) => api.post<SampleDetail>(`/admin/samples/${enc(id)}/${route}`, body);
export const assignSales = (id: string, userId: string | null) => api.post<SampleDetail>(`/admin/samples/${enc(id)}/assign-sales`, { userId });

export const getStatusHistory = (id: string, signal?: AbortSignal) => api.get<StatusHistoryEntry[]>(`/admin/samples/${enc(id)}/status-history`, { signal });
export const getCommercialSummary = (id: string, signal?: AbortSignal) => api.get<CommercialSummary>(`/admin/samples/${enc(id)}/commercial-summary`, { signal });
export const listProductionSpecs = (id: string, signal?: AbortSignal) => api.get<ProductionSpec[]>(`/admin/samples/${enc(id)}/production-specs`, { signal });

/** Sample-production job(s): searched by sample number; needs jobs.read_all. */
export const listSampleJobs = (sampleNumber: string, signal?: AbortSignal) =>
  api.get<Paginated<FactoryJobSummary>>("/admin/factory-jobs", { query: { search: sampleNumber, sourceType: "SAMPLE_PRODUCTION", pageSize: 20 }, signal });

/* ---- parts ---- */
export type DecorationBody = {
  printMethodId?: string; placement?: string; side?: string; width?: number | null; height?: number | null; unit?: string | null;
  colorCount?: number | null; notes?: string | null; artworkRequired?: boolean; artworkId?: string | null; sortOrder?: number;
};
export const createDecoration = (sampleId: string, body: DecorationBody) => api.post(`/admin/samples/${enc(sampleId)}/decorations`, body);
export const updateDecoration = (id: string, body: DecorationBody) => api.patch(`/admin/sample-decorations/${enc(id)}`, body);
export const deleteDecoration = (id: string) => api.delete<void>(`/admin/sample-decorations/${enc(id)}`);

export type AccessoryBody = { accessoryId?: string; customName?: string; quantity?: number | null; notes?: string | null };
export const createAccessory = (sampleId: string, body: AccessoryBody) => api.post(`/admin/samples/${enc(sampleId)}/accessories`, body);
export const updateAccessory = (id: string, body: Partial<AccessoryBody>) => api.patch(`/admin/sample-accessories/${enc(id)}`, body);
export const deleteAccessory = (id: string) => api.delete<void>(`/admin/sample-accessories/${enc(id)}`);

export type ComponentBody = { componentOptionId?: string; customName?: string; notes?: string | null };
export const createComponent = (sampleId: string, body: ComponentBody) => api.post(`/admin/samples/${enc(sampleId)}/components`, body);
export const updateComponent = (id: string, body: Partial<ComponentBody>) => api.patch(`/admin/sample-components/${enc(id)}`, body);
export const deleteComponent = (id: string) => api.delete<void>(`/admin/sample-components/${enc(id)}`);

/* ---- files: private assets (multipart upload through the backend, never to storage directly) ---- */
export function uploadAsset(file: File, type: string, signal?: AbortSignal) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", type);
  return api.post<Asset>("/admin/assets", fd, { signal });
}
export const attachSampleAsset = (sampleId: string, assetId: string) => api.post(`/admin/samples/${enc(sampleId)}/assets`, { assetId });
export const detachSampleAsset = (sampleId: string, attachmentId: string) => api.delete<void>(`/admin/samples/${enc(sampleId)}/assets/${enc(attachmentId)}`);

/* ---- artwork ---- */
export const listArtworks = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<Artwork>>("/admin/artworks", { query, signal });
export const createArtwork = (body: { sampleId?: string; brandId?: string; name: string; purpose?: string; assetId: string; notes?: string }) => api.post<Artwork>("/admin/artworks", body);
export const addArtworkVersion = (artworkId: string, body: { assetId: string; notes?: string }) => api.post(`/admin/artworks/${enc(artworkId)}/versions`, body);

/* ---- notes ---- */
export const listNotes = (id: string, signal?: AbortSignal) => api.get<SampleNote[]>(`/admin/samples/${enc(id)}/notes`, { signal });
export const createNote = (id: string, body: { content: string; visibility?: string }) => api.post<SampleNote>(`/admin/samples/${enc(id)}/notes`, body);
export const deleteNote = (id: string, noteId: string) => api.delete<void>(`/admin/samples/${enc(id)}/notes/${enc(noteId)}`);

/* ---- approvals ---- */
export const listApprovals = (id: string, signal?: AbortSignal) => api.get<Approval[]>(`/admin/samples/${enc(id)}/approvals`, { signal });
export const requestApproval = (id: string, body: { type: string; artworkVersionId?: string; productionSpecId?: string; quotationVersionId?: string }) => api.post<Approval>(`/admin/samples/${enc(id)}/approvals`, body);
export type RespondBody = { recordedAs?: "ON_BEHALF_OF_CUSTOMER" | "INTERNAL"; sourceNote?: string; responseNote?: string };
export const respondApproval = (approvalId: string, decision: "approve" | "reject", body: RespondBody) => api.post<Approval>(`/admin/approvals/${enc(approvalId)}/${decision}`, body);
export const cancelApproval = (approvalId: string) => api.post<Approval>(`/admin/approvals/${enc(approvalId)}/cancel`);

/* ---- terms ---- */
export const listTerms = (signal?: AbortSignal) => api.get<Terms[]>("/admin/terms", { query: { code: "SAMPLE_TERMS" }, signal });
export const recordTerms = (sampleId: string, body: { sourceNote: string; termsVersionId?: string }) => api.post<TermsAcceptance>(`/admin/samples/${enc(sampleId)}/terms-acceptances`, body);

/* ---- staff lookup for assignment (users.read) ---- */
export const searchStaff = (search: string, signal?: AbortSignal) => api.get<Paginated<StaffUser>>("/admin/users", { query: { search: search || undefined, status: "ACTIVE", pageSize: 20 }, signal });

/** Sample-production job (sample must be READY_FOR_PRODUCTION and paid). */
export const createSampleJob = (sampleId: string, body: { release?: boolean; priority?: string; targetCompletionDate?: string; internalNotes?: string }) => api.post<{ id: string; jobNumber: string }>(`/admin/samples/${enc(sampleId)}/create-factory-job`, body);
