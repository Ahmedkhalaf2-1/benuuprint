import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/types/api";
import type {
  Customer, CustomerAddress, CustomerContact, CustomerDetail, CustomerEditableStatus,
} from "./types";

export type CustomerListQuery = QueryParams;

export const listCustomers = (query: CustomerListQuery, signal?: AbortSignal) =>
  api.get<Paginated<Customer>>("/admin/customers", { query, signal });

export const getCustomer = (id: string, signal?: AbortSignal) =>
  api.get<CustomerDetail>(`/admin/customers/${encodeURIComponent(id)}`, { signal });

export type CustomerCreateBody = Partial<Record<"email" | "phone" | "whatsapp" | "country" | "city" | "instagram" | "source" | "notes", string>> & {
  displayName: string;
  status?: CustomerEditableStatus;
};
export const createCustomer = (body: CustomerCreateBody) => api.post<CustomerDetail>("/admin/customers", body);

/** PATCH: optional fields accept null to clear. */
export type CustomerUpdateBody = Partial<Record<"email" | "phone" | "whatsapp" | "country" | "city" | "instagram" | "source" | "notes", string | null>> & {
  displayName?: string;
};
export const updateCustomer = (id: string, body: CustomerUpdateBody) =>
  api.patch<CustomerDetail>(`/admin/customers/${encodeURIComponent(id)}`, body);

/** Soft archive (204). Also archives the customer's live brands. */
export const archiveCustomer = (id: string) => api.delete<void>(`/admin/customers/${encodeURIComponent(id)}`);

/** Changes status; setting any status on an archived customer restores it (its brands stay archived). */
export const setCustomerStatus = (id: string, status: CustomerEditableStatus) =>
  api.patch<CustomerDetail>(`/admin/customers/${encodeURIComponent(id)}/status`, { status });

/* contacts */
export const listContacts = (customerId: string, signal?: AbortSignal) =>
  api.get<CustomerContact[]>(`/admin/customers/${encodeURIComponent(customerId)}/contacts`, { signal });
export type ContactBody = {
  role?: string; name: string; jobTitle?: string | null; email?: string | null; phone?: string | null;
  whatsapp?: string | null; isPrimary?: boolean; notes?: string | null;
};
export const createContact = (customerId: string, body: ContactBody) =>
  api.post<CustomerContact>(`/admin/customers/${encodeURIComponent(customerId)}/contacts`, body);
export const updateContact = (id: string, body: Partial<ContactBody>) =>
  api.patch<CustomerContact>(`/admin/customer-contacts/${encodeURIComponent(id)}`, body);
export const archiveContact = (id: string) => api.delete<void>(`/admin/customer-contacts/${encodeURIComponent(id)}`);

/* addresses */
export const listAddresses = (customerId: string, signal?: AbortSignal) =>
  api.get<CustomerAddress[]>(`/admin/customers/${encodeURIComponent(customerId)}/addresses`, { signal });
export type AddressBody = {
  type?: string; country: string; state?: string | null; city: string; area?: string | null; addressLine1: string;
  addressLine2?: string | null; postalCode?: string | null; notes?: string | null; isDefault?: boolean;
};
export const createAddress = (customerId: string, body: AddressBody) =>
  api.post<CustomerAddress>(`/admin/customers/${encodeURIComponent(customerId)}/addresses`, body);
export const updateAddress = (id: string, body: Partial<AddressBody>) =>
  api.patch<CustomerAddress>(`/admin/customer-addresses/${encodeURIComponent(id)}`, body);
export const archiveAddress = (id: string) => api.delete<void>(`/admin/customer-addresses/${encodeURIComponent(id)}`);
