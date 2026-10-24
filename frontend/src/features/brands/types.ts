/** Shapes from the live OpenAPI (BrandResponseDto, BrandDetailResponseDto). */
export const BRAND_EDITABLE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type BrandEditableStatus = (typeof BRAND_EDITABLE_STATUSES)[number];
export type BrandStatus = BrandEditableStatus | "ARCHIVED";

export interface Brand {
  id: string;
  brandNumber: string;
  customerId: string;
  name: string;
  instagram: string | null;
  website: string | null;
  description: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  status: BrandStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface BrandDetail extends Brand {
  customer: { id: string; customerNumber: string; displayName: string };
}
