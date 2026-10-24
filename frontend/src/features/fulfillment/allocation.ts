import type { Shipment } from "./types";

export interface VariantRef { id: string; label: string; quantity: number }
export interface AllocationRow { id: string; label: string; ordered: number; allocated: number; remaining: number }

/** Statuses whose units are NOT on a shipment any more: cancelled, or returned (the backend makes returned units shippable again). */
const RELEASED = ["CANCELLED", "RETURNED"];

/**
 * Per-variant view for creating a shipment: ordered, units already on (live) shipments, and what is left. `exceptShipmentId`
 * excludes the shipment being edited. This is a UI guard only — the backend (packed / produced / delivered rules) stays authoritative.
 */
export function shipmentAllocation(variants: VariantRef[], shipments: Shipment[], exceptShipmentId?: string): AllocationRow[] {
  return variants.map((v) => {
    const allocated = shipments
      .filter((s) => s.id !== exceptShipmentId && !RELEASED.includes(s.status))
      .flatMap((s) => s.lines)
      .filter((l) => l.orderVariantId === v.id)
      .reduce((n, l) => n + l.quantity, 0);
    return { id: v.id, label: v.label, ordered: v.quantity, allocated, remaining: Math.max(0, v.quantity - allocated) };
  });
}

export interface AllocationCheck { total: number; errors: Record<string, string>; totalError?: string; valid: boolean }
/** Validates entered quantities (strings) against per-variant remaining and the order's shippable units (when known). */
export function checkAllocation(rows: AllocationRow[], entered: Record<string, string>, shippable?: number): AllocationCheck {
  const errors: Record<string, string> = {};
  let total = 0;
  for (const r of rows) {
    const raw = (entered[r.id] ?? "").trim();
    if (!raw) continue;
    if (!/^\d+$/.test(raw)) { errors[r.id] = "Whole number"; continue; }
    const n = Number(raw);
    if (n === 0) continue;
    total += n;
    if (n > r.remaining) errors[r.id] = `At most ${r.remaining} left`;
  }
  const totalError = total === 0 ? "Enter at least one quantity" : shippable !== undefined && total > shippable ? `Only ${shippable} packed units can ship now` : undefined;
  return { total, errors, totalError, valid: total > 0 && Object.keys(errors).length === 0 && !totalError };
}

/** Packaging stage reporting: what can still be packed. */
export const packagingRemaining = (required: number, packed: number, damaged: number) => Math.max(0, required - packed - damaged);
