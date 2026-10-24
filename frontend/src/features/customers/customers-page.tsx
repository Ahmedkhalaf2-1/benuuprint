"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { FilterBar, TableToolbar } from "@/components/data-display/table-toolbar";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-provider";
import { BulkResponsibilityDialog } from "@/features/responsibilities/customer-sections";
import { useOverview } from "@/features/responsibilities/hooks";
import { CurrentWorkCell } from "@/features/responsibilities/work-cell";
import { Checkbox } from "@/components/ui/checkbox";
import { useListParams } from "@/hooks/use-list-params";
import { humanizeCode } from "@/lib/utils/format";
import { ArchiveCustomerDialog, useRestoreCustomer } from "./customer-actions";
import { useCustomers } from "./hooks";
import type { Customer } from "./types";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";
const STATUS_OPTIONS = [{ value: ALL, label: "All statuses" }, ...["ACTIVE", "LEAD", "INACTIVE", "BLOCKED", "ARCHIVED"].map((s) => ({ value: s, label: humanizeCode(s) }))];
const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "displayName:asc", label: "Name A–Z" },
  { value: "displayName:desc", label: "Name Z–A" },
  { value: "customerNumber:asc", label: "Number ↑" },
  { value: "customerNumber:desc", label: "Number ↓" },
];

