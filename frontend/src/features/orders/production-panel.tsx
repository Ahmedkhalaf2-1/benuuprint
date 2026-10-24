"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, EmptyState, ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { isApiError } from "@/lib/api/errors";
import { formatDate, formatNumber } from "@/lib/utils/format";
import * as api from "./api";
import { FactoryJobDialog, jobHref } from "./batches-panel";
import { useProductionSummary } from "./hooks";
import { JOB_SOURCE_LABELS } from "./labels";
import type { OrderDetail, StageProgress } from "./types";

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warning" }) {
  return <div className="rounded-md border p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`mt-1 text-xl font-semibold tabular-nums ${tone === "danger" && value > 0 ? "text-danger" : tone === "warning" && value > 0 ? "text-tone-warning-fg" : ""}`}>{formatNumber(value)}</dd></div>;
}
const stageText = (s: StageProgress) => `${s.stageName}${s.required != null ? ` (${s.accounted ?? 0}/${s.required})` : ""}`;

/** Read-only bulk production overview from GET /admin/orders/:id/production-summary. All numbers are the server's. */
export function ProductionPanel({ order }: { order: OrderDetail }) {
  const { can } = useAuth();
  const q = useProductionSummary(order.id);
  const [creating, setCreating] = useState(false);
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title="Production details are not available to your role" className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const s = q.data;
  if (!s) return null;
  const canWholeJob = can("factory_jobs.manage") && order.status === "READY_FOR_PRODUCTION" && order.batches.filter((b) => b.status !== "CANCELLED").length === 0 && !order.factoryJobs.some((j) => j.status !== "CANCELLED");

  return (
    <div className="space-y-4" data-testid="production-summary">
      <Card aria-labelledby="prod-title">
        <CardHeader><CardTitle><span id="prod-title">Bulk production</span></CardTitle>{s.isPastTargetDate ? <span className="text-xs font-medium text-tone-danger-fg">Past target delivery date</span> : s.targetDeliveryDate ? <span className="text-xs text-muted-foreground">Target {formatDate(s.targetDeliveryDate)}</span> : null}</CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1 flex justify-between text-sm"><span className="font-medium">Progress</span><span className="tabular-nums">{s.progressPercent}%</span></p>
            <Progress value={s.progressPercent} label="Production progress" />
            <p className="mt-1 text-xs text-muted-foreground">Units through the final stage ÷ units that can still be delivered (not an average of stage percentages).</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Planned" value={s.totalQuantity} /><Stat label="Completed" value={s.completedQuantity} /><Stat label="Remaining" value={s.remainingQuantity} />
            <Stat label="Rework (open)" value={s.reworkQuantity} tone="warning" /><Stat label="Rejected" value={s.rejectedQuantity} tone="danger" />
          </dl>
          {s.reworkFlaggedQuantity > 0 ? <p className="text-xs text-muted-foreground">{s.reworkFlaggedQuantity} units were flagged for rework in stage reports.</p> : null}
          {s.currentStage ? <p className="text-sm">Current stage: <span className="font-medium">{stageText(s.currentStage)}</span></p> : null}
          {(s.blockedStages.length > 0 || s.delayedStages.length > 0 || s.activeStages.length > 0) ? (
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Active stages</p>{s.activeStages.length ? s.activeStages.map((x) => <p key={x.stageCode}>{stageText(x)}</p>) : <p className="text-muted-foreground">None</p>}</div>
              <div><p className="text-xs text-muted-foreground">Blocked stages</p>{s.blockedStages.length ? s.blockedStages.map((x) => <p key={x.stageCode} className="font-medium text-tone-blocked-fg">{stageText(x)}</p>) : <p className="text-muted-foreground">None</p>}</div>
              <div><p className="text-xs text-muted-foreground">Delayed stages</p>{s.delayedStages.length ? s.delayedStages.map((x) => <p key={x.stageCode} className="font-medium text-tone-danger-fg">{stageText(x)}</p>) : <p className="text-muted-foreground">None</p>}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card aria-labelledby="jobs-title">
        <CardHeader><CardTitle><span id="jobs-title">Factory jobs</span></CardTitle>{canWholeJob ? <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>Create whole-order job</Button> : null}</CardHeader>
        {s.jobs.length === 0 ? <EmptyState title="No factory jobs yet" description={order.status === "READY_FOR_PRODUCTION" ? "Create one job for the whole order, or plan batches and create a job per batch." : "Jobs can be created once the order is released for production."} className="py-8" /> : (
          <ul className="divide-y" data-testid="jobs">
            {s.jobs.map((j) => (
              <li key={j.jobId} className="space-y-1 px-4 py-3 text-sm">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={jobHref(j.jobId)} className="font-mono text-xs font-semibold text-brand hover:underline">{j.jobNumber}</Link>
                  <StatusBadge status={j.status} />
                  <span className="text-xs text-muted-foreground">{j.batchNumber ? `Batch ${j.batchNumber}` : JOB_SOURCE_LABELS.BULK_ORDER}</span>
                  <span className="tabular-nums">{j.completedQuantity}/{j.plannedQuantity ?? "?"} completed{j.rejectedQuantity ? ` · ${j.rejectedQuantity} rejected` : ""}</span>
                </p>
                {j.currentStage ? <p className="text-xs text-muted-foreground">Current stage: {stageText(j.currentStage)}</p> : null}
              </li>
            ))}
          </ul>
        )}
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">Jobs are operated in the Production area (coming in a later phase).</p>
      </Card>
      {creating ? <FactoryJobDialog orderId={order.id} title="Create factory job for the whole order" create={(body) => api.createOrderJob(order.id, body)} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
