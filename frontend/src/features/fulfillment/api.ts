import { getActive } from "@/i18n/active";
import { api } from "@/lib/api/client";
import { env } from "@/lib/config/env";
import type { Paginated, QueryParams } from "@/types/api";
import type { CreateShipmentBody, PackagingReport, PackagingReportBody, PackagingSpec, PackagingSpecInput, PublicTracking, Shipment, StaffDelivery, TrackingStatus, TrackingToken } from "./types";

const enc = encodeURIComponent;
const order = (id: string) => `/admin/orders/${enc(id)}`;

/* ---- packaging ---- */
export const getPackaging = (orderId: string, signal?: AbortSignal) => api.get<PackagingSpec>(`${order(orderId)}/packaging`, { signal });
export const putPackaging = (orderId: string, body: PackagingSpecInput) => api.put<PackagingSpec>(`${order(orderId)}/packaging`, body);
/** Packaging execution is reported on the PACKAGING job stage (staff route; admins with the production-quantity permission may report too). */
export const reportPackaging = (stageId: string, body: PackagingReportBody) => api.post<unknown>(`/staff/job-stages/${enc(stageId)}/packaging-reports`, body);
export type { PackagingReport };

/* ---- shipments (admin) ---- */
export const listOrderShipments = (orderId: string, signal?: AbortSignal) => api.get<Shipment[]>(`${order(orderId)}/shipments`, { signal });
export const listShipments = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<Shipment>>("/admin/shipments", { query, signal });
export const getShipment = (id: string, signal?: AbortSignal) => api.get<Shipment>(`/admin/shipments/${enc(id)}`, { signal });
export const createShipment = (orderId: string, body: CreateShipmentBody) => api.post<Shipment>(`${order(orderId)}/shipments`, body);
export const updateShipment = (id: string, body: Record<string, unknown>) => api.patch<Shipment>(`/admin/shipments/${enc(id)}`, body);

/** Lifecycle actions exist on two routes with the same verbs: admin (`/admin/shipments`) and the delivery user (`/staff/deliveries`). */
export type ShipmentVerb = "ready" | "dispatch" | "in-transit" | "deliver" | "fail" | "return" | "cancel";
export const shipmentAction = (id: string, verb: ShipmentVerb, body?: Record<string, unknown>) => api.post<Shipment>(`/admin/shipments/${enc(id)}/${verb}`, body);
const staffVerb: Record<string, string> = { dispatch: "dispatch", "in-transit": "in-transit", deliver: "delivered", fail: "failed", return: "returned" };
export const staffAction = (id: string, verb: "dispatch" | "in-transit" | "deliver" | "fail" | "return", body?: Record<string, unknown>) => api.post<StaffDelivery>(`/staff/deliveries/${enc(id)}/${staffVerb[verb]}`, body);

export function uploadProof(id: string, file: File, staff: boolean) {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<Shipment | StaffDelivery>(staff ? `/staff/deliveries/${enc(id)}/proof` : `/admin/shipments/${enc(id)}/proof`, fd);
}
export const proofUrlPath = (id: string, staff: boolean) => (staff ? `/staff/deliveries/${enc(id)}/proof-url` : `/admin/shipments/${enc(id)}/proof-url`);

/* ---- delivery user ---- */
export const myDeliveries = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<StaffDelivery>>("/staff/deliveries", { query, signal });
export const myDelivery = (id: string, signal?: AbortSignal) => api.get<StaffDelivery>(`/staff/deliveries/${enc(id)}`, { signal });

/* ---- tracking ---- */
export const getTracking = (orderId: string, signal?: AbortSignal) => api.get<TrackingStatus>(`${order(orderId)}/tracking`, { signal });
export const createTrackingToken = (orderId: string, expiresInDays?: number) => api.post<TrackingToken>(`${order(orderId)}/tracking-token`, expiresInDays ? { expiresInDays } : {});
export const regenerateTrackingToken = (orderId: string, expiresInDays?: number) => api.post<TrackingToken>(`${order(orderId)}/tracking-token/regenerate`, expiresInDays ? { expiresInDays } : {});
export const revokeTrackingToken = (orderId: string) => api.delete<TrackingStatus>(`${order(orderId)}/tracking-token`);
/** The PUBLIC endpoint (no auth, token in the path): used only for the admin "Public tracking preview". */
export async function fetchPublicTracking(token: string, signal?: AbortSignal): Promise<PublicTracking> {
  const r = await fetch(`${env.apiUrl}/track/orders/${enc(token)}`, { signal });
  if (!r.ok) throw new Error(r.status === 404 ? getActive().t("fulfillment.trackingLinkInvalid") : getActive().t("fulfillment.trackingRequestFailed", { status: r.status }));
  return (await r.json()) as PublicTracking;
}
