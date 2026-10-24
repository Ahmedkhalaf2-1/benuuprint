import { env } from "@/lib/config/env";

/**
 * Public order tracking. Contract (backend OpenAPI): `GET {api}/track/orders/{token}` — no auth, the raw token is the credential,
 * an unknown / revoked / expired token is a 404. There is NO order-number lookup, so the only way in is a tracking link or its token.
 *
 * Only the fields below are read from the response (a whitelist): anything else the backend might add is ignored, never rendered.
 */
export interface TrackedShipment { shipmentNumber: string; status: string; quantity: number; courierName: string | null; trackingUrl: string | null; dispatchedAt: string | null; deliveredAt: string | null }
export interface TrackingView {
  orderNumber: string; status: string; currentStage: string | null; progressPercent: number; totalQuantity: number; deliveredQuantity: number; remainingDeliveryQuantity: number;
  targetDeliveryDate: string | null; shipments: TrackedShipment[]; updatedAt: string;
}
export type TrackingResult = { kind: "ok"; tracking: TrackingView } | { kind: "not_found" } | { kind: "rate_limited" } | { kind: "unavailable" };

const TOKEN_RE = /^[A-Za-z0-9._~-]{1,200}$/;

/** Accepts a bare token or a pasted tracking link (".../track/<token>" or ".../track/orders/<token>"). Returns null when nothing usable. */
export function extractToken(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let candidate = raw;
  if (/[/?#]/.test(raw)) {
    try {
      const u = new URL(raw, "http://x");
      const fromQuery = u.searchParams.get("token");
      const segs = u.pathname.split("/").filter(Boolean);
      candidate = fromQuery ?? segs[segs.length - 1] ?? "";
    } catch { return null; }
  }
  return TOKEN_RE.test(candidate) ? candidate : null;
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
/** Courier links are external: only http(s) is ever rendered as a link. */
const safeUrl = (v: unknown): string | null => { const s = str(v); return s && /^https?:\/\//i.test(s) ? s : null; };

export function toTrackingView(raw: unknown): TrackingView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.orderNumber !== "string" || typeof r.status !== "string" || !Array.isArray(r.shipments)) return null;
  return {
    orderNumber: r.orderNumber, status: r.status, currentStage: str(r.currentStage), progressPercent: Math.min(100, Math.max(0, num(r.progressPercent))),
    totalQuantity: num(r.totalQuantity), deliveredQuantity: num(r.deliveredQuantity), remainingDeliveryQuantity: num(r.remainingDeliveryQuantity), targetDeliveryDate: str(r.targetDeliveryDate),
    shipments: r.shipments.flatMap((s): TrackedShipment[] => {
      if (!s || typeof s !== "object") return [];
      const x = s as Record<string, unknown>;
      return typeof x.shipmentNumber === "string" && typeof x.status === "string"
        ? [{ shipmentNumber: x.shipmentNumber, status: x.status, quantity: num(x.quantity), courierName: str(x.courierName), trackingUrl: safeUrl(x.trackingUrl), dispatchedAt: str(x.dispatchedAt), deliveredAt: str(x.deliveredAt) }]
        : [];
    }),
    updatedAt: str(r.updatedAt) ?? "",
  };
}

/** Server-side lookup. Never throws; every failure maps to a safe, non-revealing state. */
export async function loadTracking(token: string, fetchImpl: typeof fetch = fetch): Promise<TrackingResult> {
  if (!TOKEN_RE.test(token)) return { kind: "not_found" };
  try {
    const res = await fetchImpl(`${env.apiUrl}/track/orders/${encodeURIComponent(token)}`, { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (res.status === 404 || res.status === 400 || res.status === 410) return { kind: "not_found" };
    if (res.status === 429) return { kind: "rate_limited" };
    if (!res.ok) return { kind: "unavailable" };
    const view = toTrackingView(await res.json());
    return view ? { kind: "ok", tracking: view } : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

/* ---------------- customer-friendly language ---------------- */
const humanize = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export const ORDER_STATUS_LABEL: Record<string, string> = {
  ORDER_RECEIVED: "Order received", CONFIRMED: "Confirmed", IN_PRODUCTION: "In production", PACKING: "Packing", READY_FOR_DELIVERY: "Ready for delivery",
  PARTIALLY_SHIPPED: "Partly shipped", OUT_FOR_DELIVERY: "On the way", DELIVERED: "Delivered", COMPLETED: "Completed", ON_HOLD: "On hold", CANCELLED: "Cancelled",
};
export const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  PREPARING: "Preparing", ON_THE_WAY: "On the way", DELIVERED: "Delivered", DELIVERY_ATTEMPT_FAILED: "Delivery attempt failed", RETURNED: "Returned",
};
export const orderStatusLabel = (s: string) => ORDER_STATUS_LABEL[s] ?? humanize(s);
export const shipmentStatusLabel = (s: string) => SHIPMENT_STATUS_LABEL[s] ?? humanize(s);

export const TRACK_STEPS = ["Order received", "In production", "Packing", "On the way", "Delivered"] as const;
/** Position on the five-step line, or null when the order is paused/cancelled (shown as a notice instead). */
export function trackStep(status: string): number | null {
  switch (status) {
    case "ORDER_RECEIVED": case "CONFIRMED": return 0;
    case "IN_PRODUCTION": return 1;
    case "PACKING": case "READY_FOR_DELIVERY": return 2;
    case "PARTIALLY_SHIPPED": case "OUT_FOR_DELIVERY": return 3;
    case "DELIVERED": case "COMPLETED": return 4;
    default: return null;
  }
}
