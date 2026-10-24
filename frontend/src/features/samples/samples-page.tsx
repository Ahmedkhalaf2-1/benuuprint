"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Label } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-provider";
import { CustomerPicker } from "@/features/customers/customer-picker";
import { useCustomer } from "@/features/customers/hooks";
import { useConfiguratorOptions } from "@/features/master-data/hooks";
import { useListParams } from "@/hooks/use-list-params";
import { formatDate, humanizeCode } from "@/lib/utils/format";
import { useSamples } from "./hooks";
import { productLabel } from "./labels";
import { PAYMENT_STATES, SAMPLE_STATUSES, type SampleListItem } from "./types";

const ALL = "__all";
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "submitted", label: "Recently submitted" },
  { value: "sampleNumber", label: "Sample number" },
];
const APPROVAL_STATES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED"];
const dash = <span className="text-muted-foreground">—</span>;

/** Filters the backend can execute (verified against GET /admin/samples). Everything lives in the URL. */
const FILTER_KEYS = ["status", "customerId", "productTypeId", "fabricId", "paymentState", "approvalState", "unassigned", "assignedSalesUserId", "createdFrom", "createdTo", "submittedFrom", "submittedTo", "includeArchived"] as const;

export function SamplesPage() {
  const { can, user } = useAuth();
  const canManage = can("samples.manage");
  // GET /admin/samples has a single `sort` enum: sending a direction is a 400, so the hook omits it.
  const { params, update, toQuery } = useListParams({ sort: "newest", sortParam: "sort", directionParam: null, pageSize: 20 });
  const f = params.filters;
  const [drawer, setDrawer] = useState(false);
  const config = useConfiguratorOptions();
  const customer = useCustomer(f.customerId ?? "");

  const query = useMemo(() => ({ ...(toQuery as Record<string, string | number | undefined>), includeArchived: f.includeArchived === "true" || undefined }), [toQuery, f.includeArchived]);
  const q = useSamples(query);
  const activeCount = (params.search ? 1 : 0) + FILTER_KEYS.filter((k) => f[k]).length;
  const reset = () => update({ search: "", filters: Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])) });
  const setF = (k: (typeof FILTER_KEYS)[number], v: string | undefined) => update({ filters: { [k]: v === ALL || v === "" ? undefined : v } });
  const statuses = f.status ? f.status.split(",") : [];

  const columns = useMemo<ColumnDef<SampleListItem, unknown>[]>(
    () => [
      { header: "Sample", accessorKey: "sampleNumber", cell: ({ row }) => <Link href={`/samples/${row.original.id}`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{row.original.sampleNumber}{row.original.revisionNumber > 1 ? ` · r${row.original.revisionNumber}` : ""}</Link> },
      { header: "Customer", id: "customer", cell: ({ row }) => <Link href={`/customers/${row.original.customer.id}`} className="hover:text-brand hover:underline">{row.original.customer.displayName}</Link> },
      { header: "Brand", id: "brand", cell: ({ row }) => row.original.brand.name },
      { header: "Product", id: "product", cell: ({ row }) => productLabel(row.original) ?? dash },
      { header: "Fabric", id: "fabric", cell: ({ row }) => row.original.fabric?.name ?? (row.original.customFabricName ? `${row.original.customFabricName} (custom)` : dash) },
      { header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: "Payment", accessorKey: "paymentState", cell: ({ row }) => <StatusBadge status={row.original.paymentState} /> },
      { header: "Sales", id: "sales", cell: ({ row }) => row.original.assignedSales?.name ?? <span className="text-muted-foreground">Unassigned</span> },
      { header: "Submitted", accessorKey: "submittedAt", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.submittedAt ? formatDate(row.original.submittedAt) : "—"}</span> },
      { header: "Updated", accessorKey: "updatedAt", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.updatedAt)}</span> },
    ],
    [],
  );

  const productOptions = [{ value: ALL, label: "All products" }, ...(config.data?.productTypes ?? []).map((p) => ({ value: p.id, label: p.name }))];
  const fabricOptions = [{ value: ALL, label: "All fabrics" }, ...(config.data?.fabrics ?? []).map((p) => ({ value: p.id, label: p.name }))];

  return (
    <>
      <PageHeader
        title="Samples"
        description="Sample requests from draft to approval."
        actions={canManage ? <Button asChild><Link href="/samples/new"><Plus /> New sample</Link></Button> : null}
      />
      <DataTable
        caption="Samples"
        columns={columns}
        result={q.data}
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(pageSize) => update({ pageSize })}
        rowKey={(s) => s.id}
        toolbar={
          <TableToolbar
            search={params.search}
            onSearchChange={(search) => update({ search })}
            searchPlaceholder="Search number, customer, brand, email, phone…"
            filters={
              <div role="group" aria-label="Filters" className="flex flex-wrap items-center gap-2">
                <MultiSelect aria-label="Status" className="w-48" placeholder="All statuses" value={statuses} onValueChange={(v) => setF("status", v.join(",") || undefined)} options={SAMPLE_STATUSES.map((s) => ({ value: s, label: humanizeCode(s) }))} />
                <Select aria-label="Sort by" className="w-48" value={params.sort || "newest"} onValueChange={(sort) => update({ sort })} options={SORTS} />
                <Button variant="secondary" onClick={() => setDrawer(true)}><SlidersHorizontal /> More filters{activeCount > 0 ? ` (${activeCount})` : ""}</Button>
                {activeCount > 0 ? <Button variant="ghost" size="sm" onClick={reset}><X /> Clear</Button> : null}
              </div>
            }
          />
        }
        empty={
          activeCount === 0 ? (
            <EmptyState title="No samples yet" description={canManage ? "Create the first sample request." : "No samples have been created yet."} action={canManage ? <Button asChild size="sm"><Link href="/samples/new"><Plus /> New sample</Link></Button> : undefined} />
          ) : (
            <EmptyState title="No matching samples" description="Nothing matches the current search and filters." action={<Button variant="secondary" size="sm" onClick={reset}>Clear filters</Button>} />
          )
        }
        rowActions={(s) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><IconButton size="sm" label={`Actions for ${s.sampleNumber}`} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild><Link href={`/samples/${s.id}`}>View</Link></DropdownMenuItem>
              {canManage && s.status === "DRAFT" ? <DropdownMenuItem asChild><Link href={`/samples/${s.id}/edit`}>Edit draft</Link></DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <Drawer open={drawer} onOpenChange={setDrawer} title="Filter samples" side="end">
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="f-customer">Customer</Label>
            <CustomerPicker id="f-customer" value={customer.data ? { id: customer.data.id, customerNumber: customer.data.customerNumber, displayName: customer.data.displayName } : null} onChange={(c) => setF("customerId", c.id)} />
            {f.customerId ? <Button variant="link" onClick={() => setF("customerId", undefined)}>Remove customer filter</Button> : null}
          </div>
          <div className="space-y-1.5"><Label htmlFor="f-product">Product type</Label><Select id="f-product" value={f.productTypeId ?? ALL} onValueChange={(v) => setF("productTypeId", v)} options={productOptions} /></div>
          <div className="space-y-1.5"><Label htmlFor="f-fabric">Fabric</Label><Select id="f-fabric" value={f.fabricId ?? ALL} onValueChange={(v) => setF("fabricId", v)} options={fabricOptions} /></div>
          <div className="space-y-1.5"><Label htmlFor="f-pay">Payment state</Label><Select id="f-pay" value={f.paymentState ?? ALL} onValueChange={(v) => setF("paymentState", v)} options={[{ value: ALL, label: "Any" }, ...PAYMENT_STATES.map((s) => ({ value: s, label: humanizeCode(s) }))]} /></div>
          <div className="space-y-1.5"><Label htmlFor="f-appr">Has an approval request that is…</Label><Select id="f-appr" value={f.approvalState ?? ALL} onValueChange={(v) => setF("approvalState", v)} options={[{ value: ALL, label: "Any" }, ...APPROVAL_STATES.map((s) => ({ value: s, label: humanizeCode(s) }))]} /></div>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="f-unassigned">Unassigned (no sales owner)</Label><Switch id="f-unassigned" checked={f.unassigned === "true"} onCheckedChange={(c) => update({ filters: { unassigned: c ? "true" : undefined, assignedSalesUserId: c ? undefined : f.assignedSalesUserId } })} /></div>
          {user ? <div className="flex items-center justify-between gap-3"><Label htmlFor="f-mine">Assigned to me</Label><Switch id="f-mine" checked={f.assignedSalesUserId === user.id} onCheckedChange={(c) => update({ filters: { assignedSalesUserId: c ? user.id : undefined, unassigned: c ? undefined : f.unassigned } })} /></div> : null}
          <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-1.5 text-[0.8125rem] font-medium">Created</legend>
            <div><Label htmlFor="f-cf" className="text-xs text-muted-foreground">From</Label><DatePicker id="f-cf" value={f.createdFrom ?? ""} onChange={(e) => setF("createdFrom", e.target.value)} /></div>
            <div><Label htmlFor="f-ct" className="text-xs text-muted-foreground">To</Label><DatePicker id="f-ct" value={f.createdTo ?? ""} onChange={(e) => setF("createdTo", e.target.value)} /></div>
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-1.5 text-[0.8125rem] font-medium">Submitted</legend>
            <div><Label htmlFor="f-sf" className="text-xs text-muted-foreground">From</Label><DatePicker id="f-sf" value={f.submittedFrom ?? ""} onChange={(e) => setF("submittedFrom", e.target.value)} /></div>
            <div><Label htmlFor="f-st" className="text-xs text-muted-foreground">To</Label><DatePicker id="f-st" value={f.submittedTo ?? ""} onChange={(e) => setF("submittedTo", e.target.value)} /></div>
          </fieldset>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="f-arch">Include archived</Label><Switch id="f-arch" checked={f.includeArchived === "true"} onCheckedChange={(c) => setF("includeArchived", c ? "true" : undefined)} /></div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => setDrawer(false)}>Show results</Button><Button variant="secondary" onClick={reset}>Clear all</Button></div>
        </div>
      </Drawer>
    </>
  );
}
