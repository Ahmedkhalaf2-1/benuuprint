"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSampleInvalidation } from "@/features/samples/hooks";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";
import type { CommercialTarget } from "./types";

export const useQuotations = (t: CommercialTarget, enabled = true) =>
  useQuery({ queryKey: queryKeys.commercial.quotations(t.kind, t.id), queryFn: ({ signal }) => api.listQuotations(t, signal), enabled });

export const usePayments = (t: CommercialTarget, enabled = true) =>
  useQuery({ queryKey: queryKeys.commercial.payments(t.kind, t.id), queryFn: ({ signal }) => api.listPayments(t, signal), enabled });

/** Summary of a sample (`/commercial-summary`) or an order (`/commercial`, with the release gate). */
export const useCommercialSummary = (t: CommercialTarget, enabled = true) =>
  useQuery({
    queryKey: t.kind === "sample" ? queryKeys.samples.commercialSummary(t.id) : queryKeys.orders.commercial(t.id),
    queryFn: ({ signal }) => api.getCommercialSummary(t, signal),
    enabled,
  });

/**
 * Quotation/payment mutations change the summary AND can move the owner (sample: QUOTED, AWAITING_PAYMENT,
 * READY_FOR_PRODUCTION; order: payment state / release gate / timeline), so exactly these refresh.
 */
export function useCommercialInvalidation(t: CommercialTarget) {
  const qc = useQueryClient();
  const sample = useSampleInvalidation();
  const refreshOwner = () => {
    if (t.kind === "sample") {
      void sample.commercial(t.id);
      sample.afterAction(t.id);
    } else {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.commercial(t.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.detail(t.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.activities(t.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.lists });
    }
  };
  return {
    quotations: () => qc.invalidateQueries({ queryKey: queryKeys.commercial.quotations(t.kind, t.id) }),
    payments: () => qc.invalidateQueries({ queryKey: queryKeys.commercial.payments(t.kind, t.id) }),
    all: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.commercial.quotations(t.kind, t.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.commercial.payments(t.kind, t.id) });
      refreshOwner();
    },
  };
}
