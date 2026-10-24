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
import { formatDate, formatNumber, humanizeCode } from "@/lib/utils/format";
import { useOrders } from "./hooks";
import { ORDER_STATUSES, PRIORITIES, type OrderListItem } from "./types";

const ALL = "__all";
const SORTS = [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "target", label: "Target delivery" }, { value: "priority", label: "Priority" }, { value: "orderNumber", label: "Order number" }];
const FILTER_KEYS = ["status", "priority", "productionStatus", "paymentState", "delayed", "assignedSalesUserId", "createdFrom", "createdTo", "targetBefore"] as const;

export function OrdersPage() {
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
    { header: "Order", accessorKey: "orderNumber", cell: ({ row }) => <Link href={`/orders/${row.original.id}`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{row.original.orderNumber}{row.original.revisionNumber > 1 ? ` · r${row.original.revisionNumber}` : ""}</Link> },
    { header: "Customer", id: "customer", cell: ({ row }) => row.original.customer.name },
    { header: "Brand", id: "brand", cell: ({ row }) => row.original.brand.name },
    { header: "Sample", accessorKey: "sampleNumber", cell: ({ row }) => <span className="font-mono text-xs">{row.original.sampleNumber}</span> },
    { header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: "Priority", accessorKey: "priority", cell: ({ row }) => <PriorityBadge priority={row.original.priority} /> },
    {
      header: "Quantity", id: "qty",
      cell: ({ row }) => (
        <div className="min-w-32">
          <p className="tabular-nums">{formatNumber(row.original.completedQuantity)} / {formatNumber(row.original.totalQuantity)}{row.original.rejectedQuantity ? <span className="text-xs text-danger"> · {row.original.rejectedQuantity} rejected</span> : null}</p>
          <Progress value={row.original.progressPercent} label={`${row.original.orderNumber} progress`} className="mt-1" />
        </div>
      ),
    },
    { header: "Payment", accessorKey: "paymentState", cell: ({ row }) => <StatusBadge status={row.original.paymentState} /> },
    { header: "Sales", id: "sales", cell: ({ row }) => (row.original.assignedSalesUserId ? "Assigned" : <span className="text-muted-foreground">Unassigned</span>) },
    {
      header: "Target delivery", accessorKey: "targetDeliveryDate",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {row.original.targetDeliveryDate ? formatDate(row.original.targetDeliveryDate) : "—"}
          {row.original.isDelayed ? <span className="inline-flex items-center gap-0.5 text-xs font-medium text-tone-danger-fg"><AlertTriangle aria-hidden className="size-3" /> Delayed</span> : null}
        </span>
      ),
    },
    { header: "Created", accessorKey: "createdAt", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.createdAt)}</span> },
  ], []);

  return (
    <>
      <PageHeader title="Orders" description="Bulk orders from confirmation to completion. Orders are created from an approved sample." actions={can("orders.manage") ? <Button asChild><Link href="/orders/new"><Plus /> New order</Link></Button> : null} />
      <DataTable
        caption="Orders"
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
            searchPlaceholder="Search order, customer, brand, sample, email, phone…"
            filters={
              <div role="group" aria-label="Filters" className="flex flex-wrap items-center gap-2">
                <MultiSelect aria-label="Status" className="w-52" placeholder="All statuses" value={statuses} onValueChange={(v) => setF("status", v.join(",") || undefined)} options={ORDER_STATUSES.map((s) => ({ value: s, label: humanizeCode(s) }))} />
                <Select aria-label="Sort by" className="w-48" value={params.sort || "newest"} onValueChange={(sort) => update({ sort })} options={SORTS} />
                <Button variant="secondary" onClick={() => setDrawer(true)}><SlidersHorizontal /> More filters{activeCount > 0 ? ` (${activeCount})` : ""}</Button>
                {activeCount > 0 ? <Button variant="ghost" size="sm" onClick={reset}><X /> Clear</Button> : null}
              </div>
            }
          />
        }
        empty={activeCount === 0
          ? <EmptyState title="No orders yet" description="Orders are created from an approved sample (open the sample and choose “Create bulk order”)." />
          : <EmptyState title="No matching orders" description="Nothing matches the current search and filters." action={<Button variant="secondary" size="sm" onClick={reset}>Clear filters</Button>} />}
      />
      <Drawer open={drawer} onOpenChange={setDrawer} title="Filter orders" side="end">
        <div className="space-y-4 p-4">
          <div className="space-y-1.5"><Label htmlFor="o-prio">Priority</Label><Select id="o-prio" value={f.priority ?? ALL} onValueChange={(v) => setF("priority", v)} options={[{ value: ALL, label: "Any" }, ...PRIORITIES.map((p) => ({ value: p, label: humanizeCode(p) }))]} /></div>
          <div className="space-y-1.5"><Label htmlFor="o-prod">Production</Label><Select id="o-prod" value={f.productionStatus ?? ALL} onValueChange={(v) => setF("productionStatus", v)} options={[{ value: ALL, label: "Any" }, ...["NOT_STARTED", "IN_PRODUCTION", "COMPLETED"].map((p) => ({ value: p, label: humanizeCode(p) }))]} /></div>
          <div className="space-y-1.5"><Label htmlFor="o-pay">Payment state</Label><Select id="o-pay" value={f.paymentState ?? ALL} onValueChange={(v) => setF("paymentState", v)} options={[{ value: ALL, label: "Any" }, ...["UNPAID", "PARTIALLY_PAID", "PAID"].map((p) => ({ value: p, label: humanizeCode(p) }))]} /></div>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="o-delayed">Delayed only</Label><Switch id="o-delayed" checked={f.delayed === "true"} onCheckedChange={(c) => setF("delayed", c ? "true" : undefined)} /></div>
          {user ? <div className="flex items-center justify-between gap-3"><Label htmlFor="o-mine">Assigned to me</Label><Switch id="o-mine" checked={f.assignedSalesUserId === user.id} onCheckedChange={(c) => setF("assignedSalesUserId", c ? user.id : undefined)} /></div> : null}
          <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-1.5 text-[0.8125rem] font-medium">Created</legend>
            <div><Label htmlFor="o-cf" className="text-xs text-muted-foreground">From</Label><DatePicker id="o-cf" value={f.createdFrom ?? ""} onChange={(e) => setF("createdFrom", e.target.value)} /></div>
            <div><Label htmlFor="o-ct" className="text-xs text-muted-foreground">To</Label><DatePicker id="o-ct" value={f.createdTo ?? ""} onChange={(e) => setF("createdTo", e.target.value)} /></div>
          </fieldset>
          <div className="space-y-1.5"><Label htmlFor="o-tb">Target delivery on or before</Label><DatePicker id="o-tb" value={f.targetBefore ?? ""} onChange={(e) => setF("targetBefore", e.target.value)} /></div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => setDrawer(false)}>Show results</Button><Button variant="secondary" onClick={reset}>Clear all</Button></div>
        </div>
      </Drawer>
    </>
  );
}
