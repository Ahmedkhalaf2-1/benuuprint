"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Plus, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-display/data-table";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-provider";
import { useListParams } from "@/hooks/use-list-params";

import { useOrders } from "./hooks";
import { ORDER_STATUSES, PRIORITIES, type OrderListItem } from "./types";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";
const SORTS = [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "target", label: "Target delivery" }, { value: "priority", label: "Priority" }, { value: "orderNumber", label: "Order number" }];
const FILTER_KEYS = ["status", "priority", "productionStatus", "paymentState", "delayed", "assignedSalesUserId", "createdFrom", "createdTo", "targetBefore"] as const;

export function OrdersPage() {
  const { t, fmt } = useI18n();
  const { user, can } = useAuth();
  // GET /admin/orders has a single `sort` enum (no direction parameter).
  const { params, update, toQuery } = useListParams({ sort: "newest", sortParam: "sort", directionParam: null, pageSize: 20 });
  const f = params.filters;
  const [drawer, setDrawer] = useState(false);
  const q = useOrders(toQuery as Record<string, unknown>);
  const activeCount = (params.search ? 1 : 0) + FILTER_KEYS.filter((k) => f[k]).length;
  const reset = () => update({ search: "", filters: Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])) });
  const setF = (k: (typeof FILTER_KEYS)[number], v: string | undefined) => update({ filters: { [k]: v === ALL || v === "" ? undefined : v } });
  const statuses = f.status ? f.status.split(",") : [];

  const columns = useMemo<ColumnDef<OrderListItem, unknown>[]>(() => [
    { header: t("common.order"), accessorKey: "orderNumber", cell: ({ row }) => <Link href={`/orders/${row.original.id}`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{row.original.orderNumber}{row.original.revisionNumber > 1 ? ` · r${row.original.revisionNumber}` : ""}</Link> },
    { header: t("common.customer"), id: "customer", cell: ({ row }) => row.original.customer.name },
    { header: t("common.brand2"), id: "brand", cell: ({ row }) => row.original.brand.name },
    { header: t("common.sample"), accessorKey: "sampleNumber", cell: ({ row }) => <span className="font-mono text-xs">{row.original.sampleNumber}</span> },
    { header: t("common.status"), accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: t("common.priority"), accessorKey: "priority", cell: ({ row }) => <PriorityBadge priority={row.original.priority} /> },
    {
      header: t("common.quantity"), id: "qty",
      cell: ({ row }) => (
        <div className="min-w-32">
          <p className="tabular-nums">{fmt.number(row.original.completedQuantity)} / {fmt.number(row.original.totalQuantity)}{row.original.rejectedQuantity ? <span className="text-xs text-danger">{" "}{t("orders.rejectedquantityRejected", { rejectedQuantity: row.original.rejectedQuantity })}</span> : null}</p>
          <Progress value={row.original.progressPercent} label={t("orders.ordernumberProgress", { orderNumber: row.original.orderNumber })} className="mt-1" />
        </div>
      ),
    },
    { header: t("orders.payment"), accessorKey: "paymentState", cell: ({ row }) => <StatusBadge status={row.original.paymentState} /> },
    { header: t("orders.sales"), id: "sales", cell: ({ row }) => (row.original.assignedSalesUserId ? "Assigned" : <span className="text-muted-foreground">{t("common.unassigned")}</span>) },
    {
      header: t("orders.targetDelivery"), accessorKey: "targetDeliveryDate",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {row.original.targetDeliveryDate ? fmt.date(row.original.targetDeliveryDate) : "—"}
          {row.original.isDelayed ? <span className="inline-flex items-center gap-0.5 text-xs font-medium text-tone-danger-fg"><AlertTriangle aria-hidden className="size-3" />{" "}{t("common.delayed")}</span> : null}
        </span>
      ),
    },
    { header: t("common.created"), accessorKey: "createdAt", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{fmt.date(row.original.createdAt)}</span> },
  ], [t, fmt]);

  return (
    <>
      <PageHeader title={t("orders.orders")} description={t("orders.bulkOrdersFromConfirmationToCompletion")} actions={can("orders.manage") ? <Button asChild><Link href="/orders/new"><Plus />{" "}{t("orders.newOrder")}</Link></Button> : null} />
      <DataTable
        caption={t("orders.orders")}
        columns={columns}
        result={q.data}
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(pageSize) => update({ pageSize })}
        rowKey={(o) => o.id}
        toolbar={
          <TableToolbar
            search={params.search}
            onSearchChange={(search) => update({ search })}
            searchPlaceholder={t("orders.searchOrderCustomerBrandSampleEmail")}
            filters={
              <div role="group" aria-label={t("common.filters")} className="flex flex-wrap items-center gap-2">
                <MultiSelect aria-label={t("common.status")} className="w-52" placeholder={t("common.allStatuses")} value={statuses} onValueChange={(v) => setF("status", v.join(",") || undefined)} options={ORDER_STATUSES.map((s) => ({ value: s, label: fmt.code(s) }))} />
                <Select aria-label={t("common.sortBy")} className="w-48" value={params.sort || "newest"} onValueChange={(sort) => update({ sort })} options={SORTS} />
                <Button variant="secondary" onClick={() => setDrawer(true)}><SlidersHorizontal />{" "}{t("orders.moreFilters")}{activeCount > 0 ? ` (${activeCount})` : ""}</Button>
                {activeCount > 0 ? <Button variant="ghost" size="sm" onClick={reset}><X />{" "}{t("common.clear")}</Button> : null}
              </div>
            }
          />
        }
        empty={activeCount === 0
          ? <EmptyState title={t("orders.noOrdersYet")} description={t("orders.ordersAreCreatedFromAnApproved")} />
          : <EmptyState title={t("orders.noMatchingOrders")} description={t("common.nothingMatchesTheCurrentSearchAnd")} action={<Button variant="secondary" size="sm" onClick={reset}>{t("common.clearFilters")}</Button>} />}
      />
      <Drawer open={drawer} onOpenChange={setDrawer} title={t("orders.filterOrders")} side="end">
        <div className="space-y-4 p-4">
          <div className="space-y-1.5"><Label htmlFor="o-prio">{t("common.priority")}</Label><Select id="o-prio" value={f.priority ?? ALL} onValueChange={(v) => setF("priority", v)} options={[{ value: ALL, label: t("orders.any") }, ...PRIORITIES.map((p) => ({ value: p, label: fmt.code(p) }))]} /></div>
          <div className="space-y-1.5"><Label htmlFor="o-prod">{t("common.production")}</Label><Select id="o-prod" value={f.productionStatus ?? ALL} onValueChange={(v) => setF("productionStatus", v)} options={[{ value: ALL, label: t("orders.any") }, ...["NOT_STARTED", "IN_PRODUCTION", "COMPLETED"].map((p) => ({ value: p, label: fmt.code(p) }))]} /></div>
          <div className="space-y-1.5"><Label htmlFor="o-pay">{t("orders.paymentState")}</Label><Select id="o-pay" value={f.paymentState ?? ALL} onValueChange={(v) => setF("paymentState", v)} options={[{ value: ALL, label: t("orders.any") }, ...["UNPAID", "PARTIALLY_PAID", "PAID"].map((p) => ({ value: p, label: fmt.code(p) }))]} /></div>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="o-delayed">{t("orders.delayedOnly")}</Label><Switch id="o-delayed" checked={f.delayed === "true"} onCheckedChange={(c) => setF("delayed", c ? "true" : undefined)} /></div>
          {user ? <div className="flex items-center justify-between gap-3"><Label htmlFor="o-mine">{t("common.assignedToMe")}</Label><Switch id="o-mine" checked={f.assignedSalesUserId === user.id} onCheckedChange={(c) => setF("assignedSalesUserId", c ? user.id : undefined)} /></div> : null}
          <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-1.5 text-[0.8125rem] font-medium">{t("common.created")}</legend>
            <div><Label htmlFor="o-cf" className="text-xs text-muted-foreground">{t("common.from")}</Label><DatePicker id="o-cf" value={f.createdFrom ?? ""} onChange={(e) => setF("createdFrom", e.target.value)} /></div>
            <div><Label htmlFor="o-ct" className="text-xs text-muted-foreground">{t("common.to")}</Label><DatePicker id="o-ct" value={f.createdTo ?? ""} onChange={(e) => setF("createdTo", e.target.value)} /></div>
          </fieldset>
          <div className="space-y-1.5"><Label htmlFor="o-tb">{t("orders.targetDeliveryOnOrBefore")}</Label><DatePicker id="o-tb" value={f.targetBefore ?? ""} onChange={(e) => setF("targetBefore", e.target.value)} /></div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => setDrawer(false)}>{t("orders.showResults")}</Button><Button variant="secondary" onClick={reset}>{t("orders.clearAll")}</Button></div>
        </div>
      </Drawer>
    </>
  );
}