export function CustomersPage() {
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const canManage = can("customers.manage");
  const canOps = can("responsibilities.read");
  const canBulk = can("responsibilities.manage");
  const { params, update, toQuery } = useListParams({ sort: "createdAt", direction: "desc", sortParam: "sortBy", directionParam: "sortOrder" });
  const [toArchive, setToArchive] = useState<Customer | null>(null);
  const restore = useRestoreCustomer();
  const [selected, setSelected] = useState<Record<string, string>>({}); // id -> name, kept across pages
  const [bulk, setBulk] = useState(false);
  const overview = useOverview(canOps);
  const area = params.filters.area;
  const responsible = params.filters.responsible;

  const status = params.filters.status ?? ALL;
  const includeArchived = params.filters.includeArchived === "true";
  const activeFilters = (params.filters.status ? 1 : 0) + (includeArchived ? 1 : 0) + (params.search ? 1 : 0) + (area ? 1 : 0) + (responsible ? 1 : 0);
  const query = useMemo(() => ({ ...toQuery, status: params.filters.status, includeArchived: includeArchived || undefined, includeOperations: canOps || undefined, area: undefined, responsible: undefined }), [toQuery, params.filters.status, includeArchived, canOps]);
  const q = useCustomers(query);
  const reset = () => update({ search: "", filters: { status: undefined, includeArchived: undefined, area: undefined, responsible: undefined } });
  /** The list has no server-side responsibility filter, so this narrows the page in view using each customer's effective owners. */
  const areaOptions = (overview.data ?? []).map((a) => ({ value: a.stageKey, label: a.label }));
  const people = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of q.data?.data ?? []) for (const a of c.responsibilitySummary?.areas ?? []) if (a.user && (!area || a.stageKey === area)) m.set(a.user.id, a.user.name);
    if (responsible && !m.has(responsible)) m.set(responsible, "Selected person");
    return [...m].sort((x, y) => x[1].localeCompare(y[1])).map(([value, label]) => ({ value, label }));
  }, [q.data, area, responsible]);
  const shown = useMemo(() => {
    if (!q.data || (!area && !responsible)) return q.data;
    const data = q.data.data.filter((c) => (c.responsibilitySummary?.areas ?? []).some((a) => (!area || a.stageKey === area) && (!responsible || a.user?.id === responsible)));
    return { ...q.data, data };
  }, [q.data, area, responsible]);

  const columns = useMemo<ColumnDef<Customer, unknown>[]>(
    () => [
      ...(canBulk ? [{
        id: "select", header: () => <span className="sr-only">{t("customers.select")}</span>,
        cell: ({ row }: { row: { original: Customer } }) => <Checkbox aria-label={t("customers.selectDisplayname", { displayName: row.original.displayName })} checked={row.original.id in selected} onCheckedChange={(c) => setSelected((s) => { const n = { ...s }; if (c === true) n[row.original.id] = row.original.displayName; else delete n[row.original.id]; return n; })} />,
      } as ColumnDef<Customer, unknown>] : []),
      { header: t("common.number"), accessorKey: "customerNumber", meta: { sortKey: "customerNumber" }, cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.customerNumber}</span> },
      {
        header: t("common.name"), accessorKey: "displayName", meta: { sortKey: "displayName" },
        cell: ({ row }) => <Link href={`/customers/${row.original.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{row.original.displayName}</Link>,
      },
      ...(canOps ? [{ header: t("customers.currentWork"), id: "ops", cell: ({ row }: { row: { original: Customer } }) => <CurrentWorkCell c={row.original} /> } as ColumnDef<Customer, unknown>] : [
        { header: t("customers.email"), accessorKey: "email", cell: ({ row }) => row.original.email ?? <span className="text-muted-foreground">—</span> } as ColumnDef<Customer, unknown>,
        { header: t("common.phone"), accessorKey: "phone", cell: ({ row }) => row.original.phone ?? <span className="text-muted-foreground">—</span> } as ColumnDef<Customer, unknown>,
      ]),
      { header: t("customers.location"), id: "location", cell: ({ row }) => [row.original.city, row.original.country].filter(Boolean).join(", ") || <span className="text-muted-foreground">—</span> },
      { header: t("common.status"), accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: t("common.created"), accessorKey: "createdAt", meta: { sortKey: "createdAt" }, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{fmt.date(row.original.createdAt)}</span> },
    ],
    [canBulk, canOps, selected, t, fmt],
  );

  const noFilters = activeFilters === 0;

  return (
    <>
      <PageHeader
        title={t("customers.customers")}
        description={t("customers.clientAccountsContactsAddressesAndTheir")}
        actions={canManage ? <Button asChild><Link href="/customers/new"><Plus />{" "}{t("customers.newCustomer")}</Link></Button> : null}
      />
      <DataTable
        caption={t("customers.customers")}
        columns={columns}
        result={shown}
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        sort={params.sort}
        direction={params.direction}
        onSortChange={(sort, direction) => update({ sort, direction })}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(pageSize) => update({ pageSize })}
        rowKey={(c) => c.id}
        toolbar={
          <TableToolbar
            search={params.search}
            onSearchChange={(search) => update({ search })}
            searchPlaceholder={t("customers.searchNumberNameEmailPhoneBrand")}
            filters={
              <FilterBar activeCount={activeFilters} onReset={reset}>
                <Select aria-label={t("common.status")} className="w-40" value={status} onValueChange={(v) => update({ filters: { status: v === ALL ? undefined : v } })} options={STATUS_OPTIONS} />
                {canOps ? <Select aria-label={t("customers.operationalArea")} className="w-44" value={area ?? ALL} onValueChange={(v) => update({ filters: { area: v === ALL ? undefined : v, responsible: undefined } })} options={[{ value: ALL, label: t("customers.anyArea") }, ...areaOptions]} /> : null}
                {canOps && area ? <Select aria-label={t("customers.responsible")} className="w-44" value={responsible ?? ALL} onValueChange={(v) => update({ filters: { responsible: v === ALL ? undefined : v } })} options={[{ value: ALL, label: t("customers.anyone") }, ...people]} /> : null}
                <Select aria-label={t("common.sortBy")} className="w-40" value={`${params.sort}:${params.direction}`} onValueChange={(v) => { const [sort, direction] = v.split(":") as [string, "asc" | "desc"]; update({ sort, direction }); }} options={SORT_OPTIONS} />
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={includeArchived || status === "ARCHIVED"} disabled={status === "ARCHIVED"} onCheckedChange={(c) => update({ filters: { includeArchived: c ? "true" : undefined } })} aria-label={t("common.includeArchived")} />{t("common.includeArchived")}</label>
              </FilterBar>
            }
          />
        }
        empty={
          noFilters ? (
            <EmptyState title={t("customers.noCustomersYet")} description={canManage ? t("customers.createTheFirstCustomerToStart") : t("customers.noCustomersHaveBeenCreatedYet")} action={canManage ? <Button asChild size="sm"><Link href="/customers/new"><Plus />{" "}{t("customers.newCustomer")}</Link></Button> : undefined} />
          ) : (
            <EmptyState title={t("customers.noMatchingCustomers")} description={t("common.nothingMatchesTheCurrentSearchAnd")} action={<Button variant="secondary" size="sm" onClick={reset}>{t("common.clearFilters")}</Button>} />
          )
        }
        rowActions={(c) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><IconButton size="sm" label={t("customers.actionsForDisplayname", { displayName: c.displayName })} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild><Link href={`/customers/${c.id}`}>{t("common.view")}</Link></DropdownMenuItem>
              {canManage && c.status !== "ARCHIVED" ? <DropdownMenuItem asChild><Link href={`/customers/${c.id}/edit`}>{t("common.edit")}</Link></DropdownMenuItem> : null}
              {canManage && c.status !== "ARCHIVED" ? <DropdownMenuItem destructive onSelect={() => setToArchive(c)}>{t("customers.archive")}</DropdownMenuItem> : null}
              {canManage && c.status === "ARCHIVED" ? <DropdownMenuItem disabled={restore.pending} onSelect={() => restore.restore(c)}>{t("customers.restore")}</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
      {canBulk && Object.keys(selected).length > 0 ? (
        <div role="region" aria-label={t("customers.bulkActions")} data-testid="bulk-bar" className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">{t("customers.lengthSelected", { length: Object.keys(selected).length })}</span>
          <span className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setSelected({})}>{t("common.clear")}</Button><Button size="sm" onClick={() => setBulk(true)}>{t("customers.setResponsibility")}</Button></span>
        </div>
      ) : null}
      {bulk ? <BulkResponsibilityDialog customers={Object.entries(selected).map(([id, name]) => ({ id, name }))} onClose={() => setBulk(false)} onDone={() => { setBulk(false); setSelected({}); }} /> : null}
      <ArchiveCustomerDialog customer={toArchive} onOpenChange={(o) => !o && setToArchive(null)} />
    </>
  );
}
