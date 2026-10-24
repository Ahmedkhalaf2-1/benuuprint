import { api } from "@/lib/api/client";
import type {
  ApplyMode, ApplyResult, AttentionFeed, CustomerMatrix, CustomerOperations, CustomerResponsibilityItem, JobProcess,
  ResponsibilityOverviewItem, ResponsibilityRule,
} from "./types";

const enc = encodeURIComponent;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export const getOverview = (signal?: AbortSignal) => api.get<ResponsibilityOverviewItem[]>("/admin/responsibilities", { signal });
export const getAttention = (signal?: AbortSignal) => api.get<AttentionFeed>("/admin/responsibilities/attention", { signal });
export type SetBody = { userId: string; additionalUserIds?: string[] };
export const setGlobal = (stageKey: string, body: SetBody) => api.put<ResponsibilityRule>(`/admin/responsibilities/${enc(stageKey)}`, body);
export const clearGlobal = (stageKey: string) => api.delete<void>(`/admin/responsibilities/${enc(stageKey)}`);
export const applyGlobal = (stageKey: string, mode: ApplyMode) => api.post<ApplyResult>(`/admin/responsibilities/${enc(stageKey)}/apply-active`, { mode });
export const bulkOverrides = (body: { customerIds: string[]; stageKey: string; userId?: string; clear?: boolean }) => api.post<unknown>("/admin/responsibilities/bulk-customer-overrides", body);

export async function getMatrix(customerId: string, signal?: AbortSignal): Promise<CustomerMatrix> {
  const raw = await api.get<unknown>(`/admin/customers/${enc(customerId)}/responsibilities`, { signal });
  if (Array.isArray(raw)) return { items: raw as CustomerResponsibilityItem[], commercial: null };
  const o = isObj(raw) ? raw : {};
  const items = [o.items, o.areas, o.responsibilities].find(Array.isArray) as CustomerResponsibilityItem[] | undefined;
  return { items: items ?? [], commercial: isObj(o.commercial) ? o.commercial : null };
}
export const setOverride = (customerId: string, stageKey: string, body: SetBody) => api.put<ResponsibilityRule>(`/admin/customers/${enc(customerId)}/responsibilities/${enc(stageKey)}`, body);
export const clearOverride = (customerId: string, stageKey: string) => api.delete<void>(`/admin/customers/${enc(customerId)}/responsibilities/${enc(stageKey)}`);
export const applyCustomer = (customerId: string, stageKey: string, mode: ApplyMode) => api.post<ApplyResult>(`/admin/customers/${enc(customerId)}/responsibilities/${enc(stageKey)}/apply-active`, { mode });

export async function getOperations(customerId: string, signal?: AbortSignal): Promise<CustomerOperations> {
  const raw = await api.get<unknown>(`/admin/customers/${enc(customerId)}/operations`, { signal });
  const o = isObj(raw) ? raw : {};
  const inner = isObj(o.operations) ? o.operations : o;
  return { ...(inner as object), currentWork: Array.isArray(inner.currentWork) ? (inner.currentWork as CustomerOperations["currentWork"]) : [] } as CustomerOperations;
}

/** Order/sample endpoints are "one process per production job"; the job endpoint is a single process. All come back as a list. */
export function asProcesses(raw: unknown): JobProcess[] {
  if (Array.isArray(raw)) return raw.filter(isObj) as unknown as JobProcess[];
  if (!isObj(raw)) return [];
  for (const k of ["processes", "jobs", "items", "data"]) if (Array.isArray(raw[k])) return (raw[k] as unknown[]).filter(isObj) as unknown as JobProcess[];
  if (isObj(raw.process)) return [raw.process as unknown as JobProcess];
  return Array.isArray(raw.stages) ? [raw as unknown as JobProcess] : [];
}
export type ProcessKind = "orders" | "samples" | "jobs";
export const getProcesses = async (kind: ProcessKind, id: string, signal?: AbortSignal) => asProcesses(await api.get<unknown>(`/admin/${kind}/${enc(id)}/process`, { signal }));
