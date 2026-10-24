"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { InfoGrid, InfoItem } from "@/components/layout/detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { FactoryJobDialog } from "@/features/orders/batches-panel";
import { formatDateTime } from "@/lib/utils/format";
import * as api from "./api";
import { useProductionSpecs, useSampleJobs } from "./hooks";
import { SPEC_KIND_LABELS } from "./labels";
import type { ProductionSpec, SampleDetail } from "./types";

/** Frozen specification snapshots are immutable: no edit controls, only a read-only view. */
function SpecCard({ spec }: { spec: ProductionSpec }) {
  const kind = SPEC_KIND_LABELS[spec.kind] ?? { label: spec.kind, description: "" };
  return (
    <Card data-testid="production-spec" data-kind={spec.kind} aria-label={`${kind.label} specification, revision ${spec.revision}`}>
      <CardHeader>
        <CardTitle>{kind.label} <span className="font-normal text-muted-foreground">· revision {spec.revision}</span></CardTitle>
        <Badge variant="outline"><Lock aria-hidden className="size-3" /> Frozen — read only</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{kind.description}</p>
        <InfoGrid>
          <InfoItem label="Frozen">{formatDateTime(spec.createdAt)}</InfoItem>
          <InfoItem label="Source">{spec.kind === "APPROVED_REFERENCE" ? (spec.sourceFactoryJobId ? "Sample production job" : "Customer approval") : "Frozen when production was created"}</InfoItem>
          <InfoItem label="Fingerprint"><span className="font-mono text-xs">{spec.specHash.slice(0, 16)}…</span></InfoItem>
        </InfoGrid>
        <details className="rounded-md border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">View frozen snapshot</summary>
          <pre tabIndex={0} aria-label="Frozen snapshot (read only)" className="max-h-72 overflow-auto border-t bg-surface-muted p-3 text-xs">{JSON.stringify(spec.snapshot, null, 2)}</pre>
        </details>
      </CardContent>
    </Card>
  );
}

export function ProductionPanel({ sample, canSeeJobs }: { sample: SampleDetail; canSeeJobs: boolean }) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const specs = useProductionSpecs(sample.id);
  const jobs = useSampleJobs(sample.sampleNumber, canSeeJobs);
  const ordered = [...(specs.data ?? [])].sort((a, b) => b.revision - a.revision || (a.kind === "APPROVED_REFERENCE" ? -1 : 1));
  return (
    <div className="space-y-4">
      {canSeeJobs ? (
        <Card aria-labelledby="job-title">
          <CardHeader><CardTitle><span id="job-title">Sample production</span></CardTitle>{sample.status === "READY_FOR_PRODUCTION" && can("factory_jobs.manage") && (jobs.data ?? []).filter((j) => j.status !== "CANCELLED").length === 0 && !jobs.isLoading ? <Button size="sm" onClick={() => setCreating(true)}>Create production job</Button> : null}</CardHeader>
          {jobs.isLoading ? <CardContent><Skeleton className="h-10" /></CardContent> : jobs.error ? <ErrorState error={jobs.error} onRetry={() => jobs.refetch()} className="py-6" /> : jobs.data && jobs.data.length > 0 ? (
            <ul className="divide-y" data-testid="sample-jobs">
              {jobs.data.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <span className="font-mono text-xs font-semibold">{j.jobNumber}</span>
                  <StatusBadge status={j.status} />
                  <span className="text-xs text-muted-foreground">{j.startedAt ? `Started ${formatDateTime(j.startedAt)}` : "Not started"}{j.completedAt ? ` · Completed ${formatDateTime(j.completedAt)}` : ""}</span>
                  <Button asChild size="sm" variant="secondary" className="ms-auto"><Link href={`/production/jobs/${j.id}`}>Open job</Link></Button>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No production job yet" description="A sample-production job appears here once the sample is paid and production is created." className="py-8" />}
        </Card>
      ) : null}
      {creating ? <FactoryJobDialog title={`Create production job for ${sample.sampleNumber}`} create={(body) => api.createSampleJob(sample.id, body)} onClose={() => setCreating(false)} onCreated={() => { void qc.invalidateQueries({ queryKey: ["samples"] }); void qc.invalidateQueries({ queryKey: ["production"] }); }} /> : null}
      {specs.isLoading ? <Skeleton className="h-32" /> : specs.error ? <ErrorState error={specs.error} onRetry={() => specs.refetch()} /> : ordered.length === 0 ? (
        <Card><EmptyState title="No frozen specification yet" description="A pre-production specification is frozen when production starts; the approved reference is frozen when the customer approves the physical sample." /></Card>
      ) : ordered.map((s) => <SpecCard key={s.id} spec={s} />)}
      {sample.revisionOfId ? <p className="text-xs text-muted-foreground">This is revision {sample.revisionNumber} of an earlier sample: <Link className="text-brand hover:underline" href={`/samples/${sample.revisionOfId}`}>open the previous revision</Link>.</p> : null}
    </div>
  );
}
