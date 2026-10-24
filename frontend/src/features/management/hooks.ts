"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";
import type { Range } from "./types";

type Q = Record<string, string | number | boolean | undefined>;
/** Current-state management data: refreshed every 60 s (the backend computes it live) and considered stale after 30 s. */
const LIVE = { staleTime: 30_000, refetchInterval: 60_000 } as const;
const r = (range: Range): Q => ({ from: range.from, to: range.to });
const k = queryKeys.management;

export const useNeedsAttention = (q: Q, enabled = true) => useQuery({ queryKey: k.needsAttention(q), queryFn: ({ signal }) => api.getNeedsAttention(q, signal), enabled, ...LIVE, placeholderData: keepPreviousData });
export const useProductionKpis = (range: Range, enabled = true) => useQuery({ queryKey: k.production(r(range)), queryFn: ({ signal }) => api.getProductionKpis(r(range), signal), enabled, ...LIVE });
export const useOrderKpis = (range: Range, enabled = true) => useQuery({ queryKey: k.orders(r(range)), queryFn: ({ signal }) => api.getOrderKpis(r(range), signal), enabled, ...LIVE });
export const useQualityKpis = (range: Range, enabled = true) => useQuery({ queryKey: k.quality(r(range)), queryFn: ({ signal }) => api.getQualityKpis(r(range), signal), enabled, ...LIVE });
export const useCommercialKpis = (range: Range, enabled = true) => useQuery({ queryKey: k.commercial(r(range)), queryFn: ({ signal }) => api.getCommercialKpis(r(range), signal), enabled, ...LIVE });
export const useDeliveryKpis = (range: Range, enabled = true) => useQuery({ queryKey: k.delivery(r(range)), queryFn: ({ signal }) => api.getDeliveryKpis(r(range), signal), enabled, ...LIVE });
export const useBottlenecks = (range: Range, enabled = true) => useQuery({ queryKey: k.bottlenecks(r(range)), queryFn: ({ signal }) => api.getBottlenecks(r(range), signal), enabled, ...LIVE });
export const useWip = (enabled = true) => useQuery({ queryKey: k.wip, queryFn: ({ signal }) => api.getWip(signal), enabled, ...LIVE });
export const useWorkloadDepartments = (enabled = true) => useQuery({ queryKey: k.workloadDepartments, queryFn: ({ signal }) => api.getWorkloadDepartments(signal), enabled, ...LIVE });
export const useWorkloadStaff = (q: Q, enabled = true) => useQuery({ queryKey: k.workloadStaff(q), queryFn: ({ signal }) => api.getWorkloadStaff(q, signal), enabled, staleTime: 30_000, placeholderData: keepPreviousData });
export const useUtilization = (q: Q, enabled = true) => useQuery({ queryKey: k.capacity(q), queryFn: ({ signal }) => api.getUtilization(q, signal), enabled, staleTime: 60_000 });
export const useManagementBoard = (q: Q, enabled = true) => useQuery({ queryKey: k.board(q), queryFn: ({ signal }) => api.getBoard(q, signal), enabled, ...LIVE, placeholderData: keepPreviousData });
export const useAlerts = (q: Q, enabled = true) => useQuery({ queryKey: k.alerts(q), queryFn: ({ signal }) => api.getAlerts(q, signal), enabled, ...LIVE, placeholderData: keepPreviousData });
export const useScheduler = (enabled = true) => useQuery({ queryKey: k.health, queryFn: ({ signal }) => api.getScheduler(signal), enabled, staleTime: 30_000, refetchInterval: 60_000 });
export const useDashboardPipeline = (range: Range, enabled = true) => useQuery({ queryKey: k.dashboard(r(range)), queryFn: ({ signal }) => api.getDashboardPipeline(r(range), signal), enabled, ...LIVE });
