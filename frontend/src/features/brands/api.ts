import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/types/api";
import type { Brand, BrandDetail, BrandEditableStatus } from "./types";

/** Brands can only be listed per customer: the backend has no global brand list. */
export const listCustomerBrands = (customerId: string, query: QueryParams, signal?: AbortSignal) =>
  api.get<Paginated<Brand>>(`/admin/customers/${encodeURIComponent(customerId)}/brands`, { query, signal });

export const getBrand = (id: string, signal?: AbortSignal) => api.get<BrandDetail>(`/admin/brands/${encodeURIComponent(id)}`, { signal });

export type BrandCreateBody = Partial<Record<"instagram" | "website" | "description" | "primaryColor" | "secondaryColor", string>> & {
  name: string;
  status?: BrandEditableStatus;
};
export const createBrand = (customerId: string, body: BrandCreateBody) =>
  api.post<BrandDetail>(`/admin/customers/${encodeURIComponent(customerId)}/brands`, body);

export type BrandUpdateBody = Partial<Record<"instagram" | "website" | "description" | "primaryColor" | "secondaryColor", string | null>> & {
  name?: string;
  /** Setting a status on an archived brand restores it (409 while its customer is archived). */
  status?: BrandEditableStatus;
};
export const updateBrand = (id: string, body: BrandUpdateBody) => api.patch<BrandDetail>(`/admin/brands/${encodeURIComponent(id)}`, body);

/** Soft archive (204). */
export const archiveBrand = (id: string) => api.delete<void>(`/admin/brands/${encodeURIComponent(id)}`);
