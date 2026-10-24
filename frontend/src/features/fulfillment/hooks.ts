"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";

export const usePackaging = (orderId: string, enabled = true) => useQuery({ queryKey: queryKeys.fulfillment.packaging(orderId), queryFn: ({ signal }) => api.getPackaging(orderId, signal), enabled });
export const useOrderShipments = (orderId: string, enabled = true) => useQuery({ queryKey: queryKeys.fulfillment.shipments(orderId), queryFn: ({ signal }) => api.listOrderShipments(orderId, signal), enabled });
export const useShipments = (query: Record<string, unknown>, enabled = true) =>
  useQuery({ queryKey: queryKeys.fulfillment.shipmentList(query), queryFn: ({ signal }) => api.listShipments(query as never, signal), placeholderData: keepPreviousData, enabled, refetchInterval: 30_000 });
export const useMyDeliveries = (query: Record<string, unknown>, enabled = true) =>
  useQuery({ queryKey: queryKeys.fulfillment.deliveryWork(query), queryFn: ({ signal }) => api.myDeliveries(query as never, signal), placeholderData: keepPreviousData, enabled, refetchInterval: 30_000 });
export const useMyDelivery = (id: string | null) => useQuery({ queryKey: queryKeys.fulfillment.delivery(id ?? ""), queryFn: ({ signal }) => api.myDelivery(id as string, signal), enabled: !!id, retry: false });
export const useTracking = (orderId: string, enabled = true) => useQuery({ queryKey: queryKeys.fulfillment.tracking(orderId), queryFn: ({ signal }) => api.getTracking(orderId, signal), enabled });

/** Targeted refresh. Packaging report: packaging + fulfillment (order). Shipment change: shipments + order (fulfillment) + activity. */
export function useFulfillmentInvalidation() {
  const qc = useQueryClient();
  const inv = (queryKey: readonly unknown[]) => void qc.invalidateQueries({ queryKey });
  return {
    packaging: (orderId: string) => { inv(queryKeys.fulfillment.packaging(orderId)); inv(queryKeys.orders.detail(orderId)); inv(queryKeys.orders.activities(orderId)); inv(queryKeys.orders.production(orderId)); inv(["my-work"]); inv(["production", "job"]); },
    shipment: (orderId: string, shipmentId?: string) => {
      inv(queryKeys.fulfillment.shipments(orderId));
      if (shipmentId) inv(queryKeys.fulfillment.shipment(shipmentId));
      inv(queryKeys.fulfillment.shipmentLists);
      inv(queryKeys.fulfillment.packaging(orderId));
      inv(queryKeys.orders.detail(orderId));
      inv(queryKeys.orders.activities(orderId));
      inv(queryKeys.orders.lists);
    },
    delivery: () => { inv(["fulfillment", "delivery-work"]); inv(["fulfillment", "delivery"]); inv(queryKeys.fulfillment.shipmentLists); },
    tracking: (orderId: string) => { inv(queryKeys.fulfillment.tracking(orderId)); inv(queryKeys.orders.detail(orderId)); inv(queryKeys.orders.activities(orderId)); },
  };
}
