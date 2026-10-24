"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { SeverityBadge } from "@/components/data-display/severity-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/features/auth/auth-provider";
import { formatDate, formatMoney, formatNumber, humanizeCode } from "@/lib/utils/format";
import { currencyKeys, formatMinutes, formatPercent, attentionHref, referenceHref, utilizationState } from "./logic";
import { useAlerts, useBottlenecks, useCommercialKpis, useDashboardPipeline, useDeliveryKpis, useNeedsAttention, useOrderKpis, useProductionKpis, useQualityKpis, useUtilization, useWip, useWorkloadDepartments } from "./hooks";
import { Metric, PositiveEmpty, QuerySection, RankedBars, SegmentBar } from "./ui";
import type { AlertRow, AttentionItem, Range } from "./types";

/** Management permission codes (exact backend names). */
export const PERM = { kpis: "management_kpis.read", quality: "quality_kpis.read", commercial: "commercial_kpis.read", workload: "workload.read", capacity: "capacity.read", alerts: "automation.read", eta: "eta.read", dashboard: "dashboard.read" } as const;

const ALL = "__all";
const SEVERITIES = ["INFO", "WARNING", "CRITICAL"];

function who(r: AttentionItem["responsible"]): string | null {
  if (!r) return null;
  const users = (r.users ?? []).map((u) => (typeof u === "string" ? u : u.name)).filter(Boolean);
  const parts = [r.department ? humanizeCode(r.department) : null, users.length ? users.join(", ") : "unassigned"].filter(Boolean);
  return parts.join(" · ");
}

