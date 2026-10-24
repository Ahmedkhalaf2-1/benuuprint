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
import { useI18n } from "@/i18n/provider";

const TERMINAL = ["CANCELLED", "COMPLETED", "DELIVERED"];
const TABS = ["overview", "variants", "spec", "batches", "production", "packaging", "shipments", "tracking", "commercial", "history"] as const;
type Tab = (typeof TABS)[number];

export function OrderDetailPage({ id }: { id: string }) {
  const { t, fmt } = useI18n();
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
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title={t("orders.orderNotFound")} error={q.error} className="py-20" />;
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
        breadcrumbs={[{ label: t("orders.orders"), href: "/orders" }, { label: o.orderNumber }]}
        reference={`${o.orderNumber}${o.revisionNumber > 1 ? t("common.revisionSuffix", { n: o.revisionNumber }) : ""}`}
        title={o.items[0]?.productName ?? t("common.order")}
        status={<><StatusBadge status={status} /><PriorityBadge priority={o.priority} /><StatusBadge status={o.paymentState} /></>}
        meta={
          <span className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span>{t("common.customer")}{" "}<Link href={`/customers/${o.customer.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{o.customer.name}</Link></span>
            <span>{t("common.brand2")}{" "}<Link href={`/brands/${o.brand.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{o.brand.name}</Link></span>
            <span>{t("common.sample")}{" "}<Link href={`/samples/${o.sourceSampleId}`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{o.sampleNumber}</Link></span>
            {o.reorderOfOrderId ? <span>{t("orders.reorderOf")}{" "}<Link href={`/orders/${o.reorderOfOrderId}`} className="font-mono text-xs font-semibold text-foreground hover:text-brand hover:underline">{o.reorderOfOrderNumber}</Link></span> : null}
          </span>
        }
        actions={
          <>
            {manage && isDraft ? <Button onClick={() => setAction(meta("submit"))}>{t.text(meta("submit").label)}</Button> : null}
            {can("orders.confirm") && status === "PENDING_CONFIRMATION" ? <Button onClick={() => setDialog("confirm")}>{t("orders.confirmOrder")}</Button> : null}
            {manage && status === "PENDING_CONFIRMATION" ? <Button variant="secondary" onClick={() => setAction(meta("request-changes"))}>{t.text(meta("request-changes").label)}</Button> : null}
            {manage && status === "CONFIRMED" ? <Button onClick={() => setAction(meta("ready"))}>{t.text(meta("ready").label)}</Button> : null}
            {canRevise ? <Button variant="secondary" onClick={() => setDialog("revise")}>{t("orders.revise")}</Button> : null}
            {manage && status === "ON_HOLD" ? <Button onClick={() => setAction(meta("resume"))}>{t("orders.resume")}</Button> : null}
            {manage && open && confirmed && status !== "ON_HOLD" ? <Button variant="secondary" onClick={() => setAction(meta("hold"))}>{t("orders.putOnHold")}</Button> : null}
            {manage && open ? <Button variant="secondary" onClick={() => setDialog("priority")}>{t("common.priority")}</Button> : null}
            {manage && open ? <Button variant="secondary" onClick={() => setDialog("assign")}><UserPlus />{" "}{t("orders.salesOwner")}</Button> : null}
            {can("orders.reorder") && confirmed ? <Button variant="secondary" onClick={() => setDialog("reorder")}>{t("orders.reorder")}</Button> : null}
            {can("orders.override") && ["PRODUCTION_COMPLETED", "READY_FOR_PACKAGING", "PACKAGING", "READY_FOR_DELIVERY", "PARTIALLY_SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status) ? <Button variant="secondary" className="border-danger text-danger" onClick={() => setAction(meta("force-complete"))}>{t("orders.forceCompleteOverride")}</Button> : null}
            {can("orders.cancel") && open ? <Button variant="secondary" className="text-danger" onClick={() => setAction(meta("cancel"))}>{t("orders.cancelOrder")}</Button> : null}
          </>
        }
      />
      {status === "ON_HOLD" && o.holdReason ? <p role="status" className="mb-4 rounded-md bg-tone-warning-bg px-3 py-2 text-sm text-tone-warning-fg"><span className="font-medium">{t("orders.onHold")}</span> {o.holdReason}</p> : null}
      {status === "CANCELLED" ? <p role="status" className="mb-4 rounded-md bg-tone-neutral-bg px-3 py-2 text-sm text-tone-neutral-fg"><span className="font-medium">{t("orders.cancelled")}</span>{o.cancelledAt ? ` ${fmt.dateTime(o.cancelledAt)}` : ""}{o.cancellationReason ? `: ${o.cancellationReason}` : ""}</p> : null}

      {showCommercial ? <ReapprovalBanner orderId={o.id} /> : null}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4" aria-label={t("orders.orderSections")}>
          {tabs.map((tb) => <TabsTrigger key={tb} value={tb}>{tb === "history" ? t.text("Activity") : tb === "spec" ? t.text("Production spec") : tb === "tracking" ? t.text("Customer tracking") : t.text(tb.charAt(0).toUpperCase() + tb.slice(1))}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ReadinessCard order={o} />
          {confirmed ? <FulfillmentCard order={o} showShipments={showShipments} /> : null}
          <Card aria-labelledby="ov-t">
            <CardHeader><CardTitle><span id="ov-t">{t("common.overview")}</span></CardTitle></CardHeader>
            <CardContent>
              <InfoGrid>
                <InfoItem label={t("orders.totalQuantity")}><span className="tabular-nums">{fmt.number(o.totalQuantity)}</span></InfoItem>
                <InfoItem label={t("orders.completedRejected")}><span className="tabular-nums">{fmt.number(o.completedQuantity)} / {fmt.number(o.rejectedQuantity)}</span></InfoItem>
                <InfoItem label={t("orders.progress")}><span className="tabular-nums">{o.progressPercent}%</span></InfoItem>
                <InfoItem label={t("orders.targetDelivery")}>{o.targetDeliveryDate ? <>{fmt.date(o.targetDeliveryDate)}{o.isDelayed ? <span className="ms-2 text-xs font-medium text-tone-danger-fg">{t("common.delayed")}</span> : null}</> : null}</InfoItem>
                <InfoItem label={t("orders.salesOwner")}>{o.assignedSalesUserId ? t("orders.assigned") : t("common.unassigned")}</InfoItem>
                <InfoItem label={t("orders.payment")}><StatusBadge status={o.paymentState} /></InfoItem>
                <InfoItem label={t("common.created")}>{fmt.dateTime(o.createdAt)}</InfoItem>
                <InfoItem label={t("orders.confirmed")}>{o.confirmedAt ? fmt.dateTime(o.confirmedAt) : null}</InfoItem>
                <InfoItem label={t("orders.productionStarted")}>{o.productionStartDate ? fmt.dateTime(o.productionStartDate) : null}</InfoItem>
                <InfoItem label={t("common.internalNotes")} className="sm:col-span-2 lg:col-span-3">{o.internalNotes ? <span className="whitespace-pre-wrap">{o.internalNotes}</span> : null}</InfoItem>
              </InfoGrid>
            </CardContent>
          </Card>
          <Card aria-labelledby="ref-t" data-testid="approved-reference">
            <CardHeader><CardTitle><span id="ref-t">{t("orders.approvedProductionReference")}</span></CardTitle><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock aria-hidden className="size-3" />{" "}{t("orders.frozenReadOnly")}</span></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{t("orders.bulkProductionIsBasedOnThe")}{" "}<strong>{t("orders.approvedReference2")}</strong>{" "}{t("orders.of")}{" "}<Link href={`/samples/${o.sourceSampleId}?tab=production`} className="font-mono text-xs font-semibold text-brand hover:underline">{o.sampleNumber}</Link>{" "}{t("orders.revisionRevisionNeverOnThePre", { revision: o.approvedReference.revision })}</p>
              <InfoGrid>
                <InfoItem label={t("orders.kind")}>{t("orders.approvedReference")}</InfoItem>
                <InfoItem label={t("orders.frozen")}>{fmt.dateTime(o.approvedReference.createdAt)}</InfoItem>
                <InfoItem label={t("orders.fingerprint")}><span className="font-mono text-xs">{o.approvedReference.specHash.slice(0, 16)}…</span></InfoItem>
                <InfoItem label={t("orders.builtByJob")}>{o.approvedReference.sourceFactoryJobNumber}</InfoItem>
              </InfoGrid>
              {o.currentSpec ? <p className="rounded-md bg-surface-muted px-3 py-2" data-testid="current-spec">{t("orders.orderSpecification")}{" "}<strong>{t("orders.revisionRevision", { revision: o.currentSpec.revision })}</strong>{" "}{t("orders.isFrozenTotalquantityUnitsFingerprint", { totalQuantity: fmt.number(o.currentSpec.totalQuantity) })}{" "}<span className="font-mono text-xs">{o.currentSpec.specHash.slice(0, 12)}…</span>{t("orders.itIsWhatTheFactoryIs")}</p> : <p className="text-muted-foreground">{t("orders.theOrderSpecificationIsFrozenWhen")}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="space-y-3">
          {isDraft && manage ? <VariantsEditor key={o.items.map((i) => i.id).join()} order={o} fabricColors={fabricColors} /> : (
            <>
              {confirmed ? <p role="status" className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm"><Lock aria-hidden className="size-4" />{" "}{t("orders.quantitiesAndVariantsAreFrozenBy")}{" "}{canRevise ? t("orders.useReviseToChangeThemBefore") : t("orders.changesGoThroughARevision")}</p> : status === "PENDING_CONFIRMATION" ? <p role="status" className="rounded-md bg-surface-muted px-3 py-2 text-sm">{t("orders.variantsAreLockedWhileTheOrder")}</p> : null}
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
        {showCommercial ? <TabsContent value="commercial"><CommercialSection target={{ kind: "order", id: o.id }} canStart={open && !["IN_PRODUCTION", "PARTIALLY_COMPLETED", "PRODUCTION_COMPLETED"].includes(status)} startHint={t("orders.quotationsCanBeCreatedUntilProduction")} /></TabsContent> : null}
        <TabsContent value="history"><HistoryPanel orderId={o.id} /></TabsContent>
      </Tabs>

      {action ? <OrderActionDialog order={o} meta={action} onClose={() => setAction(null)} /> : null}
      {dialog === "confirm" ? <ConfirmOrderDialog order={o} onClose={() => setDialog(null)} /> : null}
      {dialog === "revise" ? <ReviseDialog order={o} fabricColors={fabricColors} onClose={() => setDialog(null)} /> : null}
      {dialog === "priority" ? <PriorityDialog order={o} onClose={() => setDialog(null)} /> : null}
      {dialog === "reorder" ? <ReorderDialog order={o} onClose={() => setDialog(null)} /> : null}
      {dialog === "assign" ? <StaffAssignDialog title={t("orders.assignSalesOwner")} description={t("orders.ordernumberCurrentlyV2", { orderNumber: o.orderNumber, v2: o.assignedSalesUserId ? "assigned" : "unassigned" })} currentId={o.assignedSalesUserId} onClose={() => setDialog(null)} onAssign={async (userId) => { await api.updateOrder(o.id, { assignedSalesUserId: userId }); inv.order(o.id); }} /> : null}
    </>
  );
}
