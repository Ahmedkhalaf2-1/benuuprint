"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/feedback/states";
import { cn } from "@/lib/utils/cn";
import type { Paginated } from "@/types/api";
import { Pagination } from "./pagination";
import { useI18n } from "@/i18n/provider";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Backend `sort` key; the column is sortable only when set. */
    sortKey?: string;
    className?: string;
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  /** Backend list envelope: { data, meta }. Server paginated: nothing is paged client-side. */
  result?: Paginated<T>;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  sort?: string;
  direction?: "asc" | "desc";
  onSortChange?: (sort: string, direction: "asc" | "desc") => void;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  rowKey: (row: T) => string;
  rowActions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Fully custom empty state (e.g. "No customers yet" with an action vs. "No results" with Clear filters). */
  empty?: ReactNode;
  caption: string;
}

export function DataTable<T>({
  columns, result, isLoading, error, onRetry, sort, direction = "desc", onSortChange, onPageChange, onPageSizeChange,
  rowKey, rowActions, toolbar, emptyTitle, emptyDescription, empty, caption,
}: DataTableProps<T>) {
  const { t } = useI18n();
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is not memoizable by the React Compiler; known and harmless here
  const table = useReactTable({
    data: result?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getRowId: (row) => rowKey(row),
  });

  const colCount = columns.length + (rowActions ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-lg border bg-surface">
      {toolbar}
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : isLoading ? (
        <TableSkeleton columns={Math.min(colCount, 6)} />
      ) : !result || result.data.length === 0 ? (
        empty ?? <EmptyState title={emptyTitle ?? t("common.noResults")} description={emptyDescription ?? t("common.tryChangingTheFiltersOrSearch")} />
      ) : (
        <>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="bg-surface-sunken font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b">
                    {hg.headers.map((h) => {
                      const sortKey = h.column.columnDef.meta?.sortKey;
                      const active = sortKey && sortKey === sort;
                      return (
                        <th
                          key={h.id}
                          scope="col"
                          aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
                          className={cn("h-10 px-4 text-start font-medium", h.column.columnDef.meta?.className)}
                        >
                          {sortKey && onSortChange ? (
                            <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSortChange(sortKey, active && direction === "asc" ? "desc" : "asc")}>
                              {typeof h.column.columnDef.header === "string" ? t.text(h.column.columnDef.header) : flexRender(h.column.columnDef.header, h.getContext())}
                              {active ? (direction === "asc" ? <ArrowUp aria-hidden className="size-3" /> : <ArrowDown aria-hidden className="size-3" />) : <ChevronsUpDown aria-hidden className="size-3 opacity-50" />}
                            </button>
                          ) : (
                            typeof h.column.columnDef.header === "string" ? t.text(h.column.columnDef.header) : flexRender(h.column.columnDef.header, h.getContext())
                          )}
                        </th>
                      );
                    })}
                    {rowActions ? <th scope="col" className="w-10 px-4"><span className="sr-only">{t("common.actions")}</span></th> : null}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-white/[0.03] aria-selected:bg-brand-soft/40">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cn("h-11 px-4", cell.column.columnDef.meta?.className)}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                    {rowActions ? <td className="px-4 text-end">{rowActions(row.original)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={result.meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
        </>
      )}
    </div>
  );
}