/** Prioritised problems from the backend (already ranked). Each row opens the entity to act on. */
export function NeedsAttentionSection({ limit = 15 }: { limit?: number }) {
  const [minSeverity, setMin] = useState(ALL);
  const [type, setType] = useState(ALL);
  const q = useNeedsAttention({ limit, ...(minSeverity !== ALL ? { minSeverity } : {}), ...(type !== ALL ? { type } : {}) });
  const s = q.data?.summary;
  return (
    <QuerySection title="Needs attention" query={q} testId="needs-attention" description={q.data?.note}
      action={<>
        {s ? <span className="text-xs text-muted-foreground" data-testid="attention-summary">{s.total} open{s.bySeverity.CRITICAL ? ` · ${s.bySeverity.CRITICAL} critical` : ""}{s.bySeverity.WARNING ? ` · ${s.bySeverity.WARNING} warning` : ""}</span> : null}
        <Select aria-label="Minimum severity" className="h-8 w-36" value={minSeverity} onValueChange={setMin} options={[{ value: ALL, label: "All severities" }, ...SEVERITIES.map((v) => ({ value: v, label: `${humanizeCode(v)}+` }))]} />
        <Select aria-label="Category" className="h-8 w-48" value={type} onValueChange={setType} options={[{ value: ALL, label: "All categories" }, ...Object.keys(s?.byType ?? {}).map((t) => ({ value: t, label: `${humanizeCode(t)} (${s?.byType[t]})` }))]} />
      </>}>
      {(d) => d.items.length === 0 ? <PositiveEmpty>Nothing needs attention — no blocked, delayed or overdue work.</PositiveEmpty> : (
        <ul className="-mx-4 divide-y" aria-label="Items needing attention">
          {d.items.map((item, i) => {
            const href = attentionHref(item);
            const who_ = who(item.responsible);
            return (
              <li key={`${item.type}-${item.entityId ?? i}`} data-testid="attention-item" data-type={item.type} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex shrink-0 items-center gap-2 sm:w-28 sm:flex-col sm:items-start"><SeverityBadge severity={item.severity} />{item.priority && item.priority !== "NORMAL" ? <PriorityBadge priority={item.priority} /> : null}</div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">{item.reference ? <span className="font-mono text-xs font-semibold">{item.reference}</span> : null}<span className="font-medium">{item.title}</span></p>
                  {item.reason ? <p className="mt-0.5 text-sm text-muted-foreground">{item.reason}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{humanizeCode(item.type)}{who_ ? ` · ${who_}` : ""}</p>
                </div>
                <dl className="flex shrink-0 gap-4 text-xs sm:flex-col sm:gap-0.5 sm:text-end">
                  {item.ageMinutes != null ? <div><dt className="inline text-muted-foreground">Age </dt><dd className="inline">{formatMinutes(item.ageMinutes)}</dd></div> : null}
                  {item.dueAt ? <div><dt className="inline text-muted-foreground">Due </dt><dd className="inline">{formatDate(item.dueAt)}</dd></div> : null}
                </dl>
                {href ? <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline" aria-label={`Open ${item.reference ?? item.title}`}>Open <ArrowRight aria-hidden className="size-3.5" /></Link> : null}
              </li>
            );
          })}
        </ul>
      )}
    </QuerySection>
  );
}

/** Risk strip: the figures that mean "something is late or stuck", each a drill-down. Sections that fail or are forbidden drop out alone. */
export function RiskSection({ range }: { range: Range }) {
  const { can } = useAuth();
  const p = useProductionKpis(range, can(PERM.kpis));
  const o = useOrderKpis(range, can(PERM.kpis));
  const d = useDeliveryKpis(range, can(PERM.kpis));
  if (!can(PERM.kpis)) return null;
  const items: Array<{ label: string; value: number | undefined; href: string; tone: "danger" | "warning"; hint?: string }> = [
    { label: "Blocked jobs", value: p.data?.blockedJobs, href: "/production?blocked=true", tone: "danger" },
    { label: "Delayed jobs", value: p.data?.delayedJobs, href: "/management/production?delayed=true", tone: "warning", hint: p.data?.definitions?.delayedJobs },
    { label: "Delayed orders", value: o.data?.current.delayed, href: "/orders?delayed=true", tone: "warning" },
    { label: "Past target date", value: d.data?.overdueDeliveryCommitments.ordersPastTargetDate, href: "/orders?delayed=true", tone: "warning" },
    { label: "Shipments past schedule", value: d.data?.overdueDeliveryCommitments.shipmentsPastScheduledDate, href: "/delivery?open=true", tone: "warning" },
    { label: "Failed deliveries", value: d.data?.shipments.failed, href: "/delivery?status=FAILED", tone: "danger" },
  ];
  const loading = p.isLoading || o.isLoading || d.isLoading;
  return (
    <section aria-label="Risk and delays" data-testid="risk-section" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((m) => <Metric key={m.label} label={m.label} href={m.href} value={loading && m.value === undefined ? "…" : m.value === undefined ? "—" : formatNumber(m.value)} tone={m.value ? m.tone : undefined} hint={m.value === undefined && !loading ? "Unavailable" : undefined} />)}
    </section>
  );
}

export function ProductionSection({ range }: { range: Range }) {
  const q = useProductionKpis(range);
  return (
    <QuerySection title="Production" query={q} testId="production-kpis" action={<Link href="/management/production" className="text-xs text-brand hover:underline">Details</Link>}>
      {(d) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Active jobs" value={formatNumber(d.activeJobs)} href="/production?status=IN_PROGRESS" />
            <Metric label="Planned" value={formatNumber(d.plannedJobs)} />
            <Metric label="Blocked" value={formatNumber(d.blockedJobs)} tone={d.blockedJobs ? "danger" : undefined} href="/production?blocked=true" />
            <Metric label="On hold" value={formatNumber(d.onHoldJobs)} />
            <Metric label="Completed (range)" value={formatNumber(d.completedJobs)} hint={`${d.completedToday} today · ${d.completedThisWeek} this week`} />
            <Metric label="On-time completion" value={formatPercent(d.onTimeCompletion.ratePercent)} hint={d.onTimeCompletion.measured ? `${d.onTimeCompletion.onTime} of ${d.onTimeCompletion.measured} measured` : "No completed jobs with a deadline in range"} />
            <Metric label="Average lead time" value={formatMinutes(d.averageLeadTimeMinutes)} hint={d.averageLeadTimeMinutes === null ? "Not enough data" : undefined} />
            <Metric label="Average stage time" value={formatMinutes(d.averageStageDurationMinutes)} hint={`${d.stagesMeasured} stages measured`} />
          </div>
        </div>
      )}
    </QuerySection>
  );
}

