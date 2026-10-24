"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { isApiError } from "@/lib/api/errors";
import type { ProcessKind } from "./api";
import { useProcesses } from "./hooks";
import { ProcessView } from "./process";

/**
 * "Production Journey": where the work is, who has it, what finished and what is next. Staff only. A role without access (403)
 * or a request that fails quietly shows nothing, so the existing production summary below is never hidden by it.
 */
export function ProcessPanel({ kind, id, assignHref }: { kind: ProcessKind; id: string; assignHref?: string | null }) {
  const { can } = useAuth();
  const q = useProcesses(kind, id, can("responsibilities.read") || can("jobs.read_all"));
  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? null : <p role="status" className="rounded-md bg-surface-muted px-3 py-2 text-sm text-muted-foreground" data-testid="process-error">The production journey could not be loaded.</p>;
  const list = q.data ?? [];
  if (list.length === 0) return null;
  return (
    <Card aria-labelledby={`journey-${id}`} data-testid="production-journey">
      <CardHeader><CardTitle><span id={`journey-${id}`}>Production journey</span></CardTitle></CardHeader>
      <CardContent className="space-y-8">{list.map((p, i) => <ProcessView key={p.jobId ?? i} process={p} assignHref={assignHref} />)}</CardContent>
    </Card>
  );
}
