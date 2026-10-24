"use client";

import Link from "next/link";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { ResponsibilityOverviewItem } from "./types";

/**
 * A compact view of one worker from what the backend returns: the areas where they are the effective owner and the open work they
 * hold there. Customer counts and override counts are not part of any endpoint, so they are not shown.
 */
export function WorkerDrilldown({ worker, areas, onClose }: { worker: { id: string; name: string }; areas: ResponsibilityOverviewItem[]; onClose: () => void }) {
  const mine = areas.filter((a) => a.effectiveUser?.id === worker.id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={worker.name} description="Factory areas this person owns by default.">
        <div className="space-y-3" data-testid="worker-drilldown">
          {mine.length === 0 ? <p className="text-sm text-muted-foreground">Not the default owner of any area.</p> : (
            <ul className="divide-y rounded-md border">{mine.map((a) => <li key={a.stageKey} className="flex items-center justify-between px-3 py-2 text-sm"><span className="font-medium">{a.label}</span><span className="tabular-nums text-muted-foreground">{a.activeWork} {a.stageKey === "DELIVERY" ? "live shipments" : "active stages"}</span></li>)}</ul>
          )}
          {mine[0] ? <Link href={`/customers?area=${encodeURIComponent(mine[0].stageKey)}&responsible=${encodeURIComponent(worker.id)}`} className="text-sm font-semibold text-brand hover:underline">View customers for {mine[0].label}</Link> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
