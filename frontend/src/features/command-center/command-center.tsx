"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { useAttention } from "@/features/responsibilities/hooks";
import { useCommandData, type CommandData } from "./hooks";
import { FILTERS, QUEUES, QUEUE_ORDER, canActOn, groupByQueue, matchesFilter, rankItems, uniqueByDestination, type Filter, type ItemKind, type QueueItem, type QueueKey } from "./logic";

const UrgencyBadge = ({ u }: { u: QueueItem["urgency"] }) => (u === "normal" ? null : (
  <span data-urgency={u} className={cn("inline-flex h-5 items-center rounded-sm px-1.5 text-[0.75rem] font-medium", u === "critical" ? "bg-tone-danger-bg text-tone-danger-fg" : "bg-tone-warning-bg text-tone-warning-fg")}>{u === "critical" ? "Critical" : "High"}</span>
));

/** Which backend lists a queue is built from (a queue is shown when the caller can read at least one of them). */
const DEPENDS: Record<QueueKey, Array<keyof CommandData["sources"]>> = {
  newRequests: ["samples"], needsReview: ["samples", "orders"], readyForQuotation: ["samples", "orders"], awaitingCustomer: ["samples", "orders"], awaitingPayment: ["samples", "orders"],
  readyForProduction: ["samples", "orders", "jobs"], inProduction: ["jobs"], readyForShipment: ["orders", "shipments"], deliveryIssues: ["shipments"],
};
const KIND_LABEL: Record<ItemKind, string> = { sample: "sample", order: "order", job: "job", shipment: "shipment", attention: "item" };
const plural = (n: number, kind: ItemKind) => `${n} ${KIND_LABEL[kind]}${n === 1 ? "" : "s"}`;

function ItemRow({ item, rank }: { item: QueueItem; rank?: number }) {
  return (
    <li data-testid="command-item" data-queue={item.queue} data-urgency={item.urgency} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
      {rank ? <span className="w-5 font-mono text-xs tabular-nums text-muted-foreground">{String(rank).padStart(2, "0")}</span> : null}
      <span className="min-w-0 flex-1">
        <Link href={item.href} className="font-medium text-brand hover:underline" data-testid="next-action-link">{item.action}</Link>
        <span className="ms-2 font-mono text-xs font-semibold">{item.ref}</span>
        <span className="ms-2 text-muted-foreground">{item.title}</span>
      </span>
      <UrgencyBadge u={item.urgency} />
      {item.status && item.kind !== "attention" ? <StatusBadge status={item.status} /> : null}
      {item.dueAt ? <span className="text-xs text-muted-foreground">due {formatDate(item.dueAt)}</span> : null}
    </li>
  );
}

