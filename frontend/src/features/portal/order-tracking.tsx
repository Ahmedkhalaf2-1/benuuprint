"use client";

import { ProgressRail } from "@/components/data-display/progress-rail";
import { cn } from "@/lib/utils/cn";
import { ErrorState } from "@/components/feedback/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { useOrderActivity, useOrderProduction, useOrderShipments } from "./hooks";
import type { OrderProduction, PortalShipment, PortalShipments } from "./types";
import { useI18n } from "@/i18n/provider";
import { getActive, localizedMap } from "@/i18n/active";

const PACKAGING_LABEL: Record<OrderProduction["packaging"], string> = localizedMap({ NOT_STARTED: "Not started", IN_PACKAGING: "Packaging", READY_FOR_SHIPMENT: "Ready for shipment" });
const SHIPMENT_LABEL: Record<PortalShipment["status"], string> = localizedMap({ PREPARING: "Preparing", ON_THE_WAY: "On the way", DELIVERED: "Delivered", DELIVERY_ATTEMPT_FAILED: "Delivery being rearranged", RETURNED: "Returned" });

/** The backend's coarse steps exactly as returned: no batches, jobs, stages or staff exist in this payload. */
export function OrderTracker({ production }: { production: OrderProduction }) {
  const { t, fmt } = useI18n();
  const eta = production.eta;
  return (
    <div className="space-y-4" data-testid="order-production" data-phase={production.phase}>
      {typeof production.progressPercent === "number" ? <div className="space-y-1"><div className="flex justify-between text-sm"><span className="font-medium">{t("common.progress")}</span><span data-testid="progress-percent">{production.progressPercent}%</span></div><Progress value={production.progressPercent} label={t("common.productionProgress")} /></div> : null}
      <ProgressRail steps={production.steps} label={t("common.productionProgress")} testId="production-tracker" />
      <p className="text-sm" data-testid="packaging"><span className="font-medium">{t("customer.packaging")}{" "}</span>{t.text(PACKAGING_LABEL[production.packaging])}</p>
      {eta ? <p className="text-sm" data-testid="eta"><span className="font-medium">{eta.confidence === "APPROXIMATE" ? t("customer.approximateCompletion") : t("customer.estimatedCompletion")}</span>{fmt.date(eta.estimatedCompletion)}{eta.note ? <span className="block text-muted-foreground">{eta.note}</span> : null}</p> : null}
    </div>
  );
}

