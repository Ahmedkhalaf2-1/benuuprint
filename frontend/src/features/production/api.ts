import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/types/api";
import type { Asset } from "@/features/master-data/types";
import type { Activity, Blocker, Board, JobDetail, JobListItem, JobNote, JobStage, QcInspection, Rework, StageDefinition, StageReports, StaffJobListItem, StaffStageDetail, StaffStageListItem } from "./types";

const enc = encodeURIComponent;
const job = (id: string) => `/admin/factory-jobs/${enc(id)}`;

/* ---------------- admin / board ---------------- */
export const getBoard = (query: QueryParams, signal?: AbortSignal) => api.get<Board>("/admin/production/board", { query, signal });
export const listJobs = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<JobListItem>>("/admin/factory-jobs", { query, signal });
export const getJob = (id: string, signal?: AbortSignal) => api.get<JobDetail>(job(id), { signal });
export const listJobStages = (id: string, signal?: AbortSignal) => api.get<JobStage[]>(`${job(id)}/stages`, { signal });
export const listBlockers = (id: string, signal?: AbortSignal) => api.get<Blocker[]>(`${job(id)}/blockers`, { signal });
export const listJobNotes = (id: string, signal?: AbortSignal) => api.get<JobNote[]>(`${job(id)}/notes`, { signal });
export const listTimeline = (id: string, signal?: AbortSignal) => api.get<Paginated<Activity>>(`${job(id)}/timeline`, { query: { pageSize: 100 }, signal });
export const listQcInspections = (id: string, signal?: AbortSignal) => api.get<QcInspection[]>(`${job(id)}/qc-inspections`, { signal });
export const listRework = (id: string, signal?: AbortSignal) => api.get<Rework[]>(`${job(id)}/rework`, { signal });
export const listStageDefinitions = (signal?: AbortSignal) => api.get<StageDefinition[]>("/admin/production-stage-definitions", { signal });
export const listJobAssets = (id: string, signal?: AbortSignal) => api.get<Paginated<Asset>>("/admin/assets", { query: { targetType: "FACTORY_JOB", targetId: id, pageSize: 50 }, signal });

/** Job-level actions (factory_jobs.manage). */
export const jobAction = (id: string, route: "hold" | "resume" | "release" | "cancel" | "force-complete", body?: { reason: string }) => api.post<JobDetail>(`${job(id)}/${route}`, body);
export const changeJobPriority = (id: string, priority: string, reason?: string) => api.patch<JobDetail>(`${job(id)}/priority`, { priority, ...(reason ? { reason } : {}) });
export const addJobNote = (id: string, body: { content: string; jobStageId?: string }) => api.post<JobNote>(`${job(id)}/notes`, body);
export const raiseJobBlocker = (id: string, body: { type: string; description: string }) => api.post<Blocker>(`${job(id)}/blockers`, body);

/** Stage-level admin actions. */
export const assignStage = (stageId: string, body: { userId: string; isPrimary?: boolean; context?: string }) => api.post<JobStage>(`/admin/job-stages/${enc(stageId)}/assignments`, body);
export const unassignStage = (stageId: string, assignmentId: string) => api.delete<JobStage>(`/admin/job-stages/${enc(stageId)}/assignments/${enc(assignmentId)}`);
export const stageHold = (stageId: string, route: "hold" | "resume", body?: { reason: string }) => api.post<JobStage>(`/admin/job-stages/${enc(stageId)}/${route}`, body);
export const stageOverride = (stageId: string, body: { action: "complete" | "skip"; reason: string }) => api.post<JobStage>(`/admin/job-stages/${enc(stageId)}/override`, body);
export const manualRework = (stageId: string, body: { reason: string; targetStageCode?: string; affectedQuantity?: number }) => api.post(`/admin/job-stages/${enc(stageId)}/rework`, body);
export const raiseStageBlockerAdmin = (stageId: string, body: { type: string; description: string }) => api.post<Blocker>(`/admin/job-stages/${enc(stageId)}/blockers`, body);
export const resolveBlockerAdmin = (id: string, action: "resolve" | "cancel", body: { note?: string }) => api.post<Blocker>(`/admin/blockers/${enc(id)}/${action}`, body);

/* ---------------- staff (assigned work) ---------------- */
export const myStages = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<StaffStageListItem>>("/staff/my-stages", { query, signal });
export const myJobs = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<StaffJobListItem>>("/staff/my-jobs", { query, signal });
export const staffStage = (stageId: string, signal?: AbortSignal) => api.get<StaffStageDetail>(`/staff/job-stages/${enc(stageId)}`, { signal });
export const staffStart = (stageId: string) => api.post<JobStage>(`/staff/job-stages/${enc(stageId)}/start`);
export const staffComplete = (stageId: string, body: { note?: string }) => api.post<JobStage>(`/staff/job-stages/${enc(stageId)}/complete`, body);
export const staffBlocker = (stageId: string, body: { type: string; description: string }) => api.post<Blocker>(`/staff/job-stages/${enc(stageId)}/blockers`, body);
export const staffResolveBlocker = (id: string, body: { note?: string }) => api.post<Blocker>(`/staff/blockers/${enc(id)}/resolve`, body);
export const staffNote = (stageId: string, body: { content: string }) => api.post<JobNote>(`/staff/job-stages/${enc(stageId)}/notes`, body);
export const staffReports = (stageId: string, signal?: AbortSignal) => api.get<StageReports>(`/staff/job-stages/${enc(stageId)}/production-reports`, { signal });
export interface ReportBody { producedQuantity?: number; rejectedQuantity?: number; reworkQuantity?: number; orderVariantId?: string; notes?: string }
export const staffReport = (stageId: string, body: ReportBody) => api.post<StageReports>(`/staff/job-stages/${enc(stageId)}/production-reports`, body);
export function staffUploadStageFile(stageId: string, file: File, type: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", type);
  return api.post<Asset>(`/staff/job-stages/${enc(stageId)}/assets`, fd);
}
/** Signed URL for a file the stage shows (resolved on the API origin by the caller). */
export const stageFileUrlPath = (stageId: string, assetId: string) => `/staff/job-stages/${enc(stageId)}/files/${enc(assetId)}/download-url`;

/* ---------------- QC ---------------- */
export const qcStart = (stageId: string) => api.post<QcInspection>(`/staff/job-stages/${enc(stageId)}/qc/start`);
export interface QcResultInput { itemCode: string; result?: "PASS" | "FAIL" | "NA"; numericValue?: number; textValue?: string; notes?: string }
export const qcSaveResults = (inspectionId: string, results: QcResultInput[]) => api.put<QcInspection>(`/staff/qc-inspections/${enc(inspectionId)}/results`, { results });
export function qcUploadPhoto(inspectionId: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<Asset>(`/staff/qc-inspections/${enc(inspectionId)}/photos`, fd);
}
export interface QcCompleteBody { overallResult: "PASS" | "FAIL" | "CONDITIONAL_PASS"; notes?: string; inspectedQuantity?: number; passedQuantity?: number; failedQuantity?: number; reworkTargetStageCode?: string }
export const qcComplete = (inspectionId: string, body: QcCompleteBody) => api.post<QcInspection>(`/staff/qc-inspections/${enc(inspectionId)}/complete`, body);
