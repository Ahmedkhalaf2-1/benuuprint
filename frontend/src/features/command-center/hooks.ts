"use client";

import { useQueries } from "@tanstack/react-query";
import { getCommercialSummary } from "@/features/commercial/api";
import { useShipments } from "@/features/fulfillment/hooks";
import { useNeedsAttention } from "@/features/management/hooks";
import { getOrder } from "@/features/orders/api";
import { useOrders } from "@/features/orders/hooks";
import type { OrderListItem } from "@/features/orders/types";
import { useJobs } from "@/features/production/hooks";
import { useSamples } from "@/features/samples/hooks";
import { queryKeys } from "@/lib/query/keys";
import { classifyAttention, classifyJob, classifyOrder, classifySample, classifyShipment, type Can, type OrderContext, type QueueItem } from "./logic";

/** Exact sets, small pages: every Command Center queue is a normal list request with real backend filters. */
export const SAMPLE_QUERY = { status: "SUBMITTED,UNDER_REVIEW,QUOTED,AWAITING_PAYMENT,READY_FOR_PRODUCTION,AWAITING_APPROVAL", pageSize: 100, sort: "oldest" };
export const ORDER_QUERY = { status: "PENDING_CONFIRMATION,CONFIRMED,READY_FOR_PRODUCTION,READY_FOR_DELIVERY,PARTIALLY_SHIPPED", pageSize: 100, sort: "oldest" };
export const JOB_QUERY = { status: "PLANNED,READY,IN_PROGRESS,BLOCKED,ON_HOLD", pageSize: 100, sort: "priority" };
const MAX_DETAIL = 12;

export interface CommandData {
  items: QueueItem[];
  /** Sources the caller may read and whether each failed / is still loading. */
  sources: Record<"samples" | "orders" | "jobs" | "shipments" | "attention", { enabled: boolean; loading: boolean; error: unknown; retry: () => void }>;
  attentionTotal: number | undefined;
  truncated: boolean;
}

export function useCommandData(can: Can): CommandData {
  const canSamples = can("samples.read"), canOrders = can("orders.read"), canJobs = can("jobs.read_all"), canShip = can("shipments.read"), canKpi = can("management_kpis.read");
  const samples = useSamples(SAMPLE_QUERY, canSamples);
  const orders = useOrders(ORDER_QUERY, canOrders);
  const jobs = useJobs(JOB_QUERY, canJobs);
  const failed = useShipments({ status: "FAILED", pageSize: 20 }, canShip);
  const returned = useShipments({ status: "RETURNED", pageSize: 20 }, canShip);
  const ready = useShipments({ status: "READY", pageSize: 20 }, canShip);
  const attention = useNeedsAttention({ limit: 15 }, canKpi);

  const orderRows: OrderListItem[] = orders.data?.data ?? [];
  const confirmed = orderRows.filter((o) => o.status === "CONFIRMED").slice(0, MAX_DETAIL);
  const partial = orderRows.filter((o) => o.status === "PARTIALLY_SHIPPED").slice(0, MAX_DETAIL);
  const canCommercial = can("orders.commercial.read");
  const commercial = useQueries({ queries: confirmed.map((o) => ({ queryKey: queryKeys.orders.commercial(o.id), queryFn: ({ signal }: { signal: AbortSignal }) => getCommercialSummary({ kind: "order", id: o.id }, signal), enabled: canCommercial, retry: false })) });
  const details = useQueries({ queries: partial.map((o) => ({ queryKey: queryKeys.orders.detail(o.id), queryFn: ({ signal }: { signal: AbortSignal }) => getOrder(o.id, signal), enabled: canOrders, retry: false })) });

  const liveJobs = jobs.data?.data ?? [];
  const items: QueueItem[] = [];
  for (const s of samples.data?.data ?? []) { const i = classifySample(s, can); if (i) items.push(i); }
  for (const o of orderRows) {
    const ctx: OrderContext = {};
    if (o.status === "CONFIRMED") { const idx = confirmed.findIndex((c) => c.id === o.id); ctx.commercial = idx >= 0 ? commercial[idx]?.data : undefined; }
    if (o.status === "READY_FOR_PRODUCTION") ctx.jobs = canJobs && jobs.data ? liveJobs.filter((j) => j.orderId === o.id) : null;
    if (o.status === "PARTIALLY_SHIPPED") { const idx = partial.findIndex((c) => c.id === o.id); ctx.fulfillment = idx >= 0 ? details[idx]?.data?.fulfillment : undefined; }
    const i = classifyOrder(o, ctx, can); if (i) items.push(i);
  }
  for (const j of liveJobs) { const i = classifyJob(j, can); if (i) items.push(i); }
  for (const q of [failed, returned, ready]) for (const s of q.data?.data ?? []) { const i = classifyShipment(s, can); if (i) items.push(i); }
  for (const a of attention.data?.items ?? []) { const i = classifyAttention(a, can); if (i) items.push(i); }

  const src = (enabled: boolean, qs: Array<{ isLoading: boolean; error: unknown; refetch: () => unknown }>) => ({ enabled, loading: enabled && qs.some((q) => q.isLoading), error: qs.find((q) => q.error)?.error ?? null, retry: () => qs.forEach((q) => void q.refetch()) });
  const truncated = (samples.data ? samples.data.meta.total > samples.data.data.length : false) || (orders.data ? orders.data.meta.total > orders.data.data.length : false) || (jobs.data ? jobs.data.meta.total > jobs.data.data.length : false);
  return {
    items,
    sources: { samples: src(canSamples, [samples]), orders: src(canOrders, [orders]), jobs: src(canJobs, [jobs]), shipments: src(canShip, [failed, returned, ready]), attention: src(canKpi, [attention]) },
    attentionTotal: attention.data?.summary.total,
    truncated,
  };
}
