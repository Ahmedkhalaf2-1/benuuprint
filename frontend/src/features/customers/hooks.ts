"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";
import type { CustomerEditableStatus } from "./types";

export function useCustomers(query: api.CustomerListQuery) {
  return useQuery({
    queryKey: queryKeys.customers.list(query),
    queryFn: ({ signal }) => api.listCustomers(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string) {
  // `enabled`: an empty id would otherwise request GET /admin/customers/ (the LIST) and cache it as a customer.
  return useQuery({ queryKey: queryKeys.customers.detail(id), queryFn: ({ signal }) => api.getCustomer(id, signal), enabled: !!id });
}

/** Remote search for pickers: never loads the whole customer table. */
export function useCustomerOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers.options(search),
    queryFn: ({ signal }) => api.listCustomers({ search: search || undefined, pageSize: 10, sortBy: "displayName", sortOrder: "asc" }, signal),
    enabled,
    staleTime: 15_000,
  });
}

export function useCustomerContacts(customerId: string) {
  return useQuery({ queryKey: queryKeys.customerContacts.list(customerId), queryFn: ({ signal }) => api.listContacts(customerId, signal) });
}

export function useCustomerAddresses(customerId: string) {
  return useQuery({ queryKey: queryKeys.customerAddresses.list(customerId), queryFn: ({ signal }) => api.listAddresses(customerId, signal) });
}

/** Targeted invalidation: lists + the one detail, never the whole cache. */
export function useCustomerInvalidation() {
  const qc = useQueryClient();
  return {
    lists: () => qc.invalidateQueries({ queryKey: queryKeys.customers.lists }),
    detail: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.customers.detail(id) }),
    contacts: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.customerContacts.list(id) }),
    addresses: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.customerAddresses.list(id) }),
    brands: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.brands.lists(id) }),
  };
}

export function useCreateCustomer() {
  const inv = useCustomerInvalidation();
  return useMutation({ mutationFn: api.createCustomer, onSuccess: () => void inv.lists() });
}

export function useUpdateCustomer(id: string) {
  const inv = useCustomerInvalidation();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: api.CustomerUpdateBody) => api.updateCustomer(id, body),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.customers.detail(id), data);
      void inv.lists();
    },
  });
}

export function useArchiveCustomer() {
  const inv = useCustomerInvalidation();
  return useMutation({
    mutationFn: (id: string) => api.archiveCustomer(id),
    onSuccess: (_d, id) => {
      void inv.lists();
      void inv.detail(id);
      void inv.brands(id); // live brands were archived with it
    },
  });
}

export function useSetCustomerStatus() {
  const inv = useCustomerInvalidation();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CustomerEditableStatus }) => api.setCustomerStatus(id, status),
    onSuccess: (_d, { id }) => {
      void inv.lists();
      void inv.detail(id);
    },
  });
}
