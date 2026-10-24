"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";
import type { BrandEditableStatus } from "./types";

export function useCustomerBrands(customerId: string | undefined, query: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: queryKeys.brands.list(customerId ?? "", query),
    queryFn: ({ signal }) => api.listCustomerBrands(customerId as string, query, signal),
    enabled: !!customerId,
    placeholderData: keepPreviousData,
  });
}

export function useBrand(id: string) {
  return useQuery({ queryKey: queryKeys.brands.detail(id), queryFn: ({ signal }) => api.getBrand(id, signal) });
}

function useBrandInvalidation() {
  const qc = useQueryClient();
  return (customerId: string, brandId?: string) => {
    void qc.invalidateQueries({ queryKey: queryKeys.brands.lists(customerId) });
    void qc.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) }); // detail embeds brand summaries
    if (brandId) void qc.invalidateQueries({ queryKey: queryKeys.brands.detail(brandId) });
  };
}

export function useCreateBrand(customerId: string) {
  const invalidate = useBrandInvalidation();
  return useMutation({ mutationFn: (body: api.BrandCreateBody) => api.createBrand(customerId, body), onSuccess: (b) => invalidate(customerId, b.id) });
}

export function useUpdateBrand(id: string, customerId: string) {
  const invalidate = useBrandInvalidation();
  return useMutation({ mutationFn: (body: api.BrandUpdateBody) => api.updateBrand(id, body), onSuccess: () => invalidate(customerId, id) });
}

export function useArchiveBrand() {
  const invalidate = useBrandInvalidation();
  return useMutation({ mutationFn: ({ id }: { id: string; customerId: string }) => api.archiveBrand(id), onSuccess: (_d, v) => invalidate(v.customerId, v.id) });
}

export function useRestoreBrand() {
  const invalidate = useBrandInvalidation();
  return useMutation({
    mutationFn: ({ id, status = "ACTIVE" }: { id: string; customerId: string; status?: BrandEditableStatus }) => api.updateBrand(id, { status }),
    onSuccess: (_d, v) => invalidate(v.customerId, v.id),
  });
}