function QueueCard({ queue, items, data }: { queue: QueueKey; items: QueueItem[]; data: CommandData }) {
  const def = QUEUES[queue];
  const deps = DEPENDS[queue].map((k) => data.sources[k]).filter((s) => s.enabled);
  const loading = deps.some((s) => s.loading);
  const failed = deps.find((s) => s.error);
  const urgent = items.filter((i) => i.urgency !== "normal").length;
  const kinds = (["sample", "order", "job", "shipment"] as ItemKind[]).map((k) => [k, items.filter((i) => i.kind === k).length] as const).filter(([, n]) => n > 0);
  const links = def.links.filter((l) => items.length === 0 || kinds.length === 0 || kinds.some(([k]) => k === l.kind) || def.links.length === 1);
  return (
    <Card variant={urgent ? "attention" : "default"} data-testid="queue-card" data-queue={queue} data-count={items.length}>
      <CardHeader><CardTitle>{def.title}</CardTitle>{urgent ? <span className="text-xs font-medium text-tone-warning-fg">{urgent} urgent</span> : null}</CardHeader>
      <CardContent className="space-y-2">
        <p className="flex items-baseline gap-3"><span className="text-4xl font-semibold tabular-nums leading-none tracking-tight" data-testid="queue-count">{loading && items.length === 0 ? "…" : items.length}{data.truncated && items.length >= 50 ? "+" : ""}</span><span className="text-xs text-muted-foreground">{kinds.map(([k, n]) => plural(n, k)).join(" · ")}</span></p>
        <p className="text-xs text-muted-foreground">{def.blurb}</p>
        {failed ? <p role="alert" className="text-xs text-danger" data-testid="queue-error">Some items could not be loaded. <button type="button" className="underline" onClick={failed.retry}>Retry</button></p> : null}
        {items.length > 0 ? (
          <ul className="-mx-4 divide-y border-t" aria-label={`${def.title} items`}>{items.slice(0, 3).map((i) => <ItemRow key={i.id} item={i} />)}</ul>
        ) : loading ? <Skeleton className="h-8" /> : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
          {links.map((l, idx) => <Link key={l.href} href={l.href} className={cn("inline-flex items-center gap-1 font-medium hover:underline", idx === 0 ? "text-brand" : "text-muted-foreground")}>{idx === 0 ? "Open queue" : l.label}{idx === 0 && def.links.length > 1 ? ` · ${l.label}` : ""} <ArrowRight aria-hidden className="size-3.5" /></Link>)}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The Command Center: what to do next (ranked), then the workflow queues. Everything is derived from real backend lists and
 * statuses (see logic.ts); each source is an independent query, so one failing list only marks the cards that use it.
 */
export function CommandCenter() {
  const { can } = useAuth();
  const data = useCommandData(can);
  const resp = useAttention(can("responsibilities.read"));
  const respRules = resp.data?.rulesNeedingAttention?.count ?? 0;
  const respUnassigned = resp.data?.unassignedActiveStages?.count ?? 0;
  const [filter, setFilter] = useState<Filter>("all");
  const { ranked, byQueue } = useMemo(() => {
    const all = rankItems(data.items);
    return { ranked: all, byQueue: groupByQueue(all) };
  }, [data.items]);
  const visible = uniqueByDestination(ranked.filter((i) => matchesFilter(i, filter)));
  const next = visible.slice(0, 6);
  const enabledSources = Object.values(data.sources).filter((s) => s.enabled);
  if (enabledSources.length === 0) return null;
  const loading = enabledSources.some((s) => s.loading);
  const allClear = !loading && ranked.length === 0 && (data.attentionTotal ?? 0) === 0 && respRules === 0 && respUnassigned === 0 && enabledSources.every((s) => !s.error);
  const cards = QUEUE_ORDER.filter((q) => canActOn(q, can)).filter((q) => DEPENDS[q].some((k) => data.sources[k].enabled)).filter((q) => filter === "all" || byQueue[q].some((i) => matchesFilter(i, filter)));

  return (
    <section aria-label="Command Center" className="space-y-4" data-testid="command-center">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Quick filters" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => <Button key={f.value} size="sm" variant={filter === f.value ? "primary" : "secondary"} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>{f.label}</Button>)}
        </div>
        {data.truncated ? <p className="text-xs text-muted-foreground">Showing the first 100 of a longer list; open the queue for everything.</p> : null}
      </div>

      {allClear ? (
        <p role="status" data-testid="all-caught-up" className="flex items-center gap-2 rounded-md bg-tone-success-bg px-4 py-3 text-sm font-medium text-tone-success-fg"><CheckCircle2 aria-hidden className="size-5" /> You&apos;re all caught up. Nothing needs your action right now.</p>
      ) : (
        <Card variant="action" aria-labelledby="next-title" data-testid="next-actions">
          <CardHeader><CardTitle><span id="next-title">What to do next</span></CardTitle><span className="text-xs text-muted-foreground">Most urgent first</span></CardHeader>
          {loading && next.length === 0 ? <CardContent><Skeleton className="h-24" /></CardContent> : next.length === 0 ? <CardContent><p className="text-sm text-muted-foreground">{filter === "all" ? "Nothing to do right now." : "Nothing matches this filter."}</p></CardContent> : (
            <ol className="divide-y border-t" aria-label="Next actions">{next.map((i, idx) => <ItemRow key={i.id} item={i} rank={idx + 1} />)}</ol>
          )}
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="queue-grid">
        {cards.map((q) => <QueueCard key={q} queue={q} items={byQueue[q].filter((i) => matchesFilter(i, filter))} data={data} />)}
        {respRules > 0 && (filter === "all" || filter === "urgent") ? (
          <Card variant="attention" data-testid="resp-attention-card"><CardHeader><CardTitle>Responsibilities need attention</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-3xl font-semibold tabular-nums leading-none">{respRules}</p><p className="text-xs text-muted-foreground">A default or customer override points at someone who is disabled or no longer eligible.</p><Link href="/responsibilities" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">Open responsibilities <ArrowRight aria-hidden className="size-3.5" /></Link></CardContent></Card>
        ) : null}
        {respUnassigned > 0 && (filter === "all" || filter === "urgent") ? (
          <Card variant="attention" data-testid="resp-unassigned-card"><CardHeader><CardTitle>Unassigned active stages</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-3xl font-semibold tabular-nums leading-none">{respUnassigned}</p><p className="text-xs text-muted-foreground">Ready, in-progress or blocked stages nobody owns.</p><Link href="/responsibilities#unassigned" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">See which areas <ArrowRight aria-hidden className="size-3.5" /></Link></CardContent></Card>
        ) : null}
        {data.sources.attention.enabled && (filter === "all" || filter === "urgent") ? (
          <Card variant={(data.attentionTotal ?? 0) > 0 ? "attention" : "default"} data-testid="attention-card"><CardHeader><CardTitle>Needs attention</CardTitle></CardHeader><CardContent className="space-y-2">
            <p className="text-3xl font-semibold tabular-nums leading-none">{data.attentionTotal ?? (data.sources.attention.loading ? "…" : "—")}</p>
            <p className="text-xs text-muted-foreground">Blocked, overdue, failed or unassigned work flagged by the factory monitors.</p>
            <a href="#needs-attention" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">Open queue <ArrowRight aria-hidden className="size-3.5" /></a>
          </CardContent></Card>
        ) : null}
      </div>
    </section>
  );
}
