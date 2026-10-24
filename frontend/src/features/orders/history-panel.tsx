"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useOrderActivities, useOrderRevisions } from "./hooks";
import { activityLabel } from "./labels";
import { useI18n } from "@/i18n/provider";

/** Operational order timeline (not the security audit log) and the revision history with its commercial impact. */
export function HistoryPanel({ orderId }: { orderId: string }) {
  const { t, fmt } = useI18n();
  const revisions = useOrderRevisions(orderId);
  const activities = useOrderActivities(orderId);
  return (
    <div className="space-y-4">
      <Card aria-labelledby="rev-title">
        <CardHeader><CardTitle><span id="rev-title">{t("orders.revisions")}</span></CardTitle></CardHeader>
        {revisions.isLoading ? <Skeleton className="m-4 h-16" /> : revisions.error ? <ErrorState error={revisions.error} onRetry={() => revisions.refetch()} className="py-6" /> : revisions.data && revisions.data.length === 0 ? (
          <EmptyState title={t("orders.noRevisions")} description={t("orders.changesToAConfirmedOrderAre")} className="py-8" />
        ) : (
          <ol className="divide-y" data-testid="revisions">
            {[...(revisions.data ?? [])].sort((a, b) => b.revisionNumber - a.revisionNumber).map((r) => (
              <li key={r.id} data-impact={r.commercialImpact ? "true" : "false"} className="space-y-1 px-4 py-3 text-sm">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-semibold">{t("orders.revisionRevisionnumber", { revisionNumber: r.revisionNumber })}</span><span className="text-xs text-muted-foreground">{fmt.dateTime(r.createdAt)}</span>{r.commercialImpact ? <Badge variant="danger"><AlertTriangle aria-hidden className="size-3" />{" "}{t("orders.commercialImpact")}</Badge> : <Badge variant="outline">{t("orders.noCommercialImpact")}</Badge>}</p>
                <p>{r.reason}</p>
                {r.commercialImpact ? (
                  <div className="rounded-md bg-tone-danger-bg px-3 py-2 text-xs text-tone-danger-fg">
                    <p className="font-semibold">{t("orders.quotationsAcceptedBeforeThisRevisionNo")}</p>
                    {r.commercialChanges.length ? <ul className="mt-1 list-inside list-disc">{r.commercialChanges.map((c) => <li key={c}>{c}</li>)}</ul> : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card aria-labelledby="act-title">
        <CardHeader><CardTitle><span id="act-title">{t("orders.activity")}</span></CardTitle></CardHeader>
        {activities.isLoading ? <Skeleton className="m-4 h-24" /> : activities.error ? <ErrorState error={activities.error} onRetry={() => activities.refetch()} className="py-6" /> : (
          <ol className="divide-y" data-testid="activity">
            {activities.data?.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
                <span className="font-medium">{activityLabel(a.type)}</span>
                <span className="text-xs text-muted-foreground">{fmt.dateTime(a.createdAt)}{a.actorName ? ` · ${a.actorName}` : ""}</span>
                {a.message && a.message !== activityLabel(a.type) ? <span className="basis-full text-xs text-muted-foreground">{a.message}</span> : null}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
