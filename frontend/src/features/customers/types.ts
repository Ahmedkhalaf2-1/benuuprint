/** Shapes from the live OpenAPI (CustomerResponseDto, CustomerDetailResponseDto, contacts, addresses). */
export const CUSTOMER_STATUSES = ["ACTIVE", "LEAD", "INACTIVE", "BLOCKED"] as const;
export type CustomerEditableStatus = (typeof CUSTOMER_STATUSES)[number];
export type CustomerStatus = CustomerEditableStatus | "ARCHIVED";

export const CONTACT_ROLES = ["OWNER", "PRODUCTION", "FINANCE", "SHIPPING", "OTHER"] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const ADDRESS_TYPES = ["BILLING", "SHIPPING", "PICKUP", "OTHER"] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

import type { CustomerOpsSummary } from "@/features/responsibilities/types";

export interface Customer extends CustomerOpsSummary {
  id: string;
  customerNumber: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  city: string | null;
  instagram: string | null;
  source: string | null;
  notes: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface BrandSummary {
  id: string;
  brandNumber: string;
  name: string;
  status: string;
}

export interface CustomerContact {
  id: string;
  role: ContactRole;
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  type: AddressType;
  country: string;
  state: string | null;
  city: string;
  area: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends Customer {
  brands: BrandSummary[];
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
}

/** Backend GET /admin/customers query (sortBy / sortOrder, not sort / direction). */
export const CUSTOMER_SORT_KEYS = ["createdAt", "displayName", "customerNumber"] as const;