export function OrdersSection({ range }: { range: Range }) {
  const q = useOrderKpis(range);
  return (
    <QuerySection title="Orders" query={q} testId="order-kpis">
      {(d) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="In production" value={formatNumber(d.current.inProduction)} href="/orders?status=IN_PRODUCTION" />
            <Metric label="Ready for delivery" value={formatNumber(d.current.readyForDelivery)} href="/orders?status=READY_FOR_DELIVERY" />
            <Metric label="Partially shipped" value={formatNumber(d.current.partiallyShipped)} href="/orders?status=PARTIALLY_SHIPPED" />
            <Metric label="Delayed" value={formatNumber(d.current.delayed)} tone={d.current.delayed ? "warning" : undefined} href="/orders?delayed=true" />
            <Metric label="Delivered (range)" value={formatNumber(d.inRange.delivered)} />
            <Metric label="On-time delivery" value={formatPercent(d.onTimeDelivery.ratePercent)} hint={d.onTimeDelivery.measured ? `${d.onTimeDelivery.onTime} of ${d.onTimeDelivery.measured}` : "No delivered orders with a target date in range"} />
            <Metric label="Average cycle time" value={formatMinutes(d.averageCycleTimeMinutes)} hint={d.averageCycleTimeMinutes === null ? "Not enough data" : undefined} />
            <Metric label="On hold" value={formatNumber(d.current.onHold)} />
          </div>
        </div>
      )}
    </QuerySection>
  );
}

export function QualitySection({ range }: { range: Range }) {
  const q = useQualityKpis(range);
  return (
    <QuerySection title="Quality" query={q} testId="quality-kpis" action={<Link href="/management/quality" className="text-xs text-brand hover:underline">Details</Link>}>
      {(d) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Pass rate" testId="pass-rate" value={formatPercent(d.inspections.passRatePercent)} hint={d.inspections.completed ? `${d.inspections.completed} inspections` : "No inspections in range"} tone={d.inspections.passRatePercent !== null && d.inspections.passRatePercent < 80 ? "warning" : undefined} />
            <Metric label="Fail rate" testId="fail-rate" value={formatPercent(d.inspections.failRatePercent)} />
            <Metric label="Open rework" value={formatNumber(d.rework.open)} tone={d.rework.open ? "warning" : undefined} hint={`${d.rework.created} created in range`} />
            <Metric label="Rejected units" value={formatNumber(d.rejectedUnits)} />
          </div>
          {d.inspections.completed > 0 ? <SegmentBar label="Inspection results" segments={[{ label: "Pass", value: d.inspections.pass, className: "bg-tone-success-dot" }, { label: "Conditional", value: d.inspections.conditionalPass, className: "bg-tone-warning-dot" }, { label: "Fail", value: d.inspections.fail, className: "bg-tone-danger-dot" }]} /> : null}
        </div>
      )}
    </QuerySection>
  );
}

