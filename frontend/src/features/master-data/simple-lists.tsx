"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { useListParams } from "@/hooks/use-list-params";
import { humanizeCode, tx } from "@/lib/utils/format";
import { useAccessories, useComponentOptions, usePrintMethods, useSizeScales } from "./hooks";
import { ADMIN_MANAGED, ReferenceListPage } from "./reference-list-page";
import { rowStatus } from "./status";
import { COMPONENT_CATEGORIES, type Accessory, type ComponentOption, type PrintMethod } from "./types";
import { useI18n } from "@/i18n/provider";

const dash = <span className="text-muted-foreground">—</span>;
const code = (c: string) => <span className="font-mono text-xs font-semibold">{c}</span>;

/* ---------------- print methods ---------------- */
const printColumns: ColumnDef<PrintMethod, unknown>[] = [
  { header: "Code", accessorKey: "code", meta: { sortKey: "code" }, cell: ({ row }) => code(row.original.code) },
  { header: "Name", accessorKey: "name", meta: { sortKey: "name" }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { header: "Type", accessorKey: "type", cell: ({ row }) => <Badge variant="outline">{humanizeCode(row.original.type)}</Badge> },
  { header: "Full colour", accessorKey: "supportsFullColor", cell: ({ row }) => tx(row.original.supportsFullColor ? "Yes" : "No") },
  { header: "Max colours", accessorKey: "maxColors", cell: ({ row }) => row.original.maxColors ?? dash },
  { header: "Min quantity", accessorKey: "minQuantity", cell: ({ row }) => row.original.minQuantity ?? dash },
  { header: "Setup fee", accessorKey: "setupFee", cell: ({ row }) => (row.original.setupFee ? <span className="tabular-nums">{row.original.setupFee}</span> : dash) },
  { header: "Description", accessorKey: "description", cell: ({ row }) => <span className="block max-w-xs truncate text-muted-foreground">{row.original.description ?? "—"}</span> },
  { header: "Status", id: "status", cell: ({ row }) => <StatusBadge status={rowStatus(row.original)} /> },
];

export function PrintMethodsPage() {
  const { t, fmt } = useI18n();
  return (
    <ReferenceListPage
      title={t("masterData.printMethods")}
      description={t("masterData.decorationMethodsAndTheirProductionLimits")}
      caption={t("masterData.printMethods")}
      columns={printColumns}
      useList={usePrintMethods}
      emptyTitle={t("masterData.noPrintMethodsConfigured")}
      filters={[{ param: "type", label: t("masterData.types"), options: ["PRINT", "EMBROIDERY", "OTHER"].map((t) => ({ value: t, label: fmt.code(t) })) }]}
    />
  );
}

/* ---------------- accessories ---------------- */
const accessoryColumns: ColumnDef<Accessory, unknown>[] = [
  { header: "Code", accessorKey: "code", meta: { sortKey: "code" }, cell: ({ row }) => code(row.original.code) },
  { header: "Name", accessorKey: "name", meta: { sortKey: "name" }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { header: "Category", accessorKey: "category", cell: ({ row }) => (row.original.category ? <Badge variant="outline">{row.original.category}</Badge> : dash) },
  { header: "Unit", accessorKey: "unit", cell: ({ row }) => row.original.unit ?? dash },
  { header: "Description", accessorKey: "description", cell: ({ row }) => <span className="block max-w-sm truncate text-muted-foreground">{row.original.description ?? "—"}</span> },
  { header: "Status", id: "status", cell: ({ row }) => <StatusBadge status={rowStatus(row.original)} /> },
];

export function AccessoriesPage() {
  const { t } = useI18n();
  return <ReferenceListPage title={t("masterData.accessories")} description={t("masterData.trimsAndHardwareThatCanBe")} caption={t("masterData.accessories")} columns={accessoryColumns} useList={useAccessories} emptyTitle={t("masterData.noAccessoriesConfigured")} />;
}

/* ---------------- labels & packaging components (grouped by category) ---------------- */
const MAX = 100;

export function ComponentsPage() {
  const { t, fmt } = useI18n();
  const { params, update } = useListParams({ pageSize: MAX });
  const q = useComponentOptions({ pageSize: MAX, sortBy: "sortOrder", sortOrder: "asc", search: params.search || undefined, includeArchived: params.filters.includeArchived === "true" || undefined });
  const groups = useMemo(() => {
    const rows = q.data?.data ?? [];
    return COMPONENT_CATEGORIES.map((c) => ({ category: c, rows: rows.filter((r) => r.category === c) })).filter((g) => g.rows.length > 0);
  }, [q.data]);

  return (
    <>
      <PageHeader title={t("masterData.labelsPackaging")} description={t("masterData.labelPackagingAndOtherComponentsGrouped")} />
      <div className="mb-4 max-w-sm"><SearchInput value={params.search} onValueChange={(search) => update({ search })} placeholder={t("masterData.searchCodeOrName")} /></div>
      {q.isLoading ? <Card><TableSkeleton columns={4} rows={5} /></Card> : q.error ? <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card> : groups.length === 0 ? (
        <Card><EmptyState title={params.search ? t("masterData.noMatchingComponents") : t("masterData.noComponentsConfigured")} description={params.search ? t("masterData.nothingMatchesTheSearch") : ADMIN_MANAGED} /></Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.category} aria-labelledby={`comp-${g.category}`}>
              <CardHeader><CardTitle><span id={`comp-${g.category}`}>{fmt.code(g.category)}</span></CardTitle><span className="text-xs text-muted-foreground">{g.rows.length}</span></CardHeader>
              <ul className="divide-y">
                {g.rows.map((c: ComponentOption) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                    <span className="w-40 shrink-0">{code(c.code)}</span>
                    <span className="min-w-0 flex-1"><span className="font-medium">{c.name}</span>{c.description ? <span className="block text-sm text-muted-foreground">{c.description}</span> : null}</span>
                    <StatusBadge status={rowStatus(c)} />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {q.data && q.data.meta.total > MAX ? <p className="text-xs text-muted-foreground">{t("masterData.showingTheFirstMaxOfTotal", { MAX, total: q.data.meta.total })}</p> : null}
        </div>
      )}
    </>
  );
}

/* ---------------- size scales ---------------- */
export function SizesPage() {
  const { t } = useI18n();
  const q = useSizeScales({ pageSize: 100, sortBy: "sortOrder", sortOrder: "asc" });
  return (
    <>
      <PageHeader title={t("masterData.sizeScales")} description={t("masterData.sizeScalesAndTheirOptionsIn")} />
      {q.isLoading ? <Card><TableSkeleton columns={3} rows={3} /></Card> : q.error ? <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card> : q.data && q.data.data.length === 0 ? (
        <Card><EmptyState title={t("masterData.noSizeScalesConfigured")} description={ADMIN_MANAGED} /></Card>
      ) : (
        <div className="space-y-4">
          {q.data?.data.map((s) => {
            const sizes = [...s.sizes].sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <Card key={s.id} aria-labelledby={`scale-${s.id}`} data-testid="size-scale">
                <CardHeader>
                  <CardTitle><span id={`scale-${s.id}`}>{s.name}</span> <span className="ms-2 font-mono text-xs font-normal text-muted-foreground">{s.code}</span></CardTitle>
                  <StatusBadge status={rowStatus(s)} />
                </CardHeader>
                <CardContent>
                  {s.description ? <p className="mb-3 text-sm text-muted-foreground">{s.description}</p> : null}
                  <ol aria-label={t("masterData.nameSizesInOrder", { name: s.name })} className="flex flex-wrap gap-2">
                    {sizes.map((z) => (
                      <li key={z.id} className="flex min-w-16 flex-col items-center rounded-md border bg-surface px-3 py-1.5 text-center">
                        <span className="text-sm font-semibold">{z.name}</span>
                        <span className="font-mono text-[0.6875rem] text-muted-foreground">{z.code}</span>
                        {!z.isActive || z.archivedAt ? <span className="mt-0.5 text-[0.6875rem] text-muted-foreground">{z.archivedAt ? t("masterData.archived") : t("masterData.inactive")}</span> : null}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
