"use client";

import { CheckCircle2, PackageCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorMessage, isApiError } from "@/lib/api/errors";

import * as api from "./api";
import { useOrder, useOrderCommercial, useOrderProduction, useOrderShipments } from "./hooks";
import { PaymentTab, QuotationTab, can } from "./journey";
import { OrderActivityView, OrderProductionCard, ShipmentsView, shipmentSummaryText } from "./order-tracking";
import { CustomerStatus } from "./status";
import type { OrderDetail, OrderVariant } from "./types";
import { useI18n } from "@/i18n/provider";

const TABS = ["overview", "quotation", "payment", "production", "shipments", "activity"] as const;
type Tab = (typeof TABS)[number];
const nameOf = (v: { name: string } | string | null) => (v === null ? null : typeof v === "string" ? v : v.name);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return <div className="grid gap-0.5 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm">{children}</dd></div>;
}

/** Which tab the one primary action points at; derived from allowedActions only. */
export function orderPrimaryAction(o: Pick<OrderDetail, "allowedActions">): { label: string; tab?: Tab; edit?: true } | null {
  if (can(o, "ACCEPT_QUOTATION") || can(o, "REJECT_QUOTATION")) return { label: "Review quotation", tab: "quotation" };
  if (can(o, "UPLOAD_PAYMENT_PROOF")) return { label: "Upload payment proof", tab: "payment" };
  if (can(o, "SUBMIT_ORDER") || can(o, "EDIT_ORDER")) return { label: "Continue editing", edit: true };
  return null;
}

function Items({ o }: { o: OrderDetail }) {
  const { t } = useI18n();
  return (
    <Card><CardHeader><CardTitle>{t("customer.items")}</CardTitle></CardHeader><CardContent className="space-y-4" data-testid="order-items">
      {o.items.map((it) => (
        <div key={it.id}>
          <p className="text-sm font-medium">{it.productName} <span className="font-normal text-muted-foreground">{t("customer.quantityUnits", { quantity: it.quantity })}</span></p>
          {it.variants.length ? <table className="mt-2 w-full text-sm"><thead><tr className="text-start text-muted-foreground"><th className="py-1 text-start font-medium">{t("common.colour")}</th><th className="py-1 text-start font-medium">{t("common.size")}</th><th className="py-1 text-end font-medium">{t("common.quantity")}</th></tr></thead>
            <tbody>{it.variants.map((v: OrderVariant) => <tr key={v.id} className="border-t" data-testid="variant"><td className="py-1">{nameOf(v.color) ?? t("customer.approvedColour")}</td><td className="py-1">{nameOf(v.size) ?? "—"}</td><td className="py-1 text-end tabular-nums">{v.quantity}</td></tr>)}</tbody></table> : null}
          {it.notes ? <p className="mt-1 text-sm text-muted-foreground">{it.notes}</p> : null}
        </div>))}
    </CardContent></Card>
  );
}

function ReorderButton({ o }: { o: OrderDetail }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  if (!can(o, "REORDER")) return null;
  const go = async () => {
    setBusy(true); setError(null);
    try { const n = await api.reorder(o.id, { cloneItems: true }); toast.success(t("customer.newDraftCreated")); router.push(`/account/orders/${n.id}/edit`); }
    catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); setOpen(false); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <Button data-testid="reorder" onClick={() => setOpen(true)}>{t("customer.reorder")}</Button>
      {error ? <FormError message={error.message} requestId={error.requestId} /> : null}
      <ConfirmDialog open={open} onOpenChange={setOpen} title={t("customer.createANewOrderUsingThis")} description={t("customer.weLlStartANewDraft")} confirmLabel={t("customer.createNewOrder")} loading={busy} onConfirm={() => void go()} />
    </div>
  );
}

function Delivered({ o }: { o: OrderDetail }) {
  const { t, fmt } = useI18n();
  return (
    <Card className="border-tone-success-fg/30" data-testid="delivered"><CardContent className="flex flex-wrap items-center gap-4 pt-4">
      <PackageCheck aria-hidden className="size-8 text-tone-success-fg" />
      <div className="min-w-0 flex-1"><p className="font-semibold">{t("customer.yourOrderHasBeenDelivered")}</p><p className="text-sm text-muted-foreground">{o.deliveredAt ? t("customer.deliveredDeliveredat", { deliveredAt: fmt.date(o.deliveredAt) }) : ""}{t("customer.thankYouForWorkingWithBenuu")}</p></div>
      <ReorderButton o={o} />
    </CardContent></Card>
  );
}

