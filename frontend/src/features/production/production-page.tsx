"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { LayoutGrid, Table2, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { DataTable } from "@/components/data-display/data-table";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { EmptyState, ErrorState, PageSkeleton, AccessDeniedState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-provider";
import { useConfiguratorOptions } from "@/features/master-data/hooks";
import { useListParams } from "@/hooks/use-list-params";
import { isApiError } from "@/lib/api/errors";

import { useBoard, useJobs } from "./hooks";
import { JobCard } from "./job-card";
import { SOURCE_LABELS } from "./labels";
import { JOB_STATUSES, STAGE_STATUSES, type JobListItem } from "./types";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";
const FILTERS = ["status", "priority", "delayed", "blocked", "assignedUserId", "unassigned", "sourceType", "productTypeId"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

/** Production Board (a column per stage definition, from the backend) and a jobs table. Filter state lives in the URL. */
export function ProductionPage() {
  const { t, fmt } = useI18n();
  const { user } = useAuth();
  const { params, update, toQuery } = useListParams({ sort: "newest", sortParam: "sort", directionParam: null, pageSize: 20 });
  const f = params.filters;
  const view = f.view === "table" ? "table" : "board";
  const config = useConfiguratorOptions();
  const statuses = f.status ? f.status.split(",") : [];
  const activeCount = (params.search ? 1 : 0) + FILTERS.filter((k) => f[k]).length;
  const reset = () => update({ search: "", filters: Object.fromEntries(FILTERS.map((k) => [k, undefined])) });
  const setF = (k: string, v: string | undefined) => update({ filters: { [k]: v === ALL || v === "" ? undefined : v } });

  // Each view sends only the parameters ITS endpoint supports.
  const boardQuery = useMemo(() => ({ status: f.status, priority: f.priority, delayed: f.delayed, blocked: f.blocked, assignedUserId: f.assignedUserId, unassigned: f.unassigned, productTypeId: f.productTypeId }), [f.status, f.priority, f.delayed, f.blocked, f.assignedUserId, f.unassigned, f.productTypeId]);
  const tableQuery = useMemo(() => ({ ...(toQuery as Record<string, string | number | undefined>), status: f.status, priority: f.priority, delayed: f.delayed, sourceType: f.sourceType, productTypeId: f.productTypeId, view: undefined, blocked: undefined, assignedUserId: undefined, unassigned: undefined }), [toQuery, f.status, f.priority, f.delayed, f.sourceType, f.productTypeId]);
  const board = useBoard(boardQuery, view === "board");
  const jobs = useJobs(tableQuery, view === "table");
  const active = view === "board" ? board : jobs;

  const columns = useMemo<ColumnDef<JobListItem, unknown>[]>(() => [
    { header: t("production.job"), accessorKey: "jobNumber", cell: ({ row }) => <Link href={`/production/jobs/${row.original.id}`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{row.original.jobNumber}</Link> },
    { header: t("common.source"), id: "source", cell: ({ row }) => <span className="text-xs">{SOURCE_LABELS[row.original.sourceType]}<span className="block font-mono text-muted-foreground">{row.original.batchNumber ?? row.original.orderNumber ?? row.original.sampleNumber}</span></span> },
    { header: t("common.customer"), id: "customer", cell: ({ row }) => <span>{row.original.customer.name}<span className="block text-xs text-muted-foreground">{row.original.brand.name}</span></span> },
    { header: t("common.product"), accessorKey: "productName" },
    { header: t("common.status"), accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: t("common.priority"), accessorKey: "priority", cell: ({ row }) => <PriorityBadge priority={row.original.priority} /> },
    { header: t("common.quantity"), id: "qty", cell: ({ row }) => (row.original.plannedQuantity != null ? <span className="tabular-nums">{row.original.completedQuantity}/{row.original.plannedQuantity}{row.original.rejectedQuantity ? <span className="text-xs text-danger">{" "}{t("production.rejectedquantityRej", { rejectedQuantity: row.original.rejectedQuantity })}</span> : null}</span> : <span className="text-muted-foreground">{t("production.n1Sample")}</span>) },
    { header: t("production.progress"), id: "progress", cell: ({ row }) => { const p = row.original.progress; const pct = p.totalStages ? Math.round(((p.completedStages ?? 0) / p.totalStages) * 100) : 0; return <div className="min-w-24"><span className="text-xs tabular-nums">{p.completedStages ?? 0}/{p.totalStages ?? 0}{" "}{t("production.stages")}</span><Progress value={pct} label={t("production.jobnumberStages", { jobNumber: row.original.jobNumber })} className="mt-1" /></div>; } },
    { header: t("production.flags"), id: "flags", cell: ({ row }) => <span className="text-xs">{row.original.openBlockers ? <span className="font-medium text-tone-blocked-fg">{t("production.openblockersBlocked", { openBlockers: row.original.openBlockers })}{" "}</span> : null}{row.original.delayedStages ? <span className="font-medium text-tone-danger-fg">{t("production.delayedstagesDelayed", { delayedStages: row.original.delayedStages })}</span> : null}{!row.original.openBlockers && !row.original.delayedStages ? "—" : null}</span> },
    { header: t("production.target"), accessorKey: "targetCompletionDate", cell: ({ row }) => (row.original.targetCompletionDate ? fmt.date(row.original.targetCompletionDate) : "—") },
  ], [t, fmt]);

  const forbidden = isApiError(active.error) && active.error.kind === "forbidden";

  return (
    <>
      <PageHeader
        title={t("common.production")}
        description={t("production.factoryJobsByStageJobsAre")}
        actions={
          <div role="group" aria-label={t("common.view")} className="inline-flex rounded-md border">
            <Button variant={view === "board" ? "primary" : "ghost"} size="sm" className="rounded-e-none" aria-pressed={view === "board"} onClick={() => update({ filters: { view: undefined } })}><LayoutGrid />{" "}{t("production.board")}</Button>
            <Button variant={view === "table" ? "primary" : "ghost"} size="sm" className="rounded-s-none" aria-pressed={view === "table"} onClick={() => update({ filters: { view: "table" } })}><Table2 />{" "}{t("production.table")}</Button>
          </div>
        }
      />
      <div role="group" aria-label={t("common.filters")} className="mb-3 flex flex-wrap items-center gap-2">
        <MultiSelect aria-label={t("common.status")} className="w-52" placeholder={t("common.allStatuses")} value={statuses} onValueChange={(v) => setF("status", v.join(",") || undefined)} options={(view === "board" ? STAGE_STATUSES : JOB_STATUSES).map((s) => ({ value: s, label: fmt.code(s) }))} />
        <Select aria-label={t("common.priority")} className="w-36" value={f.priority ?? ALL} onValueChange={(v) => setF("priority", v)} options={[{ value: ALL, label: t("production.anyPriority") }, ...PRIORITIES.map((p) => ({ value: p, label: fmt.code(p) }))]} />
        <Select aria-label={t("common.productType")} className="w-44" value={f.productTypeId ?? ALL} onValueChange={(v) => setF("productTypeId", v)} options={[{ value: ALL, label: t("production.allProducts") }, ...(config.data?.productTypes ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
        {view === "table" ? <Select aria-label={t("common.source")} className="w-40" value={f.sourceType ?? ALL} onValueChange={(v) => setF("sourceType", v)} options={[{ value: ALL, label: t("production.anySource") }, ...Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))]} /> : null}
        <label className="flex items-center gap-2 text-sm"><Switch checked={f.delayed === "true"} onCheckedChange={(c) => setF("delayed", c ? "true" : undefined)} aria-label={t("production.delayedOnly")} />{" "}{t("common.delayed")}</label>
        {view === "board" ? (
          <>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.blocked === "true"} onCheckedChange={(c) => setF("blocked", c ? "true" : undefined)} aria-label={t("production.blockedOnly")} />{" "}{t("common.blocked")}</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.unassigned === "true"} onCheckedChange={(c) => update({ filters: { unassigned: c ? "true" : undefined, assignedUserId: c ? undefined : f.assignedUserId } })} aria-label={t("production.unassignedOnly")} />{" "}{t("common.unassigned")}</label>
            {user ? <label className="flex items-center gap-2 text-sm"><Switch checked={f.assignedUserId === user.id} onCheckedChange={(c) => update({ filters: { assignedUserId: c ? user.id : undefined, unassigned: c ? undefined : f.unassigned } })} aria-label={t("common.assignedToMe")} />{" "}{t("production.mine")}</label> : null}
          </>
        ) : null}
        {activeCount > 0 ? <Button variant="ghost" size="sm" onClick={reset}><X />{" "}{t("common.clear")}</Button> : null}
      </div>

      {forbidden ? <AccessDeniedState /> : view === "board" ? (
        board.isLoading ? <PageSkeleton /> : board.error ? <ErrorState error={board.error} onRetry={() => board.refetch()} /> : board.data && board.data.columns.every((c) => c.total === 0) ? (
          <EmptyState title={activeCount ? t("production.noJobsMatchTheFilters") : t("production.noJobsInProduction")} description={activeCount ? t("production.tryClearingTheFilters") : t("production.jobsAppearHereOnceTheyAre")} action={activeCount ? <Button size="sm" variant="secondary" onClick={reset}>{t("common.clearFilters")}</Button> : undefined} />
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6" data-testid="board">
            <div className="flex min-w-max gap-3">
              {board.data?.columns.map((col) => (
                <section key={col.stageCode} aria-label={t("production.stagenameColumn", { stageName: col.stageName })} data-testid="board-column" className="w-64 shrink-0 rounded-lg bg-surface-muted/70 p-2">
                  <h2 className="flex items-baseline justify-between gap-2 px-1 pb-2 text-sm font-semibold"><span className="truncate">{col.stageName}</span><span className="rounded-sm bg-surface px-1.5 text-xs tabular-nums text-muted-foreground">{col.total}</span></h2>
                  <p className="px-1 pb-2 text-[0.6875rem] text-muted-foreground">{Object.entries(col.counts).map(([k, v]) => `${v} ${fmt.code(k).toLowerCase()}`).join(" · ") || t("production.empty")}</p>
                  <ul className="space-y-2">{col.cards.map((c) => <JobCard key={c.stageId} card={c} />)}</ul>
                  {col.total > col.cards.length ? <p className="px-1 pt-2 text-xs text-muted-foreground">{t("production.v1MoreUseFilters", { v1: col.total - col.cards.length })}</p> : null}
                </section>
              ))}
            </div>
          </div>
        )
      ) : (
        <DataTable
          caption={t("production.factoryJobs")}
          columns={columns}
          result={jobs.data}
          isLoading={jobs.isLoading}
          error={jobs.error}
          onRetry={() => jobs.refetch()}
          onPageChange={(page) => update({ page })}
          onPageSizeChange={(pageSize) => update({ pageSize })}
          rowKey={(j) => j.id}
          toolbar={<TableToolbar search={params.search} onSearchChange={(search) => update({ search })} searchPlaceholder={t("production.searchJobSampleOrderCustomerBrand")} />}
          empty={<EmptyState title={activeCount ? t("production.noMatchingJobs") : t("production.noJobsYet")} description={activeCount ? t("common.nothingMatchesTheCurrentSearchAnd") : t("production.jobsAppearOnceCreatedFromA")} action={activeCount ? <Button size="sm" variant="secondary" onClick={reset}>{t("common.clearFilters")}</Button> : undefined} />}
        />
      )}
    </>
  );
}
