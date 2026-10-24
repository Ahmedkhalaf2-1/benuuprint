"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { AccessDeniedState, EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { useListParams } from "@/hooks/use-list-params";
import { formatDate, humanizeCode } from "@/lib/utils/format";
import { DeliveryDrawer } from "./delivery-drawer";
import { useMyDeliveries, useShipments } from "./hooks";
import { methodLabel } from "./parts";
import { SHIPMENT_STATUSES, type Shipment } from "./types";

const ALL = "__all";

/** /delivery: staff with `shipments.read` see every shipment; people with `deliveries.read_assigned` see their own deliveries (narrow view). */
export function DeliveryPage() {
  const { can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const all = can("shipments.read"), mine = can("deliveries.read_assigned");
  const tab = sp.get("tab") === "mine" || !all ? "mine" : "all";
  const setTab = (t: string) => { const p = new URLSearchParams(sp.toString()); if (t === "all") p.delete("tab"); else p.set("tab", t); p.delete("delivery"); router.replace(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false }); };
  if (!all && !mine) return <AccessDeniedState />;
  return (
    <>
      <PageHeader title="Delivery" description={all ? "Shipments across all orders, and your own deliveries." : "Deliveries assigned to you."} />
      <Tabs value={tab} onValueChange={setTab}>
        {all && mine ? <TabsList className="mb-4" aria-label="Delivery sections"><TabsTrigger value="all">All shipments</TabsTrigger><TabsTrigger value="mine">My deliveries</TabsTrigger></TabsList> : null}
        {all ? <TabsContent value="all"><AllShipments /></TabsContent> : null}
        {mine ? <TabsContent value="mine"><MyDeliveries /></TabsContent> : null}
      </Tabs>
    </>
  );
}

function AllShipments() {
  const { params, update, toQuery } = useListParams({ sort: "newest", sortParam: "sort", directionParam: null, pageSize: 20 });
  const f = params.filters;
  const query = { ...(toQuery as Record<string, string | number | undefined>), status: f.status, open: f.open, sort: undefined, tab: undefined, delivery: undefined };
  const q = useShipments(query);
  const columns: ColumnDef<Shipment, unknown>[] = [
    { header: "Shipment", accessorKey: "shipmentNumber", cell: ({ row }) => <Link href={`/orders/${row.original.orderId}?tab=shipments`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{row.original.shipmentNumber}</Link> },
    { header: "Order", accessorKey: "orderNumber", cell: ({ row }) => <Link href={`/orders/${row.original.orderId}`} className="font-mono text-xs hover:text-brand hover:underline">{row.original.orderNumber}</Link> },
    { header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: "Recipient", id: "recipient", cell: ({ row }) => <span>{row.original.recipientName}<span className="block text-xs text-muted-foreground">{(row.original.addressSnapshot as { city?: string } | null)?.city ?? ""}</span></span> },
    { header: "Method", id: "method", cell: ({ row }) => methodLabel(row.original.deliveryMethod) },
    { header: "Units", accessorKey: "totalQuantity", cell: ({ row }) => <span className="tabular-nums">{row.original.totalQuantity}</span> },
    { header: "Delivery person", id: "who", cell: ({ row }) => row.original.assignedDeliveryName ?? <span className="text-muted-foreground">—</span> },
    { header: "Dispatched", id: "disp", cell: ({ row }) => (row.original.dispatchedAt ? formatDate(row.original.dispatchedAt) : "—") },
    { header: "Delivered", id: "del", cell: ({ row }) => (row.original.deliveredAt ? formatDate(row.original.deliveredAt) : "—") },
  ];
  return (
    <DataTable
      caption="Shipments" columns={columns} result={q.data} isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}
      onPageChange={(page) => update({ page })} onPageSizeChange={(pageSize) => update({ pageSize })} rowKey={(s) => s.id}
      toolbar={<TableToolbar search={params.search} onSearchChange={(search) => update({ search })} searchPlaceholder="Search shipment, order, recipient…" filters={<>
        <Select aria-label="Status" className="w-44" value={f.status ?? ALL} onValueChange={(v) => update({ filters: { status: v === ALL ? undefined : v } })} options={[{ value: ALL, label: "All statuses" }, ...SHIPMENT_STATUSES.map((s) => ({ value: s, label: humanizeCode(s) }))]} />
        <label className="flex items-center gap-2 text-sm"><Switch aria-label="Open only" checked={f.open === "true"} onCheckedChange={(c) => update({ filters: { open: c ? "true" : undefined } })} /> Open only</label>
      </>} />}
      empty={<EmptyState title="No shipments" description="Shipments are created from an order once units are packed." />}
    />
  );
}

function MyDeliveries() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const finished = sp.get("finished") === "1";
  const open = sp.get("delivery");
  const q = useMyDeliveries({ pageSize: 50, ...(finished ? { includeFinished: true } : {}) });
  const nav = (patch: Record<string, string | null>) => { const p = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v); } router.replace(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false }); };
  if (q.isLoading) return <PageSkeleton />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const list = q.data?.data ?? [];
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm"><Switch aria-label="Show finished" checked={finished} onCheckedChange={(c) => nav({ finished: c ? "1" : null })} /> Show finished deliveries</label>
      {list.length === 0 ? <EmptyState title="Nothing to deliver" description="Deliveries assigned to you appear here." /> : (
        <ul className="space-y-2" data-testid="my-deliveries">
          {list.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => nav({ delivery: d.id })} data-status={d.status} className="flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-surface px-3 py-2.5 text-start hover:bg-surface-muted">
                <span className="font-mono text-xs font-semibold">{d.shipmentNumber}</span>
                <span className="min-w-0 flex-1"><span className="font-medium">{d.recipientName}</span><span className="block text-xs text-muted-foreground">{(d.address as { city?: string } | null)?.city ?? ""} · {d.totalQuantity} units · {methodLabel(d.deliveryMethod)}</span></span>
                {d.scheduledAt ? <span className="text-xs text-muted-foreground">{formatDate(d.scheduledAt)}</span> : null}
                <StatusBadge status={d.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open ? <DeliveryDrawer id={open} onClose={() => nav({ delivery: null })} /> : null}
    </div>
  );
}
