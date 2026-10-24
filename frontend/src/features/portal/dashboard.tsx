"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";

import { FirstBrandCard, startSampleHref } from "./brands";
import { useCustomerAuth } from "./auth/customer-auth-provider";
import { useBrands, useOrderList, useSampleList } from "./hooks";
import { OrderRow } from "./orders-list";
import { AWAITING_CUSTOMER, CustomerStatus, IN_PROGRESS, ORDER_AWAITING, ORDER_CLOSED, ORDER_IN_DELIVERY, ORDER_IN_PRODUCTION, rowCta } from "./status";
import type { CustomerBrand, SampleListItem } from "./types";
import { useI18n } from "@/i18n/provider";

export const countWhere = (rows: SampleListItem[], statuses: readonly string[]) => rows.filter((r) => statuses.includes(r.status)).length;

export function SampleRow({ s }: { s: SampleListItem }) {
  const { t, fmt } = useI18n();
  return (
    <li>
      <Link href={s.editable ? `/account/samples/${s.id}/edit` : `/account/samples/${s.id}`} className="block px-4 py-3.5 hover:bg-surface-muted" data-testid="sample-row" data-status={s.status}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs font-semibold">{s.sampleNumber}</span>
          <span className="min-w-0 flex-1 font-medium">{s.productName ?? t("customer.sampleRequest")}<span className="ms-2 font-normal text-muted-foreground">{s.brand.name}</span></span>
          <CustomerStatus status={s.status} label={s.statusLabel} />
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{t.text(s.nextStep)}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground"><span className="me-2 font-medium text-brand" data-testid="row-cta">{t.text(rowCta(s.status, s.editable))} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span></span>{s.submittedAt ? t("customer.submittedSubmittedat", { submittedAt: fmt.date(s.submittedAt) }) : ""}{t("customer.updatedUpdatedat", { updatedAt: fmt.date(s.updatedAt) })}</span>
      </Link>
    </li>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link href={href} className="block"><Card className="p-4 transition-colors hover:border-brand/60"><p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">{value}</p></Card></Link>;
}

export function PortalDashboard() {
  const { t } = useI18n();
  const { customer } = useCustomerAuth();
  const list = useSampleList({ pageSize: 50, sort: "updated" });
  const brands = useBrands();
  const orders = useOrderList({ pageSize: 50, sort: "updated" });
  const orderRows = orders.data?.data ?? [];
  const orderIn = (st: readonly string[]) => orderRows.filter((r) => st.includes(r.status));
  const rows = list.data?.data ?? [];
  const hasBrand = (brands.data?.length ?? 0) > 0;
  const noBrand = brands.isSuccess && !hasBrand;
  const [created, setCreated] = useState<CustomerBrand | null>(null); // keeps the "start your first sample" card up after the brand list refreshes
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6">
        <div><Eyebrow className="mb-2">{t("customer.myAccount")}</Eyebrow><h1 className="text-3xl font-semibold tracking-[-0.03em]">{t("customer.hello")}{customer ? `, ${customer.name}` : ""}</h1><p className="mt-1 text-muted-foreground">{t("customer.hereIsWhereYourSampleRequests")}</p></div>
        {noBrand ? null : <Button asChild size="lg"><Link href={startSampleHref()}>{t("customer.requestASample")}</Link></Button>}
      </div>
      {noBrand || created ? <FirstBrandCard created={created} onCreated={setCreated} /> : null}
      {list.isLoading ? <PageSkeleton /> : list.error ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : (
        <>
          <section aria-label={t("customer.summary")} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={t("customer.activeRequests")} value={rows.filter((r) => !["DRAFT", "CANCELLED", "APPROVED"].includes(r.status)).length} href="/account/samples" />
            <Stat label={t("customer.drafts")} value={countWhere(rows, ["DRAFT"])} href="/account/samples?status=DRAFT" />
            <Stat label={t("customer.waitingForYou")} value={countWhere(rows, AWAITING_CUSTOMER)} href="/account/samples" />
            <Stat label={t("common.inProgress")} value={countWhere(rows, IN_PROGRESS)} href="/account/samples" />
          </section>
          {orders.isSuccess && orderRows.length > 0 ? (
            <section aria-label={t("customer.orderSummary")} className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="order-cards">
              <Stat label={t("customer.activeOrders")} value={orderRows.filter((r) => !(ORDER_CLOSED as readonly string[]).includes(r.status)).length} href="/account/orders" />
              <Stat label={t("customer.inProduction")} value={orderIn(ORDER_IN_PRODUCTION).length} href="/account/orders?status=READY_FOR_PRODUCTION,IN_PRODUCTION,PACKAGING,READY_TO_SHIP" />
              <Stat label={t("customer.awaitingMyAction")} value={orderIn(ORDER_AWAITING).length} href="/account/orders?status=DRAFT,QUOTATION_READY,PAYMENT_REQUIRED" />
              <Stat label={t("customer.inDelivery")} value={orderIn(ORDER_IN_DELIVERY).length} href="/account/orders?status=PARTIALLY_SHIPPED,SHIPPED" />
            </section>
          ) : null}
          {countWhere(rows, AWAITING_CUSTOMER) > 0 || orderIn(ORDER_AWAITING).length > 0 ? (
            <section aria-labelledby="action"><Eyebrow className="mb-2">{t("customer.nextStep")}</Eyebrow><h2 id="action" className="mb-3 text-xl font-semibold tracking-tight">{t("customer.needsYourAction")}</h2>
              <Card variant="action"><ul className="divide-y" data-testid="needs-action">{rows.filter((r) => (AWAITING_CUSTOMER as readonly string[]).includes(r.status)).map((s) => <SampleRow key={s.id} s={s} />)}{orderIn(ORDER_AWAITING).map((o) => <OrderRow key={o.id} o={o} />)}</ul></Card></section>
          ) : null}
          {orderRows.length > 0 ? (
            <section aria-labelledby="recent-orders">
              <div className="mb-2 flex items-baseline justify-between"><h2 id="recent-orders" className="text-xl font-semibold tracking-tight">{t("customer.recentOrders")}</h2><Link href="/account/orders" className="text-sm text-brand hover:underline">{t("customer.viewAll")}</Link></div>
              <Card><ul className="divide-y" data-testid="recent-orders">{orderRows.slice(0, 5).map((o) => <OrderRow key={o.id} o={o} />)}</ul></Card>
            </section>
          ) : null}
          <section aria-labelledby="recent">
            <div className="mb-2 flex items-baseline justify-between"><h2 id="recent" className="text-xl font-semibold tracking-tight">{t("customer.recentSamples")}</h2><Link href="/account/samples" className="text-sm text-brand hover:underline">{t("customer.viewAll")}</Link></div>
            {rows.length === 0 ? <EmptyState title={t("customer.noSamplesYet")} description={noBrand ? t("customer.createYourBrandAboveThenRequest") : t("customer.requestYourFirstSampleTellUs")} action={noBrand ? undefined : <Button asChild><Link href="/account/samples/new">{t("customer.requestYourFirstSample")}</Link></Button>} /> : (
              <Card><ul className="divide-y" data-testid="recent-samples">{rows.slice(0, 5).map((s) => <SampleRow key={s.id} s={s} />)}</ul></Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
