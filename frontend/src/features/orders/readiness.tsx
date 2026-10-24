"use client";

import { AlertTriangle, Check, Circle } from "lucide-react";
import { useCommercialSummary } from "@/features/commercial/hooks";
import { useAuth } from "@/features/auth/auth-provider";
import type { OrderDetail } from "./types";
import { useI18n } from "@/i18n/provider";

const PAST_RELEASE = ["READY_FOR_PRODUCTION", "IN_PRODUCTION", "PARTIALLY_COMPLETED", "PRODUCTION_COMPLETED", "READY_FOR_PACKAGING", "PACKAGING", "READY_FOR_DELIVERY", "PARTIALLY_SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"];

export interface ReadinessItem { label: string; ok: boolean; detail?: string }

/** Pure: the production-readiness checklist. The backend stays authoritative (releasing re-checks everything). */
export function readinessItems(o: Pick<OrderDetail, "status" | "currentSpec" | "items">, c: { reapprovalRequired?: boolean; quotationStatus?: string | null; releaseGate?: { satisfied: boolean; reasons: string[] } } | null | undefined): ReadinessItem[] {
  const out: ReadinessItem[] = [
    { label: "Approved reference pinned", ok: true },
    { label: "Quantities add up", ok: o.items.length > 0 && o.items.every((i) => i.quantity === i.variantTotal), detail: o.items.some((i) => i.quantity !== i.variantTotal) ? "An item's variants do not add up to its quantity." : undefined },
    { label: "Order specification frozen", ok: !!o.currentSpec, detail: o.currentSpec ? undefined : "Frozen when the order is confirmed." },
  ];
  if (c) {
    out.push({ label: "Commercial terms approved", ok: c.quotationStatus === "ACCEPTED" && !c.reapprovalRequired, detail: c.reapprovalRequired ? "Commercial terms require re-approval." : c.quotationStatus === "ACCEPTED" ? undefined : "No accepted quotation." });
    if (c.releaseGate) out.push({ label: "Payment gate", ok: c.releaseGate.satisfied, detail: c.releaseGate.satisfied ? undefined : c.releaseGate.reasons.join("; ") });
  }
  return out;
}

/** Top-of-order banner: shown whenever a revision ended the accepted quotation. Trusts the backend flag; never recomputes the classifier. */
export function ReapprovalBanner({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const q = useCommercialSummary({ kind: "order", id: orderId }, can("orders.commercial.read"));
  if (!q.data?.reapprovalRequired) return null;
  return <p role="alert" data-testid="reapproval-banner" className="mb-4 flex items-center gap-2 rounded-md bg-tone-danger-bg px-3 py-2 text-sm font-medium text-tone-danger-fg"><AlertTriangle aria-hidden className="size-4 shrink-0" />{" "}{t("orders.commercialTermsRequireReApprovalThe")}</p>;
}

export function ReadinessCard({ order }: { order: OrderDetail }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const q = useCommercialSummary({ kind: "order", id: order.id }, can("orders.commercial.read"));
  const items = readinessItems(order, q.data);
  const released = PAST_RELEASE.includes(order.status);
  return (
    <section aria-labelledby="rd-t" className="rounded-lg border bg-surface p-4" data-testid="readiness">
      <h2 id="rd-t" className="mb-2 text-sm font-semibold">{t("orders.productionReadiness")}{" "}{released ? <span className="ms-2 text-xs font-normal text-tone-success-fg">{t("orders.released")}</span> : null}</h2>
      <ul className="space-y-1 text-sm">
        {items.map((i) => <li key={i.label} className="flex items-start gap-2" data-ok={i.ok}>{i.ok ? <Check aria-hidden className="mt-0.5 size-4 text-tone-success-fg" /> : <Circle aria-hidden className="mt-0.5 size-4 text-muted-foreground" />}<span>{t.text(i.label)}{i.detail ? <span className="block text-xs text-muted-foreground">{t.text(i.detail)}</span> : null}</span></li>)}
      </ul>
      {!can("orders.commercial.read") ? <p className="mt-2 text-xs text-muted-foreground">{t("orders.commercialAndPaymentConditionsAreNot")}</p> : null}
    </section>
  );
}
