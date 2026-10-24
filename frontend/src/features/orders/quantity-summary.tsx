"use client";

import { cn } from "@/lib/utils/cn";

import { useI18n } from "@/i18n/provider";

/** Ordered vs allocated variants vs difference. The server validates at confirmation; this is only an editing aid. */
export function QuantitySummary({ orderQuantity, variantTotal, label = "Variant total" }: { orderQuantity: number; variantTotal: number; label?: string }) {
  const { t, fmt } = useI18n();
  const diff = orderQuantity - variantTotal;
  return (
    <dl data-testid="quantity-summary" className="grid grid-cols-3 gap-3 text-sm">
      <div className="rounded-md border p-2.5"><dt className="text-xs text-muted-foreground">{t("orders.orderQuantity")}</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums">{fmt.number(orderQuantity)}</dd></div>
      <div className="rounded-md border p-2.5"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums">{fmt.number(variantTotal)}</dd></div>
      <div className={cn("rounded-md border p-2.5", diff !== 0 && "border-tone-warning-dot bg-tone-warning-bg")}>
        <dt className="text-xs text-muted-foreground">{diff > 0 ? t("orders.remaining") : diff < 0 ? t("orders.overBy") : t("orders.difference")}</dt>
        <dd className="mt-0.5 text-lg font-semibold tabular-nums">{fmt.number(Math.abs(diff))}</dd>
      </div>
    </dl>
  );
}
