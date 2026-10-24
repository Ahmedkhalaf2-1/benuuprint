"use client";

import { Lock } from "lucide-react";
import { ColorSwatch } from "@/components/data-display/color-swatch";
import { AccessDeniedState, EmptyState, ErrorState } from "@/components/feedback/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { useOrderSpecs } from "./hooks";
import type { OrderSpec } from "./types";

/**
 * The frozen order production specification(s): one per confirmed revision, newest first. Read only — there is deliberately no edit
 * control; a change is a revision, which freezes a NEW spec and keeps the old ones as history.
 */
export function SpecPanel({ orderId, confirmed }: { orderId: string; confirmed: boolean }) {
  const q = useOrderSpecs(orderId);
  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title="The production specification is not available to your role" className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const specs = [...(q.data ?? [])].sort((a, b) => b.revision - a.revision);
  if (!specs.length) return <EmptyState title="Not frozen yet" description={confirmed ? "No specification was returned." : "The order specification is frozen when the order is confirmed."} />;
  return (
    <div className="space-y-4" data-testid="spec-panel">
      {specs.map((s, i) => <SpecCard key={s.id} spec={s} current={i === 0} />)}
    </div>
  );
}

function SpecCard({ spec, current }: { spec: OrderSpec; current: boolean }) {
  const sn = spec.snapshot;
  return (
    <Card aria-labelledby={`spec-${spec.id}`} data-testid="spec-card" data-current={current}>
      <CardHeader>
        <CardTitle><span id={`spec-${spec.id}`}>Specification revision {spec.revision}{current ? " (current)" : " (superseded)"}</span></CardTitle>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock aria-hidden className="size-3" /> Frozen — read only</span>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">Frozen {formatDateTime(spec.createdAt)} · fingerprint <span className="font-mono text-xs">{spec.specHash.slice(0, 16)}…</span> · {formatNumber(spec.totalQuantity)} units{sn.order.targetDeliveryDate ? ` · target ${formatDate(sn.order.targetDeliveryDate)}` : ""}</p>
        <p>Source: approved reference <strong>revision {sn.reference.revision}</strong> of <span className="font-mono text-xs font-semibold">{sn.reference.sampleNumber}</span>{sn.reference.sourceFactoryJobNumber ? <> (built by job {sn.reference.sourceFactoryJobNumber})</> : null}.</p>
        {sn.items.map((it) => (
          <div key={it.itemId} className="space-y-1">
            <p className="font-medium">{it.productName} — {formatNumber(it.quantity)} units</p>
            <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {it.variants.map((v) => (
                <li key={v.variantId} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">{v.color ? <ColorSwatch name={v.color.name} hex={v.color.hex} size="sm" showLabel={false} /> : null}{[v.color?.name, v.size?.name].filter(Boolean).join(" / ") || "Variant"}</span>
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
