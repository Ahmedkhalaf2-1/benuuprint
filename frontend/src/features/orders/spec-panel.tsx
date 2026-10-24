"use client";

import { Lock } from "lucide-react";
import { ColorSwatch } from "@/components/data-display/color-swatch";
import { AccessDeniedState, EmptyState, ErrorState } from "@/components/feedback/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api/errors";

import { useOrderSpecs } from "./hooks";
import type { OrderSpec } from "./types";
import { useI18n } from "@/i18n/provider";

/**
 * The frozen order production specification(s): one per confirmed revision, newest first. Read only — there is deliberately no edit
 * control; a change is a revision, which freezes a NEW spec and keeps the old ones as history.
 */
export function SpecPanel({ orderId, confirmed }: { orderId: string; confirmed: boolean }) {
  const { t } = useI18n();
  const q = useOrderSpecs(orderId);
  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title={t("orders.theProductionSpecificationIsNotAvailable")} className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const specs = [...(q.data ?? [])].sort((a, b) => b.revision - a.revision);
  if (!specs.length) return <EmptyState title={t("orders.notFrozenYet")} description={confirmed ? t("orders.noSpecificationWasReturned") : t("orders.theOrderSpecificationIsFrozenWhen")} />;
  return (
    <div className="space-y-4" data-testid="spec-panel">
      {specs.map((s, i) => <SpecCard key={s.id} spec={s} current={i === 0} />)}
    </div>
  );
}

function SpecCard({ spec, current }: { spec: OrderSpec; current: boolean }) {
  const { t, fmt } = useI18n();
  const sn = spec.snapshot;
  return (
    <Card aria-labelledby={`spec-${spec.id}`} data-testid="spec-card" data-current={current}>
      <CardHeader>
        <CardTitle><span id={`spec-${spec.id}`}>{t("orders.specificationRevisionRevision", { revision: spec.revision })}{current ? t("orders.current") : t("orders.superseded")}</span></CardTitle>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock aria-hidden className="size-3" />{" "}{t("orders.frozenReadOnly")}</span>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{t("orders.frozenCreatedatFingerprint2", { createdAt: fmt.dateTime(spec.createdAt) })}{" "}<span className="font-mono text-xs">{spec.specHash.slice(0, 16)}…</span>{" "}{t("orders.totalquantityUnits", { totalQuantity: fmt.number(spec.totalQuantity) })}{sn.order.targetDeliveryDate ? t("orders.targetTargetdeliverydate2", { targetDeliveryDate: fmt.date(sn.order.targetDeliveryDate) }) : ""}</p>
        <p>{t("orders.sourceApprovedReference")}{" "}<strong>{t("orders.revisionRevision", { revision: sn.reference.revision })}</strong>{" "}{t("orders.of")}{" "}<span className="font-mono text-xs font-semibold">{sn.reference.sampleNumber}</span>{sn.reference.sourceFactoryJobNumber ? <>{" "}{t("orders.builtByJobSourcefactoryjobnumber", { sourceFactoryJobNumber: sn.reference.sourceFactoryJobNumber })}</> : null}.</p>
        {sn.items.map((it) => (
          <div key={it.itemId} className="space-y-1">
            <p className="font-medium">{t("orders.productnameQuantityUnits", { productName: it.productName, quantity: fmt.number(it.quantity) })}</p>
            <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {it.variants.map((v) => (
                <li key={v.variantId} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">{v.color ? <ColorSwatch name={v.color.name} hex={v.color.hex} size="sm" showLabel={false} /> : null}{[v.color?.name, v.size?.name].filter(Boolean).join(" / ") || t("orders.variant")}</span>
                  <span className="tabular-nums">{v.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