export function OrderDetailPage({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = useOrder(id);
  const commercial = useOrderCommercial(id);
  const production = useOrderProduction(id);
  const shipments = useOrderShipments(id);
  const requested: Tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "overview";
  const o = q.data;
  const hasQuotation = !!commercial.data?.quotationNumber || !!o?.allowedActions.some((a) => a === "ACCEPT_QUOTATION" || a === "REJECT_QUOTATION");
  const hasPayment = !!commercial.data && commercial.data.payment.status !== "NOT_REQUIRED_YET";
  const hasProduction = !!production.data && production.data.phase !== "NOT_STARTED";
  const hasShipments = !!shipments.data && (shipments.data.shipments.length > 0);
  const visible: Record<Tab, boolean> = { overview: true, quotation: hasQuotation, payment: hasPayment, production: hasProduction, shipments: hasShipments, activity: true };
  const tab: Tab = visible[requested] ? requested : "overview";
  const setTab = (t: string) => { const p = new URLSearchParams(sp.toString()); p.delete("submitted"); if (t === "overview") p.delete("tab"); else p.set("tab", t); router.replace(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false }); };
  if (q.isLoading) return <PageSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <EmptyState title={t("customer.orderNotFound")} description={t("customer.weCouldnTFindThatOrder")} action={<Button asChild variant="secondary"><Link href="/account/orders">{t("customer.backToMyOrders")}</Link></Button>} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  if (!o) return null;
  const a = orderPrimaryAction(o);
  const delivered = o.status === "DELIVERED" || o.status === "COMPLETED";
  const reReview = commercial.data?.requiresReview || o.commercial.requiresReview;
  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href="/account/orders" className="text-muted-foreground hover:text-foreground hover:underline">{t("customer.myOrders")}</Link></p>
      {sp.get("submitted") === "1" ? <div role="status" data-testid="submitted-banner" className="flex items-start gap-2 rounded-lg bg-tone-success-bg px-4 py-3 text-sm text-tone-success-fg"><CheckCircle2 aria-hidden className="mt-0.5 size-5" /><div><p className="font-medium">{t("customer.orderSubmitted")}</p><p>{t("customer.orderOrdernumberOurTeamWillReview", { orderNumber: o.orderNumber })}</p></div></div> : null}
      <header className="space-y-3 border-b border-border/70 pb-6">
        <div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-brand">{o.orderNumber}</span><CustomerStatus status={o.status} label={o.statusLabel} /></div>
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.03em]">{o.productName ?? t("customer.bulkOrder")} <span className="text-lg font-normal text-muted-foreground">· {o.brand.name}</span></h1>
        <p className="rounded-lg border border-brand/35 bg-brand-soft/40 px-4 py-3 text-sm shadow-[inset_2px_0_0_var(--brand)]" data-testid="next-step"><span className="font-medium">{t("customer.whatHappensNext")}{" "}</span>{t.text(o.nextStep)}</p>
        {reReview ? <p role="status" data-testid="re-review-banner" className="rounded-lg border-s-4 border-brand bg-surface px-4 py-3 text-sm font-medium">{t("customer.yourOrderChangedAndANew")}</p> : null}
        {a ? (a.edit ? <Button asChild size="lg"><Link href={`/account/orders/${o.id}/edit`}>{t.text(a.label)}</Link></Button> : <Button size="lg" data-testid="primary-cta" onClick={() => setTab(a.tab!)}>{t.text(a.label)}</Button>) : null}
      </header>
      {delivered ? <Delivered o={o} /> : null}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label={t("customer.orderSections")} className="mb-4 flex-wrap"><TabsTrigger value="overview">{t("common.overview")}</TabsTrigger>{hasQuotation ? <TabsTrigger value="quotation">{t("customer.quotation")}</TabsTrigger> : null}{hasPayment ? <TabsTrigger value="payment">{t("common.payment")}</TabsTrigger> : null}{hasProduction ? <TabsTrigger value="production">{t("common.production")}</TabsTrigger> : null}{hasShipments ? <TabsTrigger value="shipments">{t("common.shipments")}</TabsTrigger> : null}<TabsTrigger value="activity">{t("customer.activity")}</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card><CardContent className="pt-4"><dl className="divide-y">
            <Row label={t("customer.orderNumber")}>{o.orderNumber}</Row><Row label={t("common.brand2")}>{o.brand.name}</Row><Row label={t("common.product")}>{o.productName}</Row>
            <Row label={t("customer.approvedSample")}>{o.reference.sampleNumber ? <Link className="text-brand hover:underline" href={`/account/samples/${o.reference.sampleId}`}>{o.reference.sampleNumber}</Link> : null}</Row>
            <Row label={t("common.quantity")}>{t("customer.totalUnits", { total: o.quantities.total })}</Row>
            {o.quantities.shipped > 0 ? <Row label={t("customer.shipped")}>{t("customer.shippedOfTotalUnits", { shipped: o.quantities.shipped, total: o.quantities.total })}{o.quantities.remaining > 0 ? t("customer.remainingRemaining", { remaining: o.quantities.remaining }) : ""}</Row> : null}
            <Row label={t("customer.requestedDelivery")}>{o.targetDeliveryDate ? fmt.date(o.targetDeliveryDate) : null}</Row>
            <Row label={t("customer.yourNotes")}>{o.customerNotes}</Row>
            <Row label={t("customer.confirmed")}>{o.confirmedAt ? fmt.dateTime(o.confirmedAt) : null}</Row>
            <Row label={t("common.created")}>{fmt.dateTime(o.createdAt)}</Row><Row label={t("customer.lastUpdated")}>{fmt.dateTime(o.updatedAt)}</Row>
          </dl></CardContent></Card>
          <Items o={o} />
          {hasProduction && !delivered ? <OrderProductionCard id={o.id} /> : null}
          {shipments.data && shipments.data.shipments.length ? <p className="text-sm" data-testid="shipment-line">{shipmentSummaryText(shipments.data.summary)}</p> : null}
        </TabsContent>
        {hasQuotation ? <TabsContent value="quotation"><QuotationTab sample={o} kind="order" /></TabsContent> : null}
        {hasPayment ? <TabsContent value="payment"><PaymentTab sample={o} kind="order" /></TabsContent> : null}
        {hasProduction ? <TabsContent value="production"><OrderProductionCard id={o.id} /></TabsContent> : null}
        {hasShipments ? <TabsContent value="shipments"><ShipmentsView id={o.id} /></TabsContent> : null}
        <TabsContent value="activity"><OrderActivityView id={o.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
