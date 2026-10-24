"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";

/**
 * Master data changes rarely: 5 minutes fresh, 30 minutes kept. It is still refetched after that (never cached
 * forever) and on any manual refresh. Transactional data keeps the 30 s global default.
 */
export const MASTER_STALE = 5 * 60_000;
const master = { staleTime: MASTER_STALE, gcTime: 30 * 60_000 } as const;

export const useProductTypes = (query: api.ListQuery = {}) =>
  useQuery({ queryKey: queryKeys.masterData.productTypes(query), queryFn: ({ signal }) => api.listProductTypes(query, signal), placeholderData: keepPreviousData, ...master });
export const useProductType = (id: string) =>
  useQuery({ queryKey: queryKeys.masterData.productType(id), queryFn: ({ signal }) => api.getProductType(id, signal), ...master });
export const useProductTypeFabrics = (id: string) =>
  useQuery({ queryKey: queryKeys.masterData.productTypeFabrics(id), queryFn: ({ signal }) => api.listProductTypeFabrics(id, signal), ...master });

export const useFabrics = (query: api.ListQuery = {}) =>
  useQuery({ queryKey: queryKeys.masterData.fabrics(query), queryFn: ({ signal }) => api.listFabrics(query, signal), placeholderData: keepPreviousData, ...master });
export const useFabric = (id: string) =>
  useQuery({ queryKey: queryKeys.masterData.fabric(id), queryFn: ({ signal }) => api.getFabric(id, signal), ...master });
export const useFabricColors = (fabricId: string | undefined, includeArchived = false) =>
  useQuery({ queryKey: queryKeys.masterData.fabricColors(fabricId ?? "", includeArchived), queryFn: ({ signal }) => api.listFabricColors(fabricId as string, includeArchived, signal), enabled: !!fabricId, ...master });

export const useSizeScales = (query: api.ListQuery = {}) =>
  useQuery({ queryKey: queryKeys.masterData.sizeScales(query), queryFn: ({ signal }) => api.listSizeScales(query, signal), placeholderData: keepPreviousData, ...master });
export const usePrintMethods = (query: api.ListQuery = {}) =>
  useQuery({ queryKey: queryKeys.masterData.printMethods(query), queryFn: ({ signal }) => api.listPrintMethods(query, signal), placeholderData: keepPreviousData, ...master });
export const useAccessories = (query: api.ListQuery = {}) =>
  useQuery({ queryKey: queryKeys.masterData.accessories(query), queryFn: ({ signal }) => api.listAccessories(query, signal), placeholderData: keepPreviousData, ...master });
export const useComponentOptions = (query: api.ListQuery = {}) =>
  useQuery({ queryKey: queryKeys.masterData.components(query), queryFn: ({ signal }) => api.listComponentOptions(query, signal), placeholderData: keepPreviousData, ...master });

export const usePatterns = (query: api.ListQuery = {}) =>
  useQuery({ queryKey: queryKeys.patterns.list(query), queryFn: ({ signal }) => api.listPatterns(query, signal), placeholderData: keepPreviousData, ...master });
export const usePattern = (id: string) =>
  useQuery({ queryKey: queryKeys.patterns.detail(id), queryFn: ({ signal }) => api.getPattern(id, signal), ...master });
export const usePatternVersionAssets = (versionId: string, enabled = true) =>
  useQuery({ queryKey: queryKeys.patterns.versionAssets(versionId), queryFn: ({ signal }) => api.listVersionAssets(versionId, signal), enabled, ...master });

/** Everything the future Sample form consumes, in one request (GET /configurator/sample-options). */
export const useConfiguratorOptions = () =>
  useQuery({ queryKey: queryKeys.configurator.sampleOptions, queryFn: ({ signal }) => api.getSampleOptions(signal), ...master });