export function OrderProductionCard({ id, enabled = true }: { id: string; enabled?: boolean }) {
  const { t } = useI18n();
  const q = useOrderProduction(id, enabled);
  return (
    <Card><CardHeader><CardTitle>{t("common.production")}</CardTitle></CardHeader><CardContent>
      {q.isLoading ? <p className="text-sm text-muted-foreground" role="status">{t("common.loading")}</p> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-4" /> : q.data ? (q.data.phase === "NOT_STARTED" ? <p className="text-sm text-muted-foreground">{t("customer.productionHasNotStartedYet")}</p> : <OrderTracker production={q.data} />) : null}
    </CardContent></Card>
  );
}

const FLOW = ["Preparing", "On the way", "Delivered"] as const;
const FLOW_INDEX: Partial<Record<PortalShipment["status"], number>> = { PREPARING: 0, ON_THE_WAY: 1, DELIVERED: 2, DELIVERY_ATTEMPT_FAILED: 1 };
/** Three-step shipment line (Preparing / On the way / Delivered). Presentation of the status the backend already returned. */
function ShipmentFlow({ status }: { status: PortalShipment["status"] }) {
  const idx = FLOW_INDEX[status];
  if (idx === undefined) return null;
  const warn = status === "DELIVERY_ATTEMPT_FAILED";
  return (
    <ol aria-hidden className="mt-3 grid grid-cols-3 gap-1.5" data-testid="shipment-flow">
      {FLOW.map((l, i) => (
        <li key={l}>
          <span className={cn("block h-0.5 transition-colors", i <= idx ? (warn && i === idx ? "bg-tone-warning-dot" : "bg-brand") : "bg-border")} />
          <span className={cn("mt-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.1em]", i <= idx ? "text-foreground" : "text-muted-foreground")}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

/** "15 of 30 units shipped, 15 remaining" */
export function shipmentSummaryText(s: PortalShipments["summary"]): string {
  if (s.deliveredUnits >= s.totalUnits && s.totalUnits > 0) return getActive().t("customer.allUnitsDelivered", { n: s.totalUnits });
  if (s.shippedUnits === 0) return getActive().t("customer.unitsNotShipped", { n: s.totalUnits });
  return getActive().t("customer.unitsShippedRemaining", { shipped: s.shippedUnits, total: s.totalUnits, remaining: s.remainingUnits });
}
const destination = (d: PortalShipment["destination"]) => (typeof d === "string" ? d : d ? [d.city, d.country].filter(Boolean).join(", ") : "");

export function ShipmentsView({ id, enabled = true }: { id: string; enabled?: boolean }) {
  const { t, fmt } = useI18n();
  const q = useOrderShipments(id, enabled);
  return (
    <Card><CardHeader><CardTitle>{t("common.shipments")}</CardTitle></CardHeader><CardContent className="space-y-4">
      {q.isLoading ? <p className="text-sm text-muted-foreground" role="status">{t("common.loading")}</p> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-4" /> : q.data ? (
        <>
          <p className="text-sm font-medium" data-testid="shipment-summary" data-partial={q.data.summary.partiallyShipped}>{shipmentSummaryText(q.data.summary)}</p>
          {q.data.shipments.length === 0 ? <p className="text-sm text-muted-foreground">{t("customer.nothingHasShippedYet")}</p> : (
            <ul className="divide-y rounded-md border" data-testid="shipments">{q.data.shipments.map((s) => (
              <li key={s.id} className="space-y-1 px-4 py-3 text-sm" data-testid="shipment" data-status={s.status}>
                <div className="flex flex-wrap items-center gap-x-3"><span className="font-mono text-xs font-semibold">{s.shipmentNumber}</span><span className="font-medium">{SHIPMENT_LABEL[s.status] ?? s.status}</span><span className="text-muted-foreground">{t("common.quantityUnits", { quantity: s.quantity })}</span></div>
                {destination(s.destination) ? <p className="text-muted-foreground">{t("customer.toDestination", { destination: destination(s.destination) })}</p> : null}
                <ShipmentFlow status={s.status} />
                <p className="text-xs text-muted-foreground">{s.dispatchedAt ? t("customer.dispatchedDispatchedat", { dispatchedAt: fmt.date(s.dispatchedAt) }) : s.scheduledAt ? t("customer.scheduledScheduledat", { scheduledAt: fmt.date(s.scheduledAt) }) : t("customer.beingPrepared")}{s.deliveredAt ? t("customer.deliveredDeliveredat2", { deliveredAt: fmt.date(s.deliveredAt) }) : ""}</p>
                {s.courierName || s.trackingNumber ? <p className="text-xs text-muted-foreground">{[s.courierName, s.trackingNumber && t("customer.trackingNumberLabel", { number: s.trackingNumber })].filter(Boolean).join(" · ")}{s.trackingUrl ? <> · <a className="text-brand hover:underline" href={s.trackingUrl} target="_blank" rel="noopener noreferrer">{t("customer.track")}</a></> : null}</p> : null}
              </li>))}</ul>)}
        </>) : null}
    </CardContent></Card>
  );
}

export function OrderActivityView({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const act = useOrderActivity(id);
  return (
    <Card><CardHeader><CardTitle>{t("customer.activity")}</CardTitle></CardHeader><CardContent>
      {act.isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : act.error ? <ErrorState error={act.error} onRetry={() => act.refetch()} className="py-4" /> : act.data && act.data.length ? (
        <ol className="space-y-4 border-s ps-5" data-testid="timeline">{[...act.data].reverse().map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative"><span aria-hidden className="absolute -start-[1.65rem] top-1.5 size-2.5 rounded-full bg-brand" /><p className="text-sm font-medium">{e.title}</p>{e.message ? <p className="text-sm text-muted-foreground">{e.message}</p> : null}<p className="text-xs text-muted-foreground">{fmt.dateTime(e.at)}</p></li>))}</ol>
      ) : <p className="text-sm text-muted-foreground">{t("customer.nothingYet")}</p>}
    </CardContent></Card>
  );
}
