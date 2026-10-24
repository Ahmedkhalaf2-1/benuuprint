"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";
import type { CommercialKind } from "./types";

const k = queryKeys.customer;
const LONG = { staleTime: 5 * 60_000 };

export const useBrands = () => useQuery({ queryKey: k.brands, queryFn: ({ signal }) => api.listBrands(signal), ...LONG });
export const useOptions = () => useQuery({ queryKey: k.options, queryFn: ({ signal }) => api.getOptions(signal), ...LONG });
export const useTerms = () => useQuery({ queryKey: k.terms, queryFn: ({ signal }) => api.getTerms(signal), ...LONG });
export const useProfile = () => useQuery({ queryKey: k.profile, queryFn: ({ signal }) => api.getProfile(signal) });
export const useAddresses = () => useQuery({ queryKey: k.addresses, queryFn: ({ signal }) => api.listAddresses(signal) });
export const useSampleList = (params: Record<string, string | number | undefined>) => useQuery({ queryKey: k.sampleList(params), queryFn: ({ signal }) => api.listSamples(params, signal), placeholderData: keepPreviousData });
/** `retry: false` so a foreign / unknown id shows "not found" at once. */
export const useSample = (id: string | undefined) => useQuery({ queryKey: k.sample(id ?? ""), queryFn: ({ signal }) => api.getSample(id as string, signal), enabled: !!id, retry: false });
export const useSubmissionCheck = (id: string, enabled: boolean) => useQuery({ queryKey: k.check(id), queryFn: ({ signal }) => api.getSubmissionCheck(id, signal), enabled, retry: false, staleTime: 0 });
export const useActivity = (id: string) => useQuery({ queryKey: k.activity(id), queryFn: ({ signal }) => api.getActivity(id, signal) });
export const useMessages = (id: string) => useQuery({ queryKey: k.messages(id), queryFn: ({ signal }) => api.getMessages(id, signal) });

export const useCommercial = (id: string) => useQuery({ queryKey: k.commercial(id), queryFn: ({ signal }) => api.getCommercial(id, signal), retry: false });
export const useQuotations = (id: string, kind: CommercialKind = "sample") => useQuery({ queryKey: kind === "order" ? k.orderQuotations(id) : k.quotations(id), queryFn: ({ signal }) => api.getQuotations(id, kind, signal), retry: false });
export const usePayments = (id: string, kind: CommercialKind = "sample") => useQuery({ queryKey: kind === "order" ? k.orderPayments(id) : k.payments(id), queryFn: ({ signal }) => api.getPayments(id, kind, signal), retry: false });
export const useProduction = (id: string) => useQuery({ queryKey: k.production(id), queryFn: ({ signal }) => api.getProduction(id, signal), retry: false });
export const useFiles = (id: string) => useQuery({ queryKey: k.files(id), queryFn: ({ signal }) => api.listFiles(id, signal), retry: false });

/** After a customer action (accept/reject/pay/approve/changes) refresh exactly what moves: the sample (status, nextStep, allowedActions), its commercial state, payments, production, files and timeline. */
export function useJourneyInvalidation(kind: CommercialKind = "sample") {
  const qc = useQueryClient();
  return (id: string) => {
    if (kind === "order") { void qc.invalidateQueries({ queryKey: [...k.orders, "detail", id] }); for (const key of [k.orderCommercial(id), k.orderQuotations(id), k.orderPayments(id), k.orderProduction(id), k.orderShipments(id), k.orderActivity(id)]) void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: [...k.orders, "list"] }); return; }
    for (const key of [k.sample(id), k.commercial(id), k.quotations(id), k.payments(id), k.production(id), k.files(id), k.activity(id), k.messages(id)]) void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ["customer", "samples", "list"] });
  };
}

/** After any draft edit the sample, its submission check, the list and the timeline can change — nothing else. */
export function useSampleInvalidation() {
  const qc = useQueryClient();
  return (id: string) => {
    void qc.invalidateQueries({ queryKey: k.sample(id) });
    void qc.invalidateQueries({ queryKey: k.check(id) });
    void qc.invalidateQueries({ queryKey: ["customer", "samples", "list"] });
    void qc.invalidateQueries({ queryKey: k.activity(id) });
  };
}

export const useOrderList = (params: Record<string, string | number | undefined>, enabled = true) => useQuery({ queryKey: k.orderList(params), queryFn: ({ signal }) => api.listOrders(params, signal), placeholderData: keepPreviousData, enabled });
export const useOrder = (id: string | undefined) => useQuery({ queryKey: k.order(id ?? ""), queryFn: ({ signal }) => api.getOrder(id as string, signal), enabled: !!id, retry: false });
export const useOrderCommercial = (id: string, enabled = true) => useQuery({ queryKey: k.orderCommercial(id), queryFn: ({ signal }) => api.getOrderCommercial(id, signal), retry: false, enabled });
export const useOrderProduction = (id: string, enabled = true) => useQuery({ queryKey: k.orderProduction(id), queryFn: ({ signal }) => api.getOrderProduction(id, signal), retry: false, enabled });
export const useOrderShipments = (id: string, enabled = true) => useQuery({ queryKey: k.orderShipments(id), queryFn: ({ signal }) => api.getOrderShipments(id, signal), retry: false, enabled });
export const useOrderActivity = (id: string) => useQuery({ queryKey: k.orderActivity(id), queryFn: ({ signal }) => api.getOrderActivity(id, signal) });
