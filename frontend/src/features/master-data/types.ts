/** Shapes from the live OpenAPI + live responses (2026-10-21). All master data is read-only in this phase. */
export interface RefRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type ProductCategory = "TOPS" | "BOTTOMS" | "OUTERWEAR" | "HEADWEAR" | "DRESSES" | "OTHER";
export const PRODUCT_CATEGORIES: ProductCategory[] = ["TOPS", "BOTTOMS", "OUTERWEAR", "HEADWEAR", "DRESSES", "OTHER"];

export interface ProductType extends RefRow {
  category: ProductCategory | null;
  /** Decimal string; commercial default, shown as returned. */
  defaultSampleFee: string | null;
}

export interface FabricColorSummary {
  id: string;
  name: string;
  hex: string | null;
  isAvailable: boolean;
}

export interface FabricProductType {
  productTypeId: string;
  code: string;
  name: string;
  isRecommended: boolean;
  isAllowed: boolean;
  notes: string | null;
}

export interface Fabric extends RefRow {
  referenceNumber: string;
  composition: string | null;
  minGsm: number | null;
  maxGsm: number | null;
  defaultGsm: number | null;
  unit: string | null;
  notes: string | null;
  colors: FabricColorSummary[];
  productTypes: FabricProductType[];
}

export interface FabricColor {
  id: string;
  fabricId: string;
  name: string;
  internalCode: string | null;
  hex: string | null;
  pantone: string | null;
  /** Reference only: swatch files are served through the authorised asset API, never by path. */
  swatchAssetId: string | null;
  isAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

/** GET /admin/product-types/:id/fabrics */
export interface ProductFabric {
  productTypeId: string;
  fabricId: string;
  fabricCode: string;
  fabricName: string;
  isRecommended: boolean;
  isAllowed: boolean;
  notes: string | null;
}

export interface SizeOption {
  id: string;
  scaleId: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
}

export interface SizeScale extends RefRow {
  sizes: SizeOption[];
}

export type PrintMethodType = "PRINT" | "EMBROIDERY" | "OTHER";
export interface PrintMethod extends RefRow {
  type: PrintMethodType;
  minQuantity: number | null;
  maxColors: number | null;
  supportsFullColor: boolean;
  /** Decimal string as returned. */
  setupFee: string | null;
  notes: string | null;
}

export interface Accessory extends RefRow {
  category: string | null;
  unit: string | null;
}

export type ComponentCategory = "LABEL" | "PACKAGING" | "OTHER";
export const COMPONENT_CATEGORIES: ComponentCategory[] = ["LABEL", "PACKAGING", "OTHER"];
export interface ComponentOption extends RefRow {
  category: ComponentCategory;
}

export type PatternStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type PatternVersionStatus = "DRAFT" | "APPROVED" | "SUPERSEDED";

export interface Pattern {
  id: string;
  referenceNumber: string;
  code: string;
  name: string;
  productType: { id: string; code: string; name: string };
  description: string | null;
  fitType: string | null;
  status: PatternStatus;
  notes: string | null;
  currentVersionId: string | null;
  currentVersionNumber: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface PatternVersion {
  id: string;
  patternId: string;
  versionNumber: number;
  status: PatternVersionStatus;
  notes: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface PatternDetail extends Pattern {
  versions: PatternVersion[];
}

/** AssetResponseDto: metadata only. There is no storage key in the API, and none is ever modelled here. */
export interface Asset {
  id: string;
  type: string;
  originalName: string;
  description: string | null;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  uploadedByStaffUserId: string | null;
  createdAt: string;
  archivedAt: string | null;
}

/* ---- GET /configurator/sample-options (live shape) ---- */
export interface ConfigOptionBase { id: string; code: string; name: string }
export interface ConfigColor { id: string; name: string; hex: string | null; pantone?: string | null; isAvailable?: boolean }
export interface ConfigFabric extends ConfigOptionBase {
  description: string | null;
  composition: string | null;
  minGsm: number | null;
  maxGsm: number | null;
  defaultGsm: number | null;
  colors: ConfigColor[];
  productTypes: Array<{ productTypeId: string; isRecommended?: boolean; isAllowed?: boolean }>;
}
export interface SampleOptions {
  productTypes: Array<ConfigOptionBase & { description: string | null }>;
  fabrics: ConfigFabric[];
  sizeScales: Array<ConfigOptionBase & { sizes: ConfigOptionBase[] }>;
  patterns: Array<{ patternId: string; referenceNumber: string; code: string; name: string; fitType: string | null; productTypeId: string; patternVersionId: string; versionNumber: number }>;
  printMethods: Array<ConfigOptionBase & { type: string; description: string | null; supportsFullColor: boolean; maxColors: number | null; minQuantity: number | null }>;
  accessories: Array<ConfigOptionBase & { category: string | null }>;
  components: Array<ConfigOptionBase & { category: string | null }>;
  fitMethods: Array<{ value: string }>;
  fabricProviders: Array<{ value: string }>;
  decorationSides: Array<{ value: string }>;
  measurementUnits: Array<{ value: string }>;
  /** Terms shown with a sample; shape not needed by the frontend yet. */
  terms: Record<string, unknown> | null;
}
