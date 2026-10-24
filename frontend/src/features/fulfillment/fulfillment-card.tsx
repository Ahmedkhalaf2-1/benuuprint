"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/data-display/status-badge";
import { formatDate, formatNumber } from "@/lib/utils/format";
import type { OrderDetail } from "@/features/orders/types";

/** Pure: the headline readiness label, from backend numbers only (no second state machine). */
export function fulfillmentHeadline(o: Pick<OrderDetail, "status" | "totalQuantity" | "fulfillment" | "productionSummary">): { label: string; tone: "ready" | "success" | "progress" | "neutral" } {
  const f = o.fulfillment;
  if (f.remainingDeliveryQuantity === 0 && f.deliveredQuantity > 0) return { label: "Fully delivered", tone: "success" };
  if (f.shippableQuantity > 0) return { label: `Ready for shipment — ${f.shippableQuantity} packed units can ship now`, tone: "ready" };
  if (f.inFlightQuantity > 0) return { label: `${f.inFlightQuantity} units are on their way`, tone: "progress" };
  if (f.deliveredQuantity > 0) return { label: `Partially delivered — ${f.remainingDeliveryQuantity} units remaining`, tone: "progress" };
  return { label: f.packagingComplete ? "Packaged" : "Not ready to ship yet", tone: "neutral" };
}

/** Overview card: every number comes from the backend (`fulfillment`, `productionSummary`, `shipments`); nothing is recomputed. */
export function FulfillmentCard({ order, showShipments }: { order: OrderDetail; showShipments: boolean }) {
  const f = order.fulfillment;
  const head = fulfillmentHeadline(order);
  const cells: Array<[string, number | string]> = [
    ["Ordered", order.totalQuantity],
    ["Produced", order.productionSummary.completedQuantity],
    ["Packed", f.packedQuantity],
    ["Ready to ship", f.shippableQuantity],
    ["On their way", f.inFlightQuantity],
    ["Delivered", f.deliveredQuantity],
    ["Remaining to deliver", f.remainingDeliveryQuantity],
  ];
  return (
    <section aria-labelledby="fu-t" className="rounded-lg border bg-surface p-4" data-testid="fulfillment-card">
      <h2 id="fu-t" className="mb-1 text-sm font-semibold">Fulfillment</h2>
      <p className="mb-3 text-sm" data-testid="fulfillment-headline" data-tone={head.tone}>{head.label}</p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {cells.map(([l, v]) => <div key={l} className="rounded-md border p-2"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-lg font-semibold tabular-nums">{typeof v === "number" ? formatNumber(v) : v}</dd></div>)}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">Packaging: {!f.packagingDefined ? "specification not defined" : f.packagingComplete ? "complete" : "in progress"} · Customer tracking: {f.trackingEnabled ? "enabled" : "off"}</p>
      {showShipments && order.shipments?.length ? (
        <ul className="mt-3 divide-y rounded-md border text-sm" aria-label="Shipments summary">
          {order.shipments.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-x-3 px-3 py-1.5"><Link href={`/orders/${order.id}?tab=shipments`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{s.shipmentNumber}</Link><StatusBadge status={s.status} /><span className="tabular-nums">{s.quantity} units</span><span className="text-xs text-muted-foreground">{s.deliveredAt ? `delivered ${formatDate(s.deliveredAt)}` : s.dispatchedAt ? `dispatched ${formatDate(s.dispatchedAt)}` : ""}</span></li>)}
        </ul>
      ) : null}
    </section>
  );
}
