"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";

export const useOrders = (query: Record<string, unknown>, enabled = true) =>
  useQuery({ queryKey: queryKeys.orders.list(query), queryFn: ({ signal }) => api.listOrders(query as never, signal), placeholderData: keepPreviousData, enabled });
export const useOrder = (id: string) => useQuery({ queryKey: queryKeys.orders.detail(id), queryFn: ({ signal }) => api.getOrder(id, signal) });
export const useProductionSummary = (id: string, enabled = true) =>
  useQuery({ queryKey: queryKeys.orders.production(id), queryFn: ({ signal }) => api.getProductionSummary(id, signal), enabled });
export const useOrderActivities = (id: string) => useQuery({ queryKey: queryKeys.orders.activities(id), queryFn: ({ signal }) => api.listActivities(id, signal) });
export const useOrderSpecs = (id: string) => useQuery({ queryKey: queryKeys.orders.specs(id), queryFn: ({ signal }) => api.listSpecs(id, signal) });
export const useOrderRevisions = (id: string) => useQuery({ queryKey: queryKeys.orders.revisions(id), queryFn: ({ signal }) => api.listRevisions(id, signal) });

/** After an order mutation: the order, lists, its timeline, revisions, production and commercial summary. */
export function useOrderInvalidation() {
  const qc = useQueryClient();
  const invalidateOrder = (id: string) => {
      for (const key of [queryKeys.orders.detail(id), queryKeys.orders.activities(id), queryKeys.orders.revisions(id), queryKeys.orders.specs(id), queryKeys.orders.production(id), queryKeys.orders.commercial(id)]) void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.lists });
  };
  return {
    order: invalidateOrder,
    /** A factory job was created: the order, its batches/production summary and the production board/lists. */
    job: (id: string) => {
      invalidateOrder(id);
      void qc.invalidateQueries({ queryKey: ["production", "board"] });
      void qc.invalidateQueries({ queryKey: ["production", "jobs"] });
    },
    lists: () => qc.invalidateQueries({ queryKey: queryKeys.orders.lists }),
  };
}
