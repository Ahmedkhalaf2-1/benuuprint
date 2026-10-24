import { api } from "@/lib/api/client";
import type { AlertsPage, Bottlenecks, CommercialKpis, DeliveryKpis, ManagementBoard, NeedsAttention, OrderKpis, PipelineDashboard, ProductionKpis, QualityKpis, Range, SchedulerHealth, StaffWorkloadPage, Utilization, Wip, WorkloadDepartments } from "./types";

type Q = Record<string, string | number | boolean | undefined>;
const m = (path: string) => `/admin/management${path}`;
const get = <T,>(path: string, query: Q | undefined, signal?: AbortSignal) => api.get<T>(path, { query, signal });

export const getNeedsAttention = (q: Q, signal?: AbortSignal) => get<NeedsAttention>(m("/needs-attention"), q, signal);
export const getProductionKpis = (r: Range, signal?: AbortSignal) => get<ProductionKpis>(m("/kpis/production"), r, signal);
export const getOrderKpis = (r: Range, signal?: AbortSignal) => get<OrderKpis>(m("/kpis/orders"), r, signal);
export const getQualityKpis = (r: Range, signal?: AbortSignal) => get<QualityKpis>(m("/kpis/quality"), r, signal);
export const getCommercialKpis = (r: Range, signal?: AbortSignal) => get<CommercialKpis>(m("/kpis/commercial"), r, signal);
export const getDeliveryKpis = (r: Range, signal?: AbortSignal) => get<DeliveryKpis>(m("/kpis/delivery"), r, signal);
export const getBottlenecks = (r: Range, signal?: AbortSignal) => get<Bottlenecks>(m("/bottlenecks"), r, signal);
export const getWip = (signal?: AbortSignal) => get<Wip>(m("/wip"), undefined, signal);
export const getWorkloadDepartments = (signal?: AbortSignal) => get<WorkloadDepartments>(m("/workload/departments"), undefined, signal);
export const getWorkloadStaff = (q: Q, signal?: AbortSignal) => get<StaffWorkloadPage>(m("/workload/staff"), q, signal);
export const getUtilization = (q: Q, signal?: AbortSignal) => get<Utilization>(m("/capacity/utilization"), q, signal);
export const getBoard = (q: Q, signal?: AbortSignal) => get<ManagementBoard>(m("/production-board"), q, signal);
export const getAlerts = (q: Q, signal?: AbortSignal) => get<AlertsPage>("/admin/automation/alerts", q, signal);
export const getScheduler = (signal?: AbortSignal) => get<SchedulerHealth>("/admin/automation/scheduler", undefined, signal);
/** `/admin/dashboard` is used only for the pipeline counts (the other sections come from their own endpoints so one failure stays local). */
export const getDashboardPipeline = (r: Range, signal?: AbortSignal) => get<PipelineDashboard>("/admin/dashboard", r, signal);
