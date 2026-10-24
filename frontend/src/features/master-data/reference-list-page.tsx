"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import { DataTable } from "@/components/data-display/data-table";
import { FilterBar, TableToolbar } from "@/components/data-display/table-toolbar";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useListParams } from "@/hooks/use-list-params";
import type { Paginated } from "@/types/api";
import type { ListQuery } from "./api";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";
export interface FilterDef {
  param: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export const ADMIN_MANAGED = "Master data is managed by authorized administrators.";

/**
 * Shared read-only list for master-data resources: server pagination/search/filters in the URL. Backend list endpoints
 * support search, isActive, includeArchived, sortBy, sortOrder (patterns: status/productTypeId instead, no sorting).
 */
export function ReferenceListPage<T extends { id: string }>({
  title,
  description,
  caption,
  columns,
  useList,
  searchPlaceholder = "Search code or name…",
  filters = [],
  activeFilter = true,
  sortable = true,
  emptyTitle,
  rowKey,
}: {
  title: string;
  description: string;
  caption: string;
  columns: ColumnDef<T, unknown>[];
  useList: (query: ListQuery) => UseQueryResult<Paginated<T>>;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  /** Offer the isActive filter (not supported by patterns). */
  activeFilter?: boolean;
  sortable?: boolean;
  emptyTitle: string;
  rowKey?: (row: T) => string;
}) {
  const { t } = useI18n();
  const { params, update, toQuery } = useListParams({ sort: sortable ? "sortOrder" : "", direction: "asc", sortParam: "sortBy", directionParam: "sortOrder", pageSize: 20 });
  const includeArchived = params.filters.includeArchived === "true";
  const isActive = params.filters.isActive;
  const query = useMemo(() => {
    const q: Record<string, string | number | boolean | undefined> = { ...(toQuery as Record<string, string | number | undefined>), includeArchived: includeArchived || undefined };
    if (!sortable) { delete q.sortBy; delete q.sortOrder; }
    return q;
  }, [toQuery, includeArchived, sortable]);
  const q = useList(query);

  const activeCount = (params.search ? 1 : 0) + (includeArchived ? 1 : 0) + (isActive ? 1 : 0) + filters.filter((f) => params.filters[f.param]).length;
  const reset = () => update({ search: "", filters: { includeArchived: undefined, isActive: undefined, ...Object.fromEntries(filters.map((f) => [f.param, undefined])) } });

  return (
    <>
      <PageHeader title={title} description={description} />
      <DataTable
        caption={caption}
        columns={columns}
        result={q.data}
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        sort={sortable ? params.sort : undefined}
        direction={params.direction}
        onSortChange={sortable ? (sort, direction) => update({ sort, direction }) : undefined}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(pageSize) => update({ pageSize })}
        rowKey={rowKey ?? ((r) => r.id)}
        toolbar={
          <TableToolbar
            search={params.search}
            onSearchChange={(search) => update({ search })}
            searchPlaceholder={searchPlaceholder}
            filters={
              <FilterBar activeCount={activeCount} onReset={reset}>
                {filters.map((f) => (
                  <Select key={f.param} aria-label={f.label} className="w-44" value={params.filters[f.param] ?? ALL} onValueChange={(v) => update({ filters: { [f.param]: v === ALL ? undefined : v } })} options={[{ value: ALL, label: t("masterData.allV1", { v1: f.label.toLowerCase() }) }, ...f.options]} />
                ))}
                {activeFilter ? (
                  <Select aria-label={t("masterData.activeState")} className="w-36" value={isActive ?? ALL} onValueChange={(v) => update({ filters: { isActive: v === ALL ? undefined : v } })} options={[{ value: ALL, label: t("masterData.anyState") }, { value: "true", label: t("masterData.active") }, { value: "false", label: t("masterData.inactive") }]} />
                ) : null}
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={includeArchived} onCheckedChange={(c) => update({ filters: { includeArchived: c ? "true" : undefined } })} aria-label={t("common.includeArchived")} />{t("common.includeArchived")}</label>
              </FilterBar>
            }
          />
        }
        empty={
          activeCount === 0 ? (
            <EmptyState title={emptyTitle} description={ADMIN_MANAGED} />
          ) : (
            <EmptyState title={t("masterData.noMatchingRows")} description={t("common.nothingMatchesTheCurrentSearchAnd")} action={<Button variant="secondary" size="sm" onClick={reset}>{t("common.clearFilters")}</Button>} />
          )
        }
      />
    </>
  );
}

