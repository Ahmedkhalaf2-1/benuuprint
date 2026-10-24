"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

export const rKeys = {
  all: ["responsibilities"] as const,
  overview: ["responsibilities", "overview"] as const,
  attention: ["responsibilities", "attention"] as const,
  matrix: (id: string) => ["responsibilities", "matrix", id] as const,
  ops: (id: string) => ["responsibilities", "operations", id] as const,
  process: (kind: string, id: string) => ["responsibilities", "process", kind, id] as const,
};
const POLL = 30_000;

export const useOverview = (enabled = true) => useQuery({ queryKey: rKeys.overview, queryFn: ({ signal }) => api.getOverview(signal), enabled });
export const useAttention = (enabled = true) => useQuery({ queryKey: rKeys.attention, queryFn: ({ signal }) => api.getAttention(signal), enabled, retry: false, refetchInterval: POLL });
export const useMatrix = (customerId: string, enabled = true) => useQuery({ queryKey: rKeys.matrix(customerId), queryFn: ({ signal }) => api.getMatrix(customerId, signal), enabled });
export const useOperations = (customerId: string, enabled = true) => useQuery({ queryKey: rKeys.ops(customerId), queryFn: ({ signal }) => api.getOperations(customerId, signal), enabled, refetchInterval: POLL });
/** `retry: false`: a role without access simply sees no process block. */
export const useProcesses = (kind: api.ProcessKind, id: string, enabled = true) =>
  useQuery({ queryKey: rKeys.process(kind, id), queryFn: ({ signal }) => api.getProcesses(kind, id, signal), enabled: enabled && !!id, retry: false, refetchInterval: POLL });

/** A rule change moves the matrix, the overview, the attention feed and every customer summary. */
export function useResponsibilityInvalidation() {
  const qc = useQueryClient();
  return () => { void qc.invalidateQueries({ queryKey: rKeys.all }); void qc.invalidateQueries({ queryKey: ["customers"] }); };
}
