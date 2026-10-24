"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";

export const useSamples = (query: api.SampleBody & Record<string, unknown>, enabled = true) =>
  useQuery({ queryKey: queryKeys.samples.list(query), queryFn: ({ signal }) => api.listSamples(query as never, signal), placeholderData: keepPreviousData, enabled });

export const useSample = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.samples.detail(id ?? ""), queryFn: ({ signal }) => api.getSample(id as string, signal), enabled: !!id });

export const useStatusHistory = (id: string) =>
  useQuery({ queryKey: queryKeys.samples.history(id), queryFn: ({ signal }) => api.getStatusHistory(id, signal) });

export const useSampleNotes = (id: string) =>
  useQuery({ queryKey: queryKeys.samples.notes(id), queryFn: ({ signal }) => api.listNotes(id, signal) });

export const useSampleApprovals = (id: string) =>
  useQuery({ queryKey: queryKeys.samples.approvals(id), queryFn: ({ signal }) => api.listApprovals(id, signal) });

/** 403 for roles without commercial access: callers hide the tab by permission and still handle the error. */
export const useCommercialSummary = (id: string, enabled: boolean) =>
  useQuery({ queryKey: queryKeys.samples.commercialSummary(id), queryFn: ({ signal }) => api.getCommercialSummary(id, signal), enabled });

export const useProductionSpecs = (id: string, enabled = true) =>
  useQuery({ queryKey: queryKeys.samples.productionSpecs(id), queryFn: ({ signal }) => api.listProductionSpecs(id, signal), enabled });

export const useSampleJobs = (sampleNumber: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.samples.production(sampleNumber),
    queryFn: async ({ signal }) => (await api.listSampleJobs(sampleNumber, signal)).data.filter((j) => j.sampleNumber === sampleNumber),
    enabled,
  });

export const useSampleArtworks = (sampleId: string) =>
  useQuery({ queryKey: queryKeys.artwork.bySample(sampleId), queryFn: ({ signal }) => api.listArtworks({ sampleId, pageSize: 100 }, signal).then((r) => r.data) });

/** Reusable, brand-owned artwork (can be linked to this sample's decorations). */
export const useBrandArtworks = (brandId: string | undefined) =>
  useQuery({ queryKey: queryKeys.artwork.byBrand(brandId ?? ""), queryFn: ({ signal }) => api.listArtworks({ brandId, pageSize: 100 }, signal).then((r) => r.data), enabled: !!brandId });

/** Active sample terms. Terms are master data that changes rarely. */
export const useActiveTerms = () =>
  useQuery({
    queryKey: queryKeys.terms.active,
    queryFn: async ({ signal }) => (await api.listTerms(signal)).find((t) => t.isActive) ?? null,
    staleTime: 5 * 60_000,
  });

export const useStaffSearch = (search: string, enabled: boolean) =>
  useQuery({ queryKey: queryKeys.staff.search(search), queryFn: ({ signal }) => api.searchStaff(search, signal), enabled, staleTime: 30_000 });

/** Targeted invalidation after sample mutations. */
export function useSampleInvalidation() {
  const qc = useQueryClient();
  return {
    detail: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.samples.detail(id) }),
    lists: () => qc.invalidateQueries({ queryKey: queryKeys.samples.lists }),
    history: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.samples.history(id) }),
    approvals: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.samples.approvals(id) }),
    notes: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.samples.notes(id) }),
    artwork: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.artwork.bySample(id) }),
    commercial: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.samples.commercialSummary(id) }),
    /** After a lifecycle action: detail + list + history (+ commercial/production caches that depend on status). */
    afterAction: (id: string) => {
      void qc.invalidateQueries({ queryKey: queryKeys.samples.detail(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.samples.lists });
      void qc.invalidateQueries({ queryKey: queryKeys.samples.history(id) });
    },
  };
}
