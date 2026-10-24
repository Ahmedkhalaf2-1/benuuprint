"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";

type Q = Record<string, string | number | boolean | undefined>;
const POLL = 30_000;

/** The board and lists refetch lightly every 30 s while the tab is visible (no websockets exist). */
export const useBoard = (query: Q, enabled = true) =>
  useQuery({ queryKey: queryKeys.production.board(query), queryFn: ({ signal }) => api.getBoard(query as never, signal), placeholderData: keepPreviousData, refetchInterval: POLL, enabled });
export const useJobs = (query: Q, enabled = true) =>
  useQuery({ queryKey: queryKeys.production.jobs(query), queryFn: ({ signal }) => api.listJobs(query as never, signal), placeholderData: keepPreviousData, refetchInterval: POLL, enabled });
export const useJob = (id: string) => useQuery({ queryKey: queryKeys.production.job(id), queryFn: ({ signal }) => api.getJob(id, signal), refetchInterval: POLL });
export const useJobBlockers = (id: string) => useQuery({ queryKey: queryKeys.production.blockers(id), queryFn: ({ signal }) => api.listBlockers(id, signal) });
export const useJobNotes = (id: string) => useQuery({ queryKey: queryKeys.production.notes(id), queryFn: ({ signal }) => api.listJobNotes(id, signal) });
export const useTimeline = (id: string) => useQuery({ queryKey: queryKeys.production.timeline(id), queryFn: ({ signal }) => api.listTimeline(id, signal) });
export const useJobQc = (id: string) => useQuery({ queryKey: queryKeys.production.qc(id), queryFn: ({ signal }) => api.listQcInspections(id, signal) });
export const useJobRework = (id: string) => useQuery({ queryKey: queryKeys.production.rework(id), queryFn: ({ signal }) => api.listRework(id, signal) });
export const useStageDefinitions = (enabled = true) => useQuery({ queryKey: queryKeys.production.stageDefs, queryFn: ({ signal }) => api.listStageDefinitions(signal), staleTime: 5 * 60_000, enabled });

export const useMyStages = (query: Q) =>
  useQuery({ queryKey: queryKeys.myWork.stages(query), queryFn: ({ signal }) => api.myStages(query as never, signal), placeholderData: keepPreviousData, refetchInterval: POLL });
export const useMyJobs = (query: Q) =>
  useQuery({ queryKey: queryKeys.myWork.jobs(query), queryFn: ({ signal }) => api.myJobs(query as never, signal), placeholderData: keepPreviousData, refetchInterval: POLL });
export const useStaffStage = (stageId: string | undefined, enabled = true) =>
  useQuery({ queryKey: queryKeys.myWork.stage(stageId ?? ""), queryFn: ({ signal }) => api.staffStage(stageId as string, signal), enabled: !!stageId && enabled, retry: false });
export const useStageReports = (stageId: string, enabled: boolean) =>
  useQuery({ queryKey: queryKeys.myWork.reports(stageId), queryFn: ({ signal }) => api.staffReports(stageId, signal), enabled });

/**
 * Targeted refresh after an operational mutation: the stage, the caller's work lists, the job (+ its blockers/QC/rework/timeline),
 * the board, and the linked order's production summary when the job belongs to an order. Nothing else.
 */
export function useProductionInvalidation() {
  const qc = useQueryClient();
  return (ctx: { stageId?: string; jobId: string; orderId?: string | null }) => {
    const inv = (queryKey: readonly unknown[]) => void qc.invalidateQueries({ queryKey });
    if (ctx.stageId) { inv(queryKeys.myWork.stage(ctx.stageId)); inv(queryKeys.myWork.reports(ctx.stageId)); }
    inv(queryKeys.myWork.all);
    inv(queryKeys.production.job(ctx.jobId));
    inv(queryKeys.production.blockers(ctx.jobId));
    inv(queryKeys.production.timeline(ctx.jobId));
    inv(queryKeys.production.qc(ctx.jobId));
    inv(queryKeys.production.rework(ctx.jobId));
    inv(queryKeys.production.notes(ctx.jobId));
    inv(["production", "board"]);
    inv(["production", "jobs"]);
    if (ctx.orderId) { inv(queryKeys.orders.production(ctx.orderId)); inv(queryKeys.orders.detail(ctx.orderId)); inv(["fulfillment"]); }
  };
}
