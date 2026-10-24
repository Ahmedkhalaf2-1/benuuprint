"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/data-display/status-badge";

import type { OrderDetail } from "@/features/orders/types";
import { getActive } from "@/i18n/active";
import { useI18n } from "@/i18n/provider";
import type { Translator } from "@/i18n/translate";

/** Pure: the headline readiness label, from backend numbers only (no second state machine). */
export function fulfillmentHeadline(o: Pick<OrderDetail, "status" | "totalQuantity" | "fulfillment" | "productionSummary">, t: Translator = getActive().t): { label: string; tone: "ready" | "success" | "progress" | "neutral" } {
  const f = o.fulfillment;
  if (f.remainingDeliveryQuantity === 0 && f.deliveredQuantity > 0) return { label: t("fulfillment.headlineFullyDelivered"), tone: "success" };
  if (f.shippableQuantity > 0) return { label: t("fulfillment.headlineReadyToShip", { n: f.shippableQuantity }), tone: "ready" };
  if (f.inFlightQuantity > 0) return { label: t("fulfillment.headlineOnTheirWay", { n: f.inFlightQuantity }), tone: "progress" };
  if (f.deliveredQuantity > 0) return { label: t("fulfillment.headlinePartiallyDelivered", { n: f.remainingDeliveryQuantity }), tone: "progress" };
  return { label: f.packagingComplete ? t("fulfillment.headlinePackaged") : t("fulfillment.headlineNotReady"), tone: "neutral" };
}

/** Overview card: every number comes from the backend (`fulfillment`, `productionSummary`, `shipments`); nothing is recomputed. */
export function FulfillmentCard({ order, showShipments }: { order: OrderDetail; showShipments: boolean }) {
  const { t, fmt } = useI18n();
  const f = order.fulfillment;
  const head = fulfillmentHeadline(order, t);
  const cells: Array<[string, number | string]> = [
    [t.text("Ordered"), order.totalQuantity],
    [t.text("Produced"), order.productionSummary.completedQuantity],
    [t.text("Packed"), f.packedQuantity],
    [t.text("Ready to ship"), f.shippableQuantity],
    [t.text("On their way"), f.inFlightQuantity],
    [t.text("Delivered"), f.deliveredQuantity],
    [t.text("Remaining to deliver"), f.remainingDeliveryQuantity],
  ];
  return (
    <section aria-labelledby="fu-t" className="rounded-lg border bg-surface p-4" data-testid="fulfillment-card">
      <h2 id="fu-t" className="mb-1 text-sm font-semibold">{t("fulfillment.fulfillment")}</h2>
      <p className="mb-3 text-sm" data-testid="fulfillment-headline" data-tone={head.tone}>{head.label}</p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {cells.map(([l, v]) => <div key={l} className="rounded-md border p-2"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-lg font-semibold tabular-nums">{typeof v === "number" ? fmt.number(v) : v}</dd></div>)}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">{t("fulfillment.packaging")}{" "}{!f.packagingDefined ? t("fulfillment.specificationNotDefined") : f.packagingComplete ? t("fulfillment.complete") : t("fulfillment.inProgress")}{" "}{t("fulfillment.customerTracking")}{" "}{f.trackingEnabled ? t("fulfillment.enabled") : t("fulfillment.off")}</p>
      {showShipments && order.shipments?.length ? (
        <ul className="mt-3 divide-y rounded-md border text-sm" aria-label={t("fulfillment.shipmentsSummary")}>
          {order.shipments.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-x-3 px-3 py-1.5"><Link href={`/orders/${order.id}?tab=shipments`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{s.shipmentNumber}</Link><StatusBadge status={s.status} /><span className="tabular-nums">{t("fulfillment.quantityUnits", { quantity: s.quantity })}</span><span className="text-xs text-muted-foreground">{s.deliveredAt ? t("fulfillment.deliveredDeliveredat2", { deliveredAt: fmt.date(s.deliveredAt) }) : s.dispatchedAt ? t("fulfillment.dispatchedDispatchedat", { dispatchedAt: fmt.date(s.dispatchedAt) }) : ""}</span></li>)}
        </ul>
      ) : null}
    </section>
  );
}
