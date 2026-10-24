"use client";

import { Lock, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, DetailSkeleton, ErrorState } from "@/components/feedback/states";
import { DetailHeader, InfoGrid, InfoItem } from "@/components/layout/detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { CommercialSection } from "@/features/commercial/commercial-section";
import { useConfiguratorOptions } from "@/features/master-data/hooks";
import { StaffAssignDialog } from "@/features/samples/assign-sales-dialog";
import { useSample } from "@/features/samples/hooks";
import { isApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import * as api from "./api";
import { BatchesPanel } from "./batches-panel";
import { HistoryPanel } from "./history-panel";
import { useOrder, useOrderInvalidation } from "./hooks";
import { ConfirmOrderDialog, ORDER_ACTIONS, OrderActionDialog, PriorityDialog, ReorderDialog, ReviseDialog, type ActionMeta } from "./order-actions";
import { FulfillmentCard } from "@/features/fulfillment/fulfillment-card";
import { PackagingPanel } from "@/features/fulfillment/packaging-panel";
import { ShipmentsPanel } from "@/features/fulfillment/shipments-panel";
import { TrackingPanel } from "@/features/fulfillment/tracking-panel";
import { ProcessPanel } from "@/features/responsibilities/process-panel";
import { ProductionPanel } from "./production-panel";
import { ReadinessCard, ReapprovalBanner } from "./readiness";
import { SpecPanel } from "./spec-panel";
import { VariantsEditor, VariantsTable } from "./variants-editor";

const TERMINAL = ["CANCELLED", "COMPLETED", "DELIVERED"];
const TABS = ["overview", "variants", "spec", "batches", "production", "packaging", "shipments", "tracking", "commercial", "history"] as const;
type Tab = (typeof TABS)[number];

export function OrderDetailPage({ id }: { id: string }) {
  const { can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = useOrder(id);
  const inv = useOrderInvalidation();
  const sample = useSample(q.data?.sourceSampleId);
  const config = useConfiguratorOptions();
  const [action, setAction] = useState<ActionMeta | null>(null);
  const [dialog, setDialog] = useState<"confirm" | "revise" | "priority" | "reorder" | "assign" | null>(null);

  const showCommercial = can("orders.commercial.read");
  const showBatches = can("order_batches.read");
  const showPackaging = can("packaging.manage"), showShipments = can("shipments.read"), showTracking = can("public_tracking.manage");
  const tabs = useMemo(() => TABS.filter((t) => (t !== "commercial" || showCommercial) && (t !== "batches" || showBatches) && (t !== "packaging" || showPackaging) && (t !== "shipments" || showShipments) && (t !== "tracking" || showTracking)), [showCommercial, showBatches, showPackaging, showShipments, showTracking]);
  const requested = sp.get("tab") as Tab | null;
  const tab: Tab = requested && tabs.includes(requested) ? requested : "overview";
  const setTab = (t: string) => router.replace(t === "overview" ? pathname : `${pathname}?tab=${t}`, { scroll: false });

  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && q.error.kind === "forbidden") return <AccessDeniedState />;
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title="Order not found" error={q.error} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const o = q.data;
  if (!o) return null;

  // Colours of the approved sample's fabric (catalogue colours of any other fabric are refused by the backend).
  const fabricId = sample.data?.fabric?.id;
  const fabricColors = (config.data?.fabrics.find((f) => f.id === fabricId)?.colors ?? []).map((c) => ({ id: c.id, name: c.name, hex: c.hex, pantone: c.pantone }));

  const manage = can("orders.manage");
  const status = o.status;
  const open = !TERMINAL.includes(status);
  const confirmed = !!o.confirmedAt;
  const isDraft = status === "DRAFT";
  const meta = (k: string) => ORDER_ACTIONS[k]!;
  const canRevise = manage && confirmed && !["DRAFT", "PENDING_CONFIRMATION", "ON_HOLD", ...TERMINAL].includes(status);

  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: "Orders", href: "/orders" }, { label: o.orderNumber }]}
        reference={`${o.orderNumber}${o.revisionNumber > 1 ? ` · revision ${o.revisionNumber}` : ""}`}
        title={o.items[0]?.productName ?? "Order"}
        status={<><StatusBadge status={status} /><PriorityBadge priority={o.priority} /><StatusBadge status={o.paymentState} /></>}
        meta={
          <span className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span>Customer <Link href={`/customers/${o.customer.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{o.customer.name}</Link></span>
            <span>Brand <Link href={`/brands/${o.brand.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{o.brand.name}</Link></span>
            <span>Sample <Link href={`/samples/${o.sourceSampleId}`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{o.sampleNumber}</Link></span>
            {o.reorderOfOrderId ? <span>Reorder of <Link href={`/orders/${o.reorderOfOrderId}`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{o.reorderOfOrderNumber}</Link></span> : null}
          </span>
        }
        actions={
          <>
            {manage && isDraft ? <Button onClick={() => setAction(meta("submit"))}>{meta("submit").label}</Button> : null}
            {can("orders.confirm") && status === "PENDING_CONFIRMATION" ? <Button onClick={() => setDialog("confirm")}>Confirm order</Button> : null}
            {manage && status === "PENDING_CONFIRMATION" ? <Button variant="secondary" onClick={() => setAction(meta("request-changes"))}>{meta("request-changes").label}</Button> : null}
            {manage && status === "CONFIRMED" ? <Button onClick={() => setAction(meta("ready"))}>{meta("ready").label}</Button> : null}
            {canRevise ? <Button variant="secondary" onClick={() => setDialog("revise")}>Revise</Button> : null}
            {manage && status === "ON_HOLD" ? <Button onClick={() => setAction(meta("resume"))}>Resume</Button> : null}
            {manage && open && confirmed && status !== "ON_HOLD" ? <Button variant="secondary" onClick={() => setAction(meta("hold"))}>Put on hold</Button> : null}
            {manage && open ? <Button variant="secondary" onClick={() => setDialog("priority")}>Priority</Button> : null}
            {manage && open ? <Button variant="secondary" onClick={() => setDialog("assign")}><UserPlus /> Sales owner</Button> : null}
            {can("orders.reorder") && confirmed ? <Button variant="secondary" onClick={() => setDialog("reorder")}>Reorder</Button> : null}
            {can("orders.override") && ["PRODUCTION_COMPLETED", "READY_FOR_PACKAGING", "PACKAGING", "READY_FOR_DELIVERY", "PARTIALLY_SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status) ? <Button variant="secondary" className="border-danger text-danger" onClick={() => setAction(meta("force-complete"))}>Force complete (override)</Button> : null}
            {can("orders.cancel") && open ? <Button variant="secondary" className="text-danger" onClick={() => setAction(meta("cancel"))}>Cancel order</Button> : null}
          </>
        }
      />
      {status === "ON_HOLD" && o.holdReason ? <p role="status" className="mb-4 rounded-md bg-tone-warning-bg px-3 py-2 text-sm text-tone-warning-fg"><span className="font-medium">On hold:</span> {o.holdReason}</p> : null}
      {status === "CANCELLED" ? <p role="status" className="mb-4 rounded-md bg-tone-neutral-bg px-3 py-2 text-sm text-tone-neutral-fg"><span className="font-medium">Cancelled</span>{o.cancelledAt ? ` ${formatDateTime(o.cancelledAt)}` : ""}{o.cancellationReason ? `: ${o.cancellationReason}` : ""}</p> : null}

      {showCommercial ? <ReapprovalBanner orderId={o.id} /> : null}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4" aria-label="Order sections">
          {tabs.map((t) => <TabsTrigger key={t} value={t}>{t === "history" ? "Activity" : t === "spec" ? "Production spec" : t === "tracking" ? "Customer tracking" : t.charAt(0).toUpperCase() + t.slice(1)}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ReadinessCard order={o} />
          {confirmed ? <FulfillmentCard order={o} showShipments={showShipments} /> : null}
          <Card aria-labelledby="ov-t">
            <CardHeader><CardTitle><span id="ov-t">Overview</span></CardTitle></CardHeader>
            <CardContent>
              <InfoGrid>
                <InfoItem label="Total quantity"><span className="tabular-nums">{formatNumber(o.totalQuantity)}</span></InfoItem>
                <InfoItem label="Completed / rejected"><span className="tabular-nums">{formatNumber(o.completedQuantity)} / {formatNumber(o.rejectedQuantity)}</span></InfoItem>
                <InfoItem label="Progress"><span className="tabular-nums">{o.progressPercent}%</span></InfoItem>
                <InfoItem label="Target delivery">{o.targetDeliveryDate ? <>{formatDate(o.targetDeliveryDate)}{o.isDelayed ? <span className="ms-2 text-xs font-medium text-tone-danger-fg">Delayed</span> : null}</> : null}</InfoItem>
                <InfoItem label="Sales owner">{o.assignedSalesUserId ? "Assigned" : "Unassigned"}</InfoItem>
                <InfoItem label="Payment"><StatusBadge status={o.paymentState} /></InfoItem>
                <InfoItem label="Created">{formatDateTime(o.createdAt)}</InfoItem>
                <InfoItem label="Confirmed">{o.confirmedAt ? formatDateTime(o.confirmedAt) : null}</InfoItem>
                <InfoItem label="Production started">{o.productionStartDate ? formatDateTime(o.productionStartDate) : null}</InfoItem>
                <InfoItem label="Internal notes" className="sm:col-span-2 lg:col-span-3">{o.internalNotes ? <span className="whitespace-pre-wrap">{o.internalNotes}</span> : null}</InfoItem>
              </InfoGrid>
            </CardContent>
          </Card>
          <Card aria-labelledby="ref-t" data-testid="approved-reference">
            <CardHeader><CardTitle><span id="ref-t">Approved production reference</span></CardTitle><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock aria-hidden className="size-3" /> Frozen — read only</span></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Bulk production is based on the <strong>approved reference</strong> of <Link href={`/samples/${o.sourceSampleId}?tab=production`} className="font-mono text-xs font-semibold text-brand hover:underline">{o.sampleNumber}</Link> (revision {o.approvedReference.revision}), never on the pre-production specification.</p>
              <InfoGrid>
                <InfoItem label="Kind">Approved reference</InfoItem>
                <InfoItem label="Frozen">{formatDateTime(o.approvedReference.createdAt)}</InfoItem>
                <InfoItem label="Fingerprint"><span className="font-mono text-xs">{o.approvedReference.specHash.slice(0, 16)}…</span></InfoItem>
                <InfoItem label="Built by job">{o.approvedReference.sourceFactoryJobNumber}</InfoItem>
              </InfoGrid>
              {o.currentSpec ? <p className="rounded-md bg-surface-muted px-3 py-2" data-testid="current-spec">Order specification <strong>revision {o.currentSpec.revision}</strong> is frozen ({formatNumber(o.currentSpec.totalQuantity)} units, fingerprint <span className="font-mono text-xs">{o.currentSpec.specHash.slice(0, 12)}…</span>). It is what the factory is committed to; change it only through a revision.</p> : <p className="text-muted-foreground">The order specification is frozen when the order is confirmed.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="space-y-3">
          {isDraft && manage ? <VariantsEditor key={o.items.map((i) => i.id).join()} order={o} fabricColors={fabricColors} /> : (
            <>
              {confirmed ? <p role="status" className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm"><Lock aria-hidden className="size-4" /> Quantities and variants are frozen by the order specification. {canRevise ? "Use Revise to change them before production starts." : "Changes go through a revision."}</p> : status === "PENDING_CONFIRMATION" ? <p role="status" className="rounded-md bg-surface-muted px-3 py-2 text-sm">Variants are locked while the order awaits confirmation. Use “Request changes” to edit them.</p> : null}
              <VariantsTable items={o.items} />
            </>
          )}
        </TabsContent>

        <TabsContent value="spec"><SpecPanel orderId={o.id} confirmed={confirmed} /></TabsContent>
        {showBatches ? <TabsContent value="batches"><BatchesPanel order={o} /></TabsContent> : null}
        <TabsContent value="production" className="space-y-4"><ProcessPanel kind="orders" id={o.id} /><ProductionPanel order={o} /></TabsContent>
        {showPackaging ? <TabsContent value="packaging"><PackagingPanel order={o} /></TabsContent> : null}
        {showShipments ? <TabsContent value="shipments"><ShipmentsPanel order={o} /></TabsContent> : null}
        {showTracking ? <TabsContent value="tracking"><TrackingPanel orderId={o.id} /></TabsContent> : null}
        {showCommercial ? <TabsContent value="commercial"><CommercialSection target={{ kind: "order", id: o.id }} canStart={open && !["IN_PRODUCTION", "PARTIALLY_COMPLETED", "PRODUCTION_COMPLETED"].includes(status)} startHint="Quotations can be created until production is released." /></TabsContent> : null}
        <TabsContent value="history"><HistoryPanel orderId={o.id} /></TabsContent>
      </Tabs>

      {action ? <OrderActionDialog order={o} meta={action} onClose={() => setAction(null)} /> : null}
      {dialog === "confirm" ? <ConfirmOrderDialog order={o} onClose={() => setDialog(null)} /> : null}
      {dialog === "revise" ? <ReviseDialog order={o} fabricColors={fabricColors} onClose={() => setDialog(null)} /> : null}
      {dialog === "priority" ? <PriorityDialog order={o} onClose={() => setDialog(null)} /> : null}
      {dialog === "reorder" ? <ReorderDialog order={o} onClose={() => setDialog(null)} /> : null}
      {dialog === "assign" ? <StaffAssignDialog title="Assign sales owner" description={`${o.orderNumber} — currently ${o.assignedSalesUserId ? "assigned" : "unassigned"}.`} currentId={o.assignedSalesUserId} onClose={() => setDialog(null)} onAssign={async (userId) => { await api.updateOrder(o.id, { assignedSalesUserId: userId }); inv.order(o.id); }} /> : null}
    </>
  );
}
