"use client";

import { AlertTriangle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import { useMyJobs, useMyStages, useStaffStage } from "./hooks";
import { StageDrawer } from "./stage-drawer";
import type { StaffStageListItem } from "./types";
import { useI18n } from "@/i18n/provider";

const GROUPS: Array<{ key: string; title: string; match: (s: StaffStageListItem) => boolean }> = [
  { key: "overdue", title: "Overdue", match: (s) => s.isDelayed && s.status !== "BLOCKED" },
  { key: "blocked", title: "Blocked", match: (s) => s.status === "BLOCKED" },
  { key: "progress", title: "In progress", match: (s) => s.status === "IN_PROGRESS" && !s.isDelayed },
  { key: "ready", title: "Ready to start", match: (s) => s.status === "READY" && !s.isDelayed },
];

function StageRow({ s, onOpen }: { s: StaffStageListItem; onOpen: () => void }) {
  const { t, fmt } = useI18n();
  return (
    <li>
      <button type="button" onClick={onOpen} data-testid="my-stage" data-status={s.status} className={cn("flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-surface px-3 py-2.5 text-start hover:bg-surface-muted", s.isDelayed && "border-s-4 border-s-danger")}>
        <span className="min-w-0 flex-1">
          <span className="font-medium">{s.stageName}{s.attempt > 1 ? <span className="ms-2 rounded-sm bg-tone-warning-bg px-1.5 text-xs text-tone-warning-fg">{t("production.reworkAttemptAttempt", { attempt: s.attempt })}</span> : null}</span>
          <span className="block text-xs text-muted-foreground"><span className="font-mono">{s.job.jobNumber}</span> · {s.job.productName} · {s.job.brandName}</span>
          {s.status === "IN_PROGRESS" && s.startedAt ? <span className="block text-xs text-muted-foreground">{t("production.startedStartedat", { startedAt: fmt.dateTime(s.startedAt) })}</span> : null}
          {s.status === "BLOCKED" && s.blockReason ? <span className="block text-xs font-medium text-tone-blocked-fg">{t("production.blockedBlockreason", { blockReason: s.blockReason })}</span> : null}
        </span>
        <PriorityBadge priority={s.job.priority} />
        {s.dueAt ? <span className={cn("inline-flex items-center gap-1 text-xs", s.isDelayed ? "font-medium text-tone-danger-fg" : "text-muted-foreground")}>{s.isDelayed ? <AlertTriangle aria-hidden className="size-3" /> : null}{s.isDelayed ? t("production.overdue2") : t("production.due")}{fmt.date(s.dueAt)}</span> : null}
        <StatusBadge status={s.status} />
      </button>
    </li>
  );
}

function StageFromId({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useStaffStage(id);
  if (!q.data) return null;
  return <StageDrawer stage={q.data.stage} jobId={q.data.stage.jobId} onClose={onClose} />;
}

/** The signed-in staff member's own work: only stages assigned to them (/staff/my-stages, /staff/my-jobs), never the whole board. */
export function MyWorkPage() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const tab = sp.get("tab") === "jobs" ? "jobs" : "stages";
  const stageId = sp.get("stage");
  const stages = useMyStages({ pageSize: 100 });
  const jobs = useMyJobs({ pageSize: 50 });
  const nav = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v); }
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const err = stages.error ?? jobs.error;
  if (err && isApiError(err) && err.kind === "forbidden") return <AccessDeniedState />;
  const list = stages.data?.data ?? [];
  const grouped = GROUPS.map((g) => ({ ...g, items: list.filter(g.match) }));
  const rest = list.filter((s) => !GROUPS.some((g) => g.match(s)));

  return (
    <>
      <PageHeader title={t("production.myWork")} description={t("production.stagesAssignedToYouOpenOne")} />
      <Tabs value={tab} onValueChange={(t) => nav({ tab: t === "stages" ? null : t })}>
        <TabsList className="mb-4" aria-label={t("production.myWorkSections")}><TabsTrigger value="stages">{t("production.myStages")}</TabsTrigger><TabsTrigger value="jobs">{t("production.myJobs")}</TabsTrigger></TabsList>
        <TabsContent value="stages" className="space-y-5">
          {stages.isLoading ? <PageSkeleton /> : stages.error ? <ErrorState error={stages.error} onRetry={() => stages.refetch()} /> : list.length === 0 ? <EmptyState title={t("production.nothingAssignedToYou")} description={t("production.whenAManagerAssignsYouA")} /> : (
            <>
              {grouped.filter((g) => g.items.length).map((g) => (
                <section key={g.key} aria-label={t.text(g.title)} data-testid={`group-${g.key}`}>
                  <h2 className="mb-2 text-sm font-semibold">{t.text(g.title)} <span className="font-normal text-muted-foreground">({g.items.length})</span></h2>
                  <ul className="space-y-2">{g.items.map((s) => <StageRow key={s.id} s={s} onOpen={() => nav({ stage: s.id })} />)}</ul>
                </section>
              ))}
              {rest.length ? <section aria-label={t("production.other")}><h2 className="mb-2 text-sm font-semibold">{t("production.otherLength", { length: rest.length })}</h2><ul className="space-y-2">{rest.map((s) => <StageRow key={s.id} s={s} onOpen={() => nav({ stage: s.id })} />)}</ul></section> : null}
            </>
          )}
        </TabsContent>
        <TabsContent value="jobs" className="space-y-2">
          {jobs.isLoading ? <PageSkeleton /> : jobs.error ? <ErrorState error={jobs.error} onRetry={() => jobs.refetch()} /> : (jobs.data?.data ?? []).length === 0 ? <EmptyState title={t("production.noJobs")} description={t("production.jobsYouHaveStagesInAppear")} /> : (
            <ul className="space-y-3" data-testid="my-jobs">
              {jobs.data!.data.map((j) => (
                <li key={j.id} className="rounded-md border bg-surface p-3">
                  <p className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold">{j.jobNumber}</span><span className="font-medium">{j.productName}</span><PriorityBadge priority={j.priority} /><StatusBadge status={j.status} /></p>
                  <ul className="mt-2 space-y-1.5">{j.myStages.map((s) => <StageRow key={s.id} s={s} onOpen={() => nav({ stage: s.id })} />)}</ul>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
      {stageId ? <StageFromId id={stageId} onClose={() => nav({ stage: null })} /> : null}
    </>
  );
}
