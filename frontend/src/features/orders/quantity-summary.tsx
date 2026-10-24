import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

/** Ordered vs allocated variants vs difference. The server validates at confirmation; this is only an editing aid. */
export function QuantitySummary({ orderQuantity, variantTotal, label = "Variant total" }: { orderQuantity: number; variantTotal: number; label?: string }) {
  const diff = orderQuantity - variantTotal;
  return (
    <dl data-testid="quantity-summary" className="grid grid-cols-3 gap-3 text-sm">
      <div className="rounded-md border p-2.5"><dt className="text-xs text-muted-foreground">Order quantity</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatNumber(orderQuantity)}</dd></div>
      <div className="rounded-md border p-2.5"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatNumber(variantTotal)}</dd></div>
      <div className={cn("rounded-md border p-2.5", diff !== 0 && "border-tone-warning-dot bg-tone-warning-bg")}>
        <dt className="text-xs text-muted-foreground">{diff > 0 ? "Remaining" : diff < 0 ? "Over by" : "Difference"}</dt>
        <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatNumber(Math.abs(diff))}</dd>
      </div>
    </dl>
  );
}
