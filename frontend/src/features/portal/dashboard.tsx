"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import { FirstBrandCard, startSampleHref } from "./brands";
import { useCustomerAuth } from "./auth/customer-auth-provider";
import { useBrands, useOrderList, useSampleList } from "./hooks";
import { OrderRow } from "./orders-list";
import { AWAITING_CUSTOMER, CustomerStatus, IN_PROGRESS, ORDER_AWAITING, ORDER_CLOSED, ORDER_IN_DELIVERY, ORDER_IN_PRODUCTION, rowCta } from "./status";
import type { CustomerBrand, SampleListItem } from "./types";

export const countWhere = (rows: SampleListItem[], statuses: readonly string[]) => rows.filter((r) => statuses.includes(r.status)).length;

export function SampleRow({ s }: { s: SampleListItem }) {
  return (
    <li>
      <Link href={s.editable ? `/account/samples/${s.id}/edit` : `/account/samples/${s.id}`} className="block px-4 py-3.5 hover:bg-surface-muted" data-testid="sample-row" data-status={s.status}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs font-semibold">{s.sampleNumber}</span>
          <span className="min-w-0 flex-1 font-medium">{s.productName ?? "Sample request"}<span className="ms-2 font-normal text-muted-foreground">{s.brand.name}</span></span>
          <CustomerStatus status={s.status} label={s.statusLabel} />
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{s.nextStep}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground"><span className="me-2 font-medium text-brand" data-testid="row-cta">{rowCta(s.status, s.editable)} →</span>{s.submittedAt ? `Submitted ${formatDate(s.submittedAt)} · ` : ""}Updated {formatDate(s.updatedAt)}</span>
      </Link>
    </li>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link href={href} className="block"><Card className="p-4 transition-colors hover:border-brand/60"><p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">{value}</p></Card></Link>;
}

export function PortalDashboard() {
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
        <div><Eyebrow className="mb-2">My account</Eyebrow><h1 className="text-3xl font-semibold tracking-[-0.03em]">Hello{customer ? `, ${customer.name}` : ""}</h1><p className="mt-1 text-muted-foreground">Here is where your sample requests stand.</p></div>
        {noBrand ? null : <Button asChild size="lg"><Link href={startSampleHref()}>Request a sample</Link></Button>}
      </div>
      {noBrand || created ? <FirstBrandCard created={created} onCreated={setCreated} /> : null}
      {list.isLoading ? <PageSkeleton /> : list.error ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Active requests" value={rows.filter((r) => !["DRAFT", "CANCELLED", "APPROVED"].includes(r.status)).length} href="/account/samples" />
            <Stat label="Drafts" value={countWhere(rows, ["DRAFT"])} href="/account/samples?status=DRAFT" />
            <Stat label="Waiting for you" value={countWhere(rows, AWAITING_CUSTOMER)} href="/account/samples" />
            <Stat label="In progress" value={countWhere(rows, IN_PROGRESS)} href="/account/samples" />
          </section>
          {orders.isSuccess && orderRows.length > 0 ? (
            <section aria-label="Order summary" className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="order-cards">
              <Stat label="Active orders" value={orderRows.filter((r) => !(ORDER_CLOSED as readonly string[]).includes(r.status)).length} href="/account/orders" />
              <Stat label="In production" value={orderIn(ORDER_IN_PRODUCTION).length} href="/account/orders?status=READY_FOR_PRODUCTION,IN_PRODUCTION,PACKAGING,READY_TO_SHIP" />
              <Stat label="Awaiting my action" value={orderIn(ORDER_AWAITING).length} href="/account/orders?status=DRAFT,QUOTATION_READY,PAYMENT_REQUIRED" />
              <Stat label="In delivery" value={orderIn(ORDER_IN_DELIVERY).length} href="/account/orders?status=PARTIALLY_SHIPPED,SHIPPED" />
            </section>
          ) : null}
          {countWhere(rows, AWAITING_CUSTOMER) > 0 || orderIn(ORDER_AWAITING).length > 0 ? (
            <section aria-labelledby="action"><Eyebrow className="mb-2">Next step</Eyebrow><h2 id="action" className="mb-3 text-xl font-semibold tracking-tight">Needs your action</h2>
              <Card variant="action"><ul className="divide-y" data-testid="needs-action">{rows.filter((r) => (AWAITING_CUSTOMER as readonly string[]).includes(r.status)).map((s) => <SampleRow key={s.id} s={s} />)}{orderIn(ORDER_AWAITING).map((o) => <OrderRow key={o.id} o={o} />)}</ul></Card></section>
          ) : null}
          {orderRows.length > 0 ? (
            <section aria-labelledby="recent-orders">
              <div className="mb-2 flex items-baseline justify-between"><h2 id="recent-orders" className="text-xl font-semibold tracking-tight">Recent orders</h2><Link href="/account/orders" className="text-sm text-brand hover:underline">View all</Link></div>
              <Card><ul className="divide-y" data-testid="recent-orders">{orderRows.slice(0, 5).map((o) => <OrderRow key={o.id} o={o} />)}</ul></Card>
            </section>
          ) : null}
          <section aria-labelledby="recent">
            <div className="mb-2 flex items-baseline justify-between"><h2 id="recent" className="text-xl font-semibold tracking-tight">Recent samples</h2><Link href="/account/samples" className="text-sm text-brand hover:underline">View all</Link></div>
            {rows.length === 0 ? <EmptyState title="No samples yet" description={noBrand ? "Create your brand above, then request your first sample here." : "Request your first sample — tell us what you want to make."} action={noBrand ? undefined : <Button asChild><Link href="/account/samples/new">Request your first sample</Link></Button>} /> : (
              <Card><ul className="divide-y" data-testid="recent-samples">{rows.slice(0, 5).map((s) => <SampleRow key={s.id} s={s} />)}</ul></Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
