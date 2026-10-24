"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Tag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { FilterBar, TableToolbar } from "@/components/data-display/table-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-provider";
import { CustomerPicker } from "@/features/customers/customer-picker";
import { useCustomer } from "@/features/customers/hooks";
import { useListParams } from "@/hooks/use-list-params";
import { formatDate, humanizeCode } from "@/lib/utils/format";
import { ArchiveBrandDialog, useRestoreBrandAction } from "./brand-actions";
import { useCustomerBrands } from "./hooks";
import type { Brand } from "./types";

const ALL = "__all";
const STATUS_OPTIONS = [{ value: ALL, label: "All statuses" }, ...["ACTIVE", "INACTIVE", "ARCHIVED"].map((s) => ({ value: s, label: humanizeCode(s) }))];

/**
 * The backend has no global brand list: brands are listed per customer. The selected customer lives in the
 * URL (?customerId=) so the view is shareable.
 */
export function BrandsPage() {
  const { can } = useAuth();
  const canManage = can("customers.manage");
  const { params, update, toQuery } = useListParams({ pageSize: 20 });
  const customerId = params.filters.customerId;
  const customer = useCustomer(customerId ?? "");
  const customerArchived = customer.data?.status === "ARCHIVED";
  const [toArchive, setToArchive] = useState<Brand | null>(null);
  const restore = useRestoreBrandAction();

  const status = params.filters.status ?? ALL;
  const includeArchived = params.filters.includeArchived === "true";
  const query = useMemo(() => {
    const { customerId: _c, sort: _s, direction: _d, ...rest } = toQuery as Record<string, unknown>;
    void _c; void _s; void _d; // the brand list endpoint has no sorting and the customer is in the path
    return { ...rest, status: params.filters.status, includeArchived: includeArchived || undefined } as Record<string, string | number | boolean | undefined>;
  }, [toQuery, params.filters.status, includeArchived]);
  const q = useCustomerBrands(customerId, query);
  const activeFilters = (params.filters.status ? 1 : 0) + (includeArchived ? 1 : 0) + (params.search ? 1 : 0);
  const reset = () => update({ search: "", filters: { status: undefined, includeArchived: undefined } });

  const columns = useMemo<ColumnDef<Brand, unknown>[]>(
    () => [
      { header: "Number", accessorKey: "brandNumber", cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.brandNumber}</span> },
      { header: "Name", accessorKey: "name", cell: ({ row }) => <Link href={`/brands/${row.original.id}`} className="font-medium hover:text-brand hover:underline">{row.original.name}</Link> },
      { header: "Instagram", accessorKey: "instagram", cell: ({ row }) => row.original.instagram ? `@${row.original.instagram}` : <span className="text-muted-foreground">—</span> },
      { header: "Website", accessorKey: "website", cell: ({ row }) => row.original.website ? <a className="text-brand hover:underline" href={row.original.website} target="_blank" rel="noreferrer noopener">{row.original.website.replace(/^https?:\/\//, "")}</a> : <span className="text-muted-foreground">—</span> },
      { header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: "Created", accessorKey: "createdAt", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.createdAt)}</span> },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Brands"
        description="Brands belong to a customer. Choose a customer to browse its brands."
        actions={canManage && customerId && !customerArchived ? <Button asChild><Link href={`/brands/new?customerId=${customerId}`}><Plus /> New brand</Link></Button> : null}
      />
      <div className="mb-4 max-w-md space-y-1.5">
        <label htmlFor="brands-customer" className="text-[0.8125rem] font-medium">Customer</label>
        <CustomerPicker
          id="brands-customer"
          value={customer.data ? { id: customer.data.id, customerNumber: customer.data.customerNumber, displayName: customer.data.displayName } : null}
          onChange={(c) => update({ filters: { customerId: c.id, status: undefined, includeArchived: undefined }, search: "" })}
        />
        {customerId && customer.isLoading ? <Skeleton className="h-4 w-40" /> : null}
      </div>

      {!customerId ? (
        <Card><EmptyState icon={<Tag />} title="Choose a customer" description="Select a customer above to list its brands, or open a customer to manage its brands there." className="py-16" /></Card>
      ) : (
        <DataTable
          caption="Brands of the selected customer"
          columns={columns}
          result={q.data}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => q.refetch()}
          onPageChange={(page) => update({ page })}
          onPageSizeChange={(pageSize) => update({ pageSize })}
          rowKey={(b) => b.id}
          toolbar={
            <TableToolbar
              search={params.search}
              onSearchChange={(search) => update({ search })}
              searchPlaceholder="Search brands…"
              filters={
                <FilterBar activeCount={activeFilters} onReset={reset}>
                  <Select aria-label="Status" className="w-40" value={status} onValueChange={(v) => update({ filters: { status: v === ALL ? undefined : v } })} options={STATUS_OPTIONS} />
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={includeArchived || status === "ARCHIVED"} disabled={status === "ARCHIVED"} onCheckedChange={(c) => update({ filters: { includeArchived: c ? "true" : undefined } })} aria-label="Include archived" />
                    Include archived
                  </label>
                </FilterBar>
              }
            />
          }
          empty={
            activeFilters === 0 ? (
              <EmptyState title="No brands for this customer" description={customerArchived ? "Restore the customer to add brands." : "Create the first brand for this customer."} action={canManage && !customerArchived ? <Button asChild size="sm"><Link href={`/brands/new?customerId=${customerId}`}><Plus /> New brand</Link></Button> : undefined} />
            ) : (
              <EmptyState title="No matching brands" description="Nothing matches the current search and filters." action={<Button variant="secondary" size="sm" onClick={reset}>Clear filters</Button>} />
            )
          }
          rowActions={(b) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><IconButton size="sm" label={`Actions for ${b.name}`} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild><Link href={`/brands/${b.id}`}>View</Link></DropdownMenuItem>
                {canManage && b.status !== "ARCHIVED" ? <DropdownMenuItem asChild><Link href={`/brands/${b.id}/edit`}>Edit</Link></DropdownMenuItem> : null}
                {canManage && b.status !== "ARCHIVED" ? <DropdownMenuItem destructive onSelect={() => setToArchive(b)}>Archive</DropdownMenuItem> : null}
                {canManage && b.status === "ARCHIVED" ? <DropdownMenuItem disabled={restore.pending || customerArchived} onSelect={() => restore.restore(b)}>Restore</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}
      <ArchiveBrandDialog brand={toArchive} onOpenChange={(o) => !o && setToArchive(null)} />
    </>
  );
}
