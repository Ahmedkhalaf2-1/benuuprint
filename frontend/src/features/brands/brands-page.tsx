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
import { humanizeCode } from "@/lib/utils/format";
import { ArchiveBrandDialog, useRestoreBrandAction } from "./brand-actions";
import { useCustomerBrands } from "./hooks";
import type { Brand } from "./types";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";
const STATUS_OPTIONS = [{ value: ALL, label: "All statuses" }, ...["ACTIVE", "INACTIVE", "ARCHIVED"].map((s) => ({ value: s, label: humanizeCode(s) }))];

/**
 * The backend has no global brand list: brands are listed per customer. The selected customer lives in the
 * URL (?customerId=) so the view is shareable.
 */
export function BrandsPage() {
  const { t, fmt } = useI18n();
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
      { header: t("common.number"), accessorKey: "brandNumber", cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.brandNumber}</span> },
      { header: t("common.name"), accessorKey: "name", cell: ({ row }) => <Link href={`/brands/${row.original.id}`} className="font-medium hover:text-brand hover:underline">{row.original.name}</Link> },
      { header: t("brands.instagram"), accessorKey: "instagram", cell: ({ row }) => row.original.instagram ? `@${row.original.instagram}` : <span className="text-muted-foreground">—</span> },
      { header: t("brands.website"), accessorKey: "website", cell: ({ row }) => row.original.website ? <a className="text-brand hover:underline" href={row.original.website} target="_blank" rel="noreferrer noopener">{row.original.website.replace(/^https?:\/\//, "")}</a> : <span className="text-muted-foreground">—</span> },
      { header: t("common.status"), accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: t("common.created"), accessorKey: "createdAt", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{fmt.date(row.original.createdAt)}</span> },
    ],
    [t, fmt],
  );

  return (
    <>
      <PageHeader
        title={t("brands.brands")}
        description={t("brands.brandsBelongToACustomerChoose")}
        actions={canManage && customerId && !customerArchived ? <Button asChild><Link href={`/brands/new?customerId=${customerId}`}><Plus />{" "}{t("brands.newBrand")}</Link></Button> : null}
      />
      <div className="mb-4 max-w-md space-y-1.5">
        <label htmlFor="brands-customer" className="text-[0.8125rem] font-medium">{t("common.customer")}</label>
        <CustomerPicker
          id="brands-customer"
          value={customer.data ? { id: customer.data.id, customerNumber: customer.data.customerNumber, displayName: customer.data.displayName } : null}
          onChange={(c) => update({ filters: { customerId: c.id, status: undefined, includeArchived: undefined }, search: "" })}
        />
        {customerId && customer.isLoading ? <Skeleton className="h-4 w-40" /> : null}
      </div>

      {!customerId ? (
        <Card><EmptyState icon={<Tag />} title={t("brands.chooseACustomer")} description={t("brands.selectACustomerAboveToList")} className="py-16" /></Card>
      ) : (
        <DataTable
          caption={t("brands.brandsOfTheSelectedCustomer")}
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
              searchPlaceholder={t("brands.searchBrands")}
              filters={
                <FilterBar activeCount={activeFilters} onReset={reset}>
                  <Select aria-label={t("common.status")} className="w-40" value={status} onValueChange={(v) => update({ filters: { status: v === ALL ? undefined : v } })} options={STATUS_OPTIONS} />
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={includeArchived || status === "ARCHIVED"} disabled={status === "ARCHIVED"} onCheckedChange={(c) => update({ filters: { includeArchived: c ? "true" : undefined } })} aria-label={t("common.includeArchived")} />{t("common.includeArchived")}</label>
                </FilterBar>
              }
            />
          }
          empty={
            activeFilters === 0 ? (
              <EmptyState title={t("brands.noBrandsForThisCustomer")} description={customerArchived ? t("brands.restoreTheCustomerToAddBrands") : t("brands.createTheFirstBrandForThis")} action={canManage && !customerArchived ? <Button asChild size="sm"><Link href={`/brands/new?customerId=${customerId}`}><Plus />{" "}{t("brands.newBrand")}</Link></Button> : undefined} />
            ) : (
              <EmptyState title={t("brands.noMatchingBrands")} description={t("common.nothingMatchesTheCurrentSearchAnd")} action={<Button variant="secondary" size="sm" onClick={reset}>{t("common.clearFilters")}</Button>} />
            )
          }
          rowActions={(b) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><IconButton size="sm" label={t("brands.actionsForName", { name: b.name })} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild><Link href={`/brands/${b.id}`}>{t("common.view")}</Link></DropdownMenuItem>
                {canManage && b.status !== "ARCHIVED" ? <DropdownMenuItem asChild><Link href={`/brands/${b.id}/edit`}>{t("common.edit")}</Link></DropdownMenuItem> : null}
                {canManage && b.status !== "ARCHIVED" ? <DropdownMenuItem destructive onSelect={() => setToArchive(b)}>{t("brands.archive")}</DropdownMenuItem> : null}
                {canManage && b.status === "ARCHIVED" ? <DropdownMenuItem disabled={restore.pending || customerArchived} onSelect={() => restore.restore(b)}>{t("brands.restore")}</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}
      <ArchiveBrandDialog brand={toArchive} onOpenChange={(o) => !o && setToArchive(null)} />
    </>
  );
}
