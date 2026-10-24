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
import { formatDate, humanizeCode } from "@/lib/utils/format";
import { ArchiveCustomerDialog, useRestoreCustomer } from "./customer-actions";
import { useCustomers } from "./hooks";
import type { Customer } from "./types";

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
        id: "select", header: () => <span className="sr-only">Select</span>,
        cell: ({ row }: { row: { original: Customer } }) => <Checkbox aria-label={`Select ${row.original.displayName}`} checked={row.original.id in selected} onCheckedChange={(c) => setSelected((s) => { const n = { ...s }; if (c === true) n[row.original.id] = row.original.displayName; else delete n[row.original.id]; return n; })} />,
      } as ColumnDef<Customer, unknown>] : []),
      { header: "Number", accessorKey: "customerNumber", meta: { sortKey: "customerNumber" }, cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.customerNumber}</span> },
      {
        header: "Name", accessorKey: "displayName", meta: { sortKey: "displayName" },
        cell: ({ row }) => <Link href={`/customers/${row.original.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{row.original.displayName}</Link>,
      },
      ...(canOps ? [{ header: "Current work", id: "ops", cell: ({ row }: { row: { original: Customer } }) => <CurrentWorkCell c={row.original} /> } as ColumnDef<Customer, unknown>] : [
        { header: "Email", accessorKey: "email", cell: ({ row }) => row.original.email ?? <span className="text-muted-foreground">—</span> } as ColumnDef<Customer, unknown>,
        { header: "Phone", accessorKey: "phone", cell: ({ row }) => row.original.phone ?? <span className="text-muted-foreground">—</span> } as ColumnDef<Customer, unknown>,
      ]),
      { header: "Location", id: "location", cell: ({ row }) => [row.original.city, row.original.country].filter(Boolean).join(", ") || <span className="text-muted-foreground">—</span> },
      { header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: "Created", accessorKey: "createdAt", meta: { sortKey: "createdAt" }, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.createdAt)}</span> },
    ],
    [canBulk, canOps, selected],
  );

  const noFilters = activeFilters === 0;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Client accounts, contacts, addresses and their brands."
        actions={canManage ? <Button asChild><Link href="/customers/new"><Plus /> New customer</Link></Button> : null}
      />
      <DataTable
        caption="Customers"
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
            searchPlaceholder="Search number, name, email, phone, brand…"
            filters={
              <FilterBar activeCount={activeFilters} onReset={reset}>
                <Select aria-label="Status" className="w-40" value={status} onValueChange={(v) => update({ filters: { status: v === ALL ? undefined : v } })} options={STATUS_OPTIONS} />
                {canOps ? <Select aria-label="Operational area" className="w-44" value={area ?? ALL} onValueChange={(v) => update({ filters: { area: v === ALL ? undefined : v, responsible: undefined } })} options={[{ value: ALL, label: "Any area" }, ...areaOptions]} /> : null}
                {canOps && area ? <Select aria-label="Responsible" className="w-44" value={responsible ?? ALL} onValueChange={(v) => update({ filters: { responsible: v === ALL ? undefined : v } })} options={[{ value: ALL, label: "Anyone" }, ...people]} /> : null}
                <Select aria-label="Sort by" className="w-40" value={`${params.sort}:${params.direction}`} onValueChange={(v) => { const [sort, direction] = v.split(":") as [string, "asc" | "desc"]; update({ sort, direction }); }} options={SORT_OPTIONS} />
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={includeArchived || status === "ARCHIVED"} disabled={status === "ARCHIVED"} onCheckedChange={(c) => update({ filters: { includeArchived: c ? "true" : undefined } })} aria-label="Include archived" />
                  Include archived
                </label>
              </FilterBar>
            }
          />
        }
        empty={
          noFilters ? (
            <EmptyState title="No customers yet" description={canManage ? "Create the first customer to start adding brands and samples." : "No customers have been created yet."} action={canManage ? <Button asChild size="sm"><Link href="/customers/new"><Plus /> New customer</Link></Button> : undefined} />
          ) : (
            <EmptyState title="No matching customers" description="Nothing matches the current search and filters." action={<Button variant="secondary" size="sm" onClick={reset}>Clear filters</Button>} />
          )
        }
        rowActions={(c) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><IconButton size="sm" label={`Actions for ${c.displayName}`} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild><Link href={`/customers/${c.id}`}>View</Link></DropdownMenuItem>
              {canManage && c.status !== "ARCHIVED" ? <DropdownMenuItem asChild><Link href={`/customers/${c.id}/edit`}>Edit</Link></DropdownMenuItem> : null}
              {canManage && c.status !== "ARCHIVED" ? <DropdownMenuItem destructive onSelect={() => setToArchive(c)}>Archive</DropdownMenuItem> : null}
              {canManage && c.status === "ARCHIVED" ? <DropdownMenuItem disabled={restore.pending} onSelect={() => restore.restore(c)}>Restore</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
      {canBulk && Object.keys(selected).length > 0 ? (
        <div role="region" aria-label="Bulk actions" data-testid="bulk-bar" className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">{Object.keys(selected).length} selected</span>
          <span className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setSelected({})}>Clear</Button><Button size="sm" onClick={() => setBulk(true)}>Set responsibility</Button></span>
        </div>
      ) : null}
      {bulk ? <BulkResponsibilityDialog customers={Object.entries(selected).map(([id, name]) => ({ id, name }))} onClose={() => setBulk(false)} onDone={() => { setBulk(false); setSelected({}); }} /> : null}
      <ArchiveCustomerDialog customer={toArchive} onOpenChange={(o) => !o && setToArchive(null)} />
    </>
  );
}