/** Money is shown per currency and never summed across currencies. Amounts stay decimal strings. */
export function CommercialBlocks({ blocks }: { blocks: Array<{ currency: string; ordersWithAcceptedQuotation: number; acceptedQuotationValue: string; verifiedPayments: string; outstandingBalance: string; overpaidAmount: string }> }) {
  if (blocks.length === 0) return <p className="text-sm text-muted-foreground" data-testid="no-currency">No accepted quotations yet.</p>;
  return (
    <div className="space-y-3" data-testid="by-currency">
      {currencyKeys(blocks).map((cur) => {
        const b = blocks.find((x) => x.currency === cur)!;
        return (
          <div key={cur} data-testid={`currency-${cur}`} className="rounded-md border p-3">
            <p className="mb-2 flex items-center justify-between text-sm font-semibold">{cur}<span className="text-xs font-normal text-muted-foreground">{b.ordersWithAcceptedQuotation} orders with an accepted quotation</span></p>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
              {([["Accepted value", b.acceptedQuotationValue], ["Verified payments", b.verifiedPayments], ["Outstanding", b.outstandingBalance], ["Overpaid", b.overpaidAmount]] as const).map(([l, v]) => <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd className="font-semibold tabular-nums">{formatMoney(v, cur)}</dd></div>)}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

export function CommercialSection({ range }: { range: Range }) {
  const q = useCommercialKpis(range);
  return (
    <QuerySection title="Commercial" query={q} testId="commercial-kpis" action={<Link href="/management/commercial" className="text-xs text-brand hover:underline">Details</Link>}>
      {(d) => (
        <div className="space-y-3">
          <CommercialBlocks blocks={d.byCurrency} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Metric label="Unpaid" value={formatNumber(d.orders.unpaid)} href="/orders?paymentState=UNPAID" />
            <Metric label="Partially paid" value={formatNumber(d.orders.partiallyPaid)} href="/orders?paymentState=PARTIALLY_PAID" />
            <Metric label="Paid" value={formatNumber(d.orders.paid)} href="/orders?paymentState=PAID" />
            <Metric label="No accepted quote" value={formatNumber(d.orders.withoutAcceptedQuotation)} />
            <Metric label="Re-approval needed" value={formatNumber(d.orders.commercialReapprovalRequired)} tone={d.orders.commercialReapprovalRequired ? "danger" : undefined} />
          </div>
        </div>
      )}
    </QuerySection>
  );
}

export function DeliverySection({ range }: { range: Range }) {
  const q = useDeliveryKpis(range);
  return (
    <QuerySection title="Delivery" query={q} testId="delivery-kpis" action={<Link href="/management/delivery" className="text-xs text-brand hover:underline">Details</Link>}>
      {(d) => {
        const s = d.shipments;
        return (
          <div className="space-y-3">
            <SegmentBar label="Shipments" segments={[{ label: "Ready", value: s.ready, className: "bg-tone-ready-dot" }, { label: "Dispatched", value: s.dispatched, className: "bg-tone-progress-dot" }, { label: "In transit", value: s.inTransit, className: "bg-brand" }, { label: "Failed", value: s.failed, className: "bg-tone-danger-dot" }, { label: "Delivered (range)", value: s.deliveredInRange, className: "bg-tone-success-dot" }, { label: "Returned (range)", value: s.returnedInRange, className: "bg-tone-warning-dot" }]} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Partially fulfilled orders" value={formatNumber(d.partialDeliveryOrders)} href="/orders?status=PARTIALLY_SHIPPED" />
              <Metric label="Dispatch → delivery" value={formatMinutes(d.averageDispatchToDeliveryMinutes)} hint={d.dispatchToDeliveryMeasured ? `${d.dispatchToDeliveryMeasured} measured` : "Not enough data"} />
              <Metric label="Failed" value={formatNumber(s.failed)} tone={s.failed ? "danger" : undefined} href="/delivery?status=FAILED" />
              <Metric label="Draft shipments" value={formatNumber(s.draft)} href="/delivery?status=DRAFT" />
            </div>
          </div>
        );
      }}
    </QuerySection>
  );
}

/** Where work accumulates: stages ranked by accumulated waiting time (the backend's ordering). */
export function BottlenecksSection({ range, limit }: { range: Range; limit?: number }) {
  const q = useBottlenecks(range);
  return (
    <QuerySection title="Bottlenecks" query={q} testId="bottlenecks" description={q.data?.caution}>
      {(d) => {
        const rows = (limit ? d.stages.slice(0, limit) : d.stages);
        const any = rows.some((r) => r.totalWaitMinutes > 0 || r.queuedNow > 0 || r.overdueNow > 0 || r.blockedNow > 0);
        if (!any) return <PositiveEmpty>No current bottlenecks — nothing is queued, blocked or overdue.</PositiveEmpty>;
        return (
          <div className="space-y-3">
            <RankedBars label="Waiting time by stage" rows={rows.map((s) => ({ key: s.stageCode, label: s.stageName, sub: humanizeCode(s.department), value: s.totalWaitMinutes, text: formatMinutes(s.totalWaitMinutes), href: `/management/production?stageCode=${s.stageCode}` }))} />
            <div className="relative overflow-x-auto"><table className="w-full min-w-max text-sm"><caption className="sr-only">Stages by waiting time</caption>
              <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1.5 text-start font-medium">Stage</th>{["Queued now", "Blocked", "Overdue", "Avg wait", "Avg duration", "Rework"].map((h) => <th key={h} scope="col" className="px-3 text-end font-medium">{h}</th>)}</tr></thead>
              <tbody>{rows.map((s) => (
                <tr key={s.stageCode} className="border-t" data-testid="bottleneck-row">
                  <th scope="row" className="py-1.5 text-start font-medium">{s.stageName}</th>
                  <td className="px-3 text-end tabular-nums">{s.queuedNow}</td>
                  <td className={`px-3 text-end tabular-nums ${s.blockedNow ? "font-semibold text-danger" : ""}`}>{s.blockedNow}</td>
                  <td className={`px-3 text-end tabular-nums ${s.overdueNow ? "font-semibold text-danger" : ""}`}>{s.overdueNow}</td>
                  <td className="px-3 text-end tabular-nums">{formatMinutes(s.averageWaitBeforeStartMinutes)}</td>
                  <td className="px-3 text-end tabular-nums">{formatMinutes(s.averageDurationMinutes)}</td>
                  <td className="px-3 text-end tabular-nums">{formatPercent(s.reworkRatePercent)}</td>
                </tr>))}</tbody></table></div>
          </div>
        );
      }}
    </QuerySection>
  );
}

export function WipSection() {
  const q = useWip();
  return (
    <QuerySection title="Work in progress by stage" query={q} testId="wip" description="Units are counted for bulk work only; sample jobs count as jobs.">
      {(d) => {
        const total = d.stages.reduce((n, s) => n + s.queued.stages + s.active.stages + s.blocked.stages, 0);
        if (total === 0) return <PositiveEmpty>No work in progress right now.</PositiveEmpty>;
        return (
          <ul className="space-y-3">
            {d.stages.map((s) => (
              <li key={s.stageCode} data-testid="wip-row">
                <p className="mb-1 flex items-baseline justify-between text-sm"><span className="font-medium">{s.stageName} <span className="text-xs font-normal text-muted-foreground">{humanizeCode(s.department)}</span></span><span className="text-xs text-muted-foreground">{s.completedToday.stages} done today</span></p>
                <SegmentBar label={s.stageName} segments={[{ label: "Queued", value: s.queued.stages, className: "bg-tone-ready-dot" }, { label: "Active", value: s.active.stages, className: "bg-tone-progress-dot" }, { label: "Blocked", value: s.blocked.stages, className: "bg-tone-danger-dot" }]} />
              </li>
            ))}
          </ul>
        );
      }}
    </QuerySection>
  );
}

export function WorkloadSection() {
  const q = useWorkloadDepartments();
  return (
    <QuerySection title="Workload by department" query={q} testId="workload" description={q.data?.note} action={<Link href="/management/workload" className="text-xs text-brand hover:underline">Details</Link>}>
      {(d) => (
        <div className="relative overflow-x-auto"><table className="w-full min-w-max text-sm"><caption className="sr-only">Stages per department</caption>
          <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1.5 text-start font-medium">Department</th>{["Ready", "In progress", "Blocked", "Overdue", "Unassigned", "Staff"].map((h) => <th key={h} scope="col" className="px-3 text-end font-medium">{h}</th>)}</tr></thead>
          <tbody>{d.departments.map((r) => (
            <tr key={r.department} className="border-t" data-testid="workload-row">
              <th scope="row" className="py-1.5 text-start font-medium">{humanizeCode(r.department)}</th>
              <td className="px-3 text-end tabular-nums">{r.readyStages}</td><td className="px-3 text-end tabular-nums">{r.inProgressStages}</td>
              <td className={`px-3 text-end tabular-nums ${r.blockedStages ? "font-semibold text-danger" : ""}`}>{r.blockedStages}</td>
              <td className={`px-3 text-end tabular-nums ${r.overdueStages ? "font-semibold text-danger" : ""}`}>{r.overdueStages}</td>
              <td className={`px-3 text-end tabular-nums ${r.unassignedReadyStages ? "font-semibold text-tone-warning-fg" : ""}`}>{r.unassignedReadyStages}</td>
              <td className="px-3 text-end tabular-nums">{r.eligibleStaffCount === undefined || r.eligibleStaffCount === null ? "—" : `${r.assignedStaffCount}/${r.eligibleStaffCount}`}</td>
            </tr>))}</tbody></table></div>
      )}
    </QuerySection>
  );
}

const STATE_CLASS: Record<string, string> = { overloaded: "bg-tone-danger-bg text-tone-danger-fg", high: "bg-tone-warning-bg text-tone-warning-fg", normal: "bg-tone-success-bg text-tone-success-fg", idle: "bg-surface-muted text-muted-foreground", unknown: "bg-surface-muted text-muted-foreground" };
export function CapacitySection({ department }: { department?: string }) {
  const q = useUtilization({ ...(department ? { department } : {}) });
  return (
    <QuerySection title="Capacity vs planned demand" query={q} testId="capacity" description="Next 7 days from configured department capacity. A day without configured capacity has no utilization.">
      {(d) => d.series.length === 0 ? <p className="text-sm text-muted-foreground" data-testid="no-capacity">No department capacity is configured, so utilization cannot be shown.</p> : (
        <div className="space-y-3">
          <div className="relative overflow-x-auto"><table className="w-full min-w-max text-sm"><caption className="sr-only">Utilization by department and day</caption>
            <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1.5 text-start font-medium">Department</th>{d.series[0]!.days.map((x) => <th key={x.date} scope="col" className="px-1 text-center font-medium">{x.date.slice(5)}</th>)}<th scope="col" className="px-2 text-end font-medium">Overloaded days</th></tr></thead>
            <tbody>{d.series.map((s) => (
              <tr key={`${s.departmentType}-${s.stageCode ?? ""}`} className="border-t" data-testid="capacity-row">
                <th scope="row" className="py-1.5 text-start font-medium">{humanizeCode(s.departmentType)}{s.stageCode ? ` · ${humanizeCode(s.stageCode)}` : ""}</th>
                {s.days.map((x) => { const st = utilizationState(x); return <td key={x.date} className="px-0.5 py-0.5"><span data-state={st} title={`${x.demand} of ${x.capacity} ${humanizeCode(x.capacityUnit)}`} className={`block rounded px-1.5 py-1 text-center text-xs tabular-nums ${STATE_CLASS[st]}`}>{x.utilizationPercent === null ? "—" : `${Math.round(x.utilizationPercent)}%`}</span></td>; })}
                <td className={`px-2 text-end tabular-nums ${s.overloadedDays ? "font-semibold text-danger" : ""}`}>{s.overloadedDays}</td>
              </tr>))}</tbody></table></div>
          {d.departmentsWithoutCapacity.length ? <p className="text-xs text-muted-foreground" data-testid="without-capacity">No capacity configured for: {d.departmentsWithoutCapacity.map((x) => humanizeCode(typeof x === "string" ? x : x.departmentType ?? "")).join(", ")}</p> : null}
          <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Assumptions</summary><ul className="mt-1 list-disc ps-5">{d.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></details>
        </div>
      )}
    </QuerySection>
  );
}

export function AlertRowItem({ a }: { a: AlertRow }) {
  const href = referenceHref(a.reference);
  return (
    <li data-testid="alert-row" data-status={a.status} data-severity={a.severity} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex shrink-0 items-center gap-2 sm:w-32 sm:flex-col sm:items-start"><SeverityBadge severity={a.severity} /><StatusBadge status={a.status === "OPEN" ? "BLOCKED" : "COMPLETED"} label={a.status === "OPEN" ? "Open" : "Resolved"} /></div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm"><span className="font-mono text-xs font-semibold">{a.reference}</span><span className="font-medium">{a.title}</span></p>
        <p className="mt-0.5 text-sm text-muted-foreground">{a.reason}</p>
        <p className="mt-1 text-xs text-muted-foreground">{humanizeCode(a.type)}{a.department ? ` · ${humanizeCode(a.department)}` : ""}{a.escalationLevel > 0 ? ` · escalation level ${a.escalationLevel}` : " · not escalated"}</p>
      </div>
      <dl className="shrink-0 text-xs sm:text-end"><div><dt className="inline text-muted-foreground">First seen </dt><dd className="inline">{formatDate(a.firstDetectedAt)}</dd></div>{a.resolvedAt ? <div><dt className="inline text-muted-foreground">Resolved </dt><dd className="inline">{formatDate(a.resolvedAt)}</dd></div> : <div><dt className="inline text-muted-foreground">Last seen </dt><dd className="inline">{formatDate(a.lastDetectedAt)}</dd></div>}</dl>
      {href ? <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">Open <ArrowRight aria-hidden className="size-3.5" /></Link> : null}
    </li>
  );
}

export function RecentAlertsSection() {
  const q = useAlerts({ status: "OPEN", pageSize: 5 });
  return (
    <QuerySection title="Open operational alerts" query={q} testId="recent-alerts" action={<Link href="/management/alerts" className="text-xs text-brand hover:underline">All alerts</Link>}>
      {(d) => d.data.length === 0 ? <PositiveEmpty>No open alerts.</PositiveEmpty> : <ul className="-mx-4 divide-y">{d.data.map((a) => <AlertRowItem key={a.id} a={a} />)}</ul>}
    </QuerySection>
  );
}

export function PipelineSection({ range }: { range: Range }) {
  const q = useDashboardPipeline(range);
  return (
    <QuerySection title="Pipelines" query={q} testId="pipelines">
      {(d) => (
        <div className="grid gap-4 lg:grid-cols-2">
          {([["Samples", d.pipeline?.samples], ["Orders", d.pipeline?.orders]] as const).map(([t, c]) => c ? (
            <div key={t}><p className="mb-1.5 text-sm font-medium">{t}</p><ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">{Object.entries(c).map(([k, v]) => <li key={k} className="flex justify-between text-sm"><span className="truncate text-muted-foreground">{humanizeCode(k.replace(/([a-z])([A-Z])/g, "$1_$2"))}</span><span className="font-semibold tabular-nums">{v}</span></li>)}</ul></div>
          ) : null)}
        </div>
      )}
    </QuerySection>
  );
}
