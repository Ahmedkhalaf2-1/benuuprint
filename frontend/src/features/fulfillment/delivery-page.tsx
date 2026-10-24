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

import { DeliveryDrawer } from "./delivery-drawer";
import { useMyDeliveries, useShipments } from "./hooks";
import { methodLabel } from "./parts";
import { SHIPMENT_STATUSES, type Shipment } from "./types";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";

/** /delivery: staff with `shipments.read` see every shipment; people with `deliveries.read_assigned` see their own deliveries (narrow view). */
export function DeliveryPage() {
  const { t } = useI18n();
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
      <PageHeader title={t("fulfillment.delivery")} description={all ? t("fulfillment.shipmentsAcrossAllOrdersAndYour") : t("fulfillment.deliveriesAssignedToYou")} />
      <Tabs value={tab} onValueChange={setTab}>
        {all && mine ? <TabsList className="mb-4" aria-label={t("fulfillment.deliverySections")}><TabsTrigger value="all">{t("fulfillment.allShipments")}</TabsTrigger><TabsTrigger value="mine">{t("fulfillment.myDeliveries")}</TabsTrigger></TabsList> : null}
        {all ? <TabsContent value="all"><AllShipments /></TabsContent> : null}
        {mine ? <TabsContent value="mine"><MyDeliveries /></TabsContent> : null}
      </Tabs>
    </>
  );
}

function AllShipments() {
  const { t, fmt } = useI18n();
  const { params, update, toQuery } = useListParams({ sort: "newest", sortParam: "sort", directionParam: null, pageSize: 20 });
  const f = params.filters;
  const query = { ...(toQuery as Record<string, string | number | undefined>), status: f.status, open: f.open, sort: undefined, tab: undefined, delivery: undefined };
  const q = useShipments(query);
  const columns: ColumnDef<Shipment, unknown>[] = [
    { header: t("fulfillment.shipment"), accessorKey: "shipmentNumber", cell: ({ row }) => <Link href={`/orders/${row.original.orderId}?tab=shipments`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{row.original.shipmentNumber}</Link> },
    { header: t("common.order"), accessorKey: "orderNumber", cell: ({ row }) => <Link href={`/orders/${row.original.orderId}`} className="font-mono text-xs hover:text-brand hover:underline">{row.original.orderNumber}</Link> },
    { header: t("common.status"), accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: t("fulfillment.recipient"), id: "recipient", cell: ({ row }) => <span>{row.original.recipientName}<span className="block text-xs text-muted-foreground">{(row.original.addressSnapshot as { city?: string } | null)?.city ?? ""}</span></span> },
    { header: t("fulfillment.method"), id: "method", cell: ({ row }) => methodLabel(row.original.deliveryMethod) },
    { header: t("fulfillment.units"), accessorKey: "totalQuantity", cell: ({ row }) => <span className="tabular-nums">{row.original.totalQuantity}</span> },
    { header: t("fulfillment.deliveryPerson"), id: "who", cell: ({ row }) => row.original.assignedDeliveryName ?? <span className="text-muted-foreground">—</span> },
    { header: t("fulfillment.dispatched"), id: "disp", cell: ({ row }) => (row.original.dispatchedAt ? fmt.date(row.original.dispatchedAt) : "—") },
    { header: t("fulfillment.delivered"), id: "del", cell: ({ row }) => (row.original.deliveredAt ? fmt.date(row.original.deliveredAt) : "—") },
  ];
  return (
    <DataTable
      caption={t("fulfillment.shipments")} columns={columns} result={q.data} isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}
      onPageChange={(page) => update({ page })} onPageSizeChange={(pageSize) => update({ pageSize })} rowKey={(s) => s.id}
      toolbar={<TableToolbar search={params.search} onSearchChange={(search) => update({ search })} searchPlaceholder={t("fulfillment.searchShipmentOrderRecipient")} filters={<>
        <Select aria-label={t("common.status")} className="w-44" value={f.status ?? ALL} onValueChange={(v) => update({ filters: { status: v === ALL ? undefined : v } })} options={[{ value: ALL, label: t("common.allStatuses") }, ...SHIPMENT_STATUSES.map((s) => ({ value: s, label: fmt.code(s) }))]} />
        <label className="flex items-center gap-2 text-sm"><Switch aria-label={t("fulfillment.openOnly")} checked={f.open === "true"} onCheckedChange={(c) => update({ filters: { open: c ? "true" : undefined } })} />{" "}{t("fulfillment.openOnly")}</label>
      </>} />}
      empty={<EmptyState title={t("fulfillment.noShipments")} description={t("fulfillment.shipmentsAreCreatedFromAnOrder")} />}
    />
  );
}

function MyDeliveries() {
  const { t, fmt } = useI18n();
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
      <label className="flex items-center gap-2 text-sm"><Switch aria-label={t("fulfillment.showFinished")} checked={finished} onCheckedChange={(c) => nav({ finished: c ? "1" : null })} />{" "}{t("fulfillment.showFinishedDeliveries")}</label>
      {list.length === 0 ? <EmptyState title={t("fulfillment.nothingToDeliver")} description={t("fulfillment.deliveriesAssignedToYouAppearHere")} /> : (
        <ul className="space-y-2" data-testid="my-deliveries">
          {list.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => nav({ delivery: d.id })} data-status={d.status} className="flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-surface px-3 py-2.5 text-start hover:bg-surface-muted">
                <span className="font-mono text-xs font-semibold">{d.shipmentNumber}</span>
                <span className="min-w-0 flex-1"><span className="font-medium">{d.recipientName}</span><span className="block text-xs text-muted-foreground">{(d.address as { city?: string } | null)?.city ?? ""}{" "}{t("fulfillment.totalquantityUnitsDeliverymethod", { totalQuantity: d.totalQuantity, deliveryMethod: methodLabel(d.deliveryMethod) })}</span></span>
                {d.scheduledAt ? <span className="text-xs text-muted-foreground">{fmt.date(d.scheduledAt)}</span> : null}
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
