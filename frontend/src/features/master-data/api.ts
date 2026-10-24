import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/types/api";
import type {
  Accessory, Asset, ComponentOption, Fabric, FabricColor, Pattern, PatternDetail, PrintMethod, ProductFabric,
  ProductType, SampleOptions, SizeScale,
} from "./types";

/** Every master-data list endpoint shares: page, pageSize, search, isActive, includeArchived, sortBy, sortOrder. */
export type ListQuery = QueryParams;
const list = <T>(path: string) => (query: ListQuery, signal?: AbortSignal) => api.get<Paginated<T>>(path, { query, signal });
const one = <T>(base: string) => (id: string, signal?: AbortSignal) => api.get<T>(`${base}/${encodeURIComponent(id)}`, { signal });

export const listProductTypes = list<ProductType>("/admin/product-types");
export const getProductType = one<ProductType>("/admin/product-types");
export const listProductTypeFabrics = (id: string, signal?: AbortSignal) => api.get<ProductFabric[]>(`/admin/product-types/${encodeURIComponent(id)}/fabrics`, { signal });

export const listFabrics = list<Fabric>("/admin/fabrics");
export const getFabric = one<Fabric>("/admin/fabrics");
export const listFabricColors = (id: string, includeArchived: boolean, signal?: AbortSignal) =>
  api.get<FabricColor[]>(`/admin/fabrics/${encodeURIComponent(id)}/colors`, { query: { includeArchived: includeArchived || undefined }, signal });

export const listSizeScales = list<SizeScale>("/admin/size-scales");
export const listPrintMethods = list<PrintMethod>("/admin/print-methods");
export const listAccessories = list<Accessory>("/admin/accessories");
export const listComponentOptions = list<ComponentOption>("/admin/component-options");

export const listPatterns = list<Pattern>("/admin/patterns");
export const getPattern = one<PatternDetail>("/admin/patterns");

/** Files of a pattern version: metadata via the asset list API (needs assets.read). */
export const listVersionAssets = (versionId: string, signal?: AbortSignal) =>
  api.get<Paginated<Asset>>("/admin/assets", { query: { targetType: "PATTERN_VERSION", targetId: versionId, pageSize: 50 }, signal });

export { getAssetDownloadUrl as getDownloadUrl } from "@/lib/api/assets";

export const getSampleOptions = (signal?: AbortSignal) => api.get<SampleOptions>("/configurator/sample-options", { signal });
