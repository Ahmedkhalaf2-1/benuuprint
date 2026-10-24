"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { SeverityBadge } from "@/components/data-display/severity-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/features/auth/auth-provider";
import { humanizeCode } from "@/lib/utils/format";
import { currencyKeys, formatMinutes, formatPercent, attentionHref, referenceHref, utilizationState } from "./logic";
import { useAlerts, useBottlenecks, useCommercialKpis, useDashboardPipeline, useDeliveryKpis, useNeedsAttention, useOrderKpis, useProductionKpis, useQualityKpis, useUtilization, useWip, useWorkloadDepartments } from "./hooks";
import { Metric, PositiveEmpty, QuerySection, RankedBars, SegmentBar } from "./ui";
import type { AlertRow, AttentionItem, Range } from "./types";
import { useI18n } from "@/i18n/provider";

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
  const { t, fmt } = useI18n();
  const [minSeverity, setMin] = useState(ALL);
  const [type, setType] = useState(ALL);
  const q = useNeedsAttention({ limit, ...(minSeverity !== ALL ? { minSeverity } : {}), ...(type !== ALL ? { type } : {}) });
  const s = q.data?.summary;
  return (
    <QuerySection title={t("common.needsAttention")} query={q} testId="needs-attention" description={q.data?.note}
      action={<>
        {s ? <span className="text-xs text-muted-foreground" data-testid="attention-summary">{t("management.totalOpen", { total: s.total })}{s.bySeverity.CRITICAL ? t("management.criticalCritical", { CRITICAL: s.bySeverity.CRITICAL }) : ""}{s.bySeverity.WARNING ? t("management.warningWarning", { WARNING: s.bySeverity.WARNING }) : ""}</span> : null}
        <Select aria-label={t("management.minimumSeverity")} className="h-8 w-36" value={minSeverity} onValueChange={setMin} options={[{ value: ALL, label: t("management.allSeverities") }, ...SEVERITIES.map((v) => ({ value: v, label: `${fmt.code(v)}+` }))]} />
        <Select aria-label={t("management.category")} className="h-8 w-48" value={type} onValueChange={setType} options={[{ value: ALL, label: t("management.allCategories") }, ...Object.keys(s?.byType ?? {}).map((t) => ({ value: t, label: `${fmt.code(t)} (${s?.byType[t]})` }))]} />
      </>}>
      {(d) => d.items.length === 0 ? <PositiveEmpty>{t("management.nothingNeedsAttentionNoBlockedDelayed")}</PositiveEmpty> : (
        <ul className="-mx-4 divide-y" aria-label={t("management.itemsNeedingAttention")}>
          {d.items.map((item, i) => {
            const href = attentionHref(item);
            const who_ = who(item.responsible);
            return (
              <li key={`${item.type}-${item.entityId ?? i}`} data-testid="attention-item" data-type={item.type} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex shrink-0 items-center gap-2 sm:w-28 sm:flex-col sm:items-start"><SeverityBadge severity={item.severity} />{item.priority && item.priority !== "NORMAL" ? <PriorityBadge priority={item.priority} /> : null}</div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">{item.reference ? <span className="font-mono text-xs font-semibold">{item.reference}</span> : null}<span className="font-medium">{item.title}</span></p>
                  {item.reason ? <p className="mt-0.5 text-sm text-muted-foreground">{item.reason}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{fmt.code(item.type)}{who_ ? ` · ${who_}` : ""}</p>
                </div>
                <dl className="flex shrink-0 gap-4 text-xs sm:flex-col sm:gap-0.5 sm:text-end">
                  {item.ageMinutes != null ? <div><dt className="inline text-muted-foreground">{t("management.age")}{" "}</dt><dd className="inline">{formatMinutes(item.ageMinutes)}</dd></div> : null}
                  {item.dueAt ? <div><dt className="inline text-muted-foreground">{t("management.due")}{" "}</dt><dd className="inline">{fmt.date(item.dueAt)}</dd></div> : null}
                </dl>
                {href ? <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline" aria-label={t("management.openV1", { v1: item.reference ?? item.title })}>{t("management.open")}{" "}<ArrowRight aria-hidden className="rtl:-scale-x-100 size-3.5" /></Link> : null}
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
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const p = useProductionKpis(range, can(PERM.kpis));
  const o = useOrderKpis(range, can(PERM.kpis));
  const d = useDeliveryKpis(range, can(PERM.kpis));
  if (!can(PERM.kpis)) return null;
  const items: Array<{ label: string; value: number | undefined; href: string; tone: "danger" | "warning"; hint?: string }> = [
    { label: t("management.blockedJobs"), value: p.data?.blockedJobs, href: "/production?blocked=true", tone: "danger" },
    { label: t("management.delayedJobs"), value: p.data?.delayedJobs, href: "/management/production?delayed=true", tone: "warning", hint: p.data?.definitions?.delayedJobs },
    { label: t("management.delayedOrders"), value: o.data?.current.delayed, href: "/orders?delayed=true", tone: "warning" },
    { label: t("management.pastTargetDate"), value: d.data?.overdueDeliveryCommitments.ordersPastTargetDate, href: "/orders?delayed=true", tone: "warning" },
    { label: t("management.shipmentsPastSchedule"), value: d.data?.overdueDeliveryCommitments.shipmentsPastScheduledDate, href: "/delivery?open=true", tone: "warning" },
    { label: t("management.failedDeliveries"), value: d.data?.shipments.failed, href: "/delivery?status=FAILED", tone: "danger" },
  ];
  const loading = p.isLoading || o.isLoading || d.isLoading;
  return (
    <section aria-label={t("management.riskAndDelays")} data-testid="risk-section" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((m) => <Metric key={m.label} label={m.label} href={m.href} value={loading && m.value === undefined ? "…" : m.value === undefined ? "—" : fmt.number(m.value)} tone={m.value ? m.tone : undefined} hint={m.value === undefined && !loading ? t("management.unavailable") : undefined} />)}
    </section>
  );
}

export function ProductionSection({ range }: { range: Range }) {
  const { t, fmt } = useI18n();
  const q = useProductionKpis(range);
  return (
    <QuerySection title={t("common.production")} query={q} testId="production-kpis" action={<Link href="/management/production" className="text-xs text-brand hover:underline">{t("common.details")}</Link>}>
      {(d) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label={t("management.activeJobs")} value={fmt.number(d.activeJobs)} href="/production?status=IN_PROGRESS" />
            <Metric label={t("management.planned")} value={fmt.number(d.plannedJobs)} />
            <Metric label={t("common.blocked")} value={fmt.number(d.blockedJobs)} tone={d.blockedJobs ? "danger" : undefined} href="/production?blocked=true" />
            <Metric label={t("common.onHold")} value={fmt.number(d.onHoldJobs)} />
            <Metric label={t("management.completedRange")} value={fmt.number(d.completedJobs)} hint={t("management.completedtodayTodayCompletedthisweekThisWeek", { completedToday: d.completedToday, completedThisWeek: d.completedThisWeek })} />
            <Metric label={t("management.onTimeCompletion")} value={formatPercent(d.onTimeCompletion.ratePercent)} hint={d.onTimeCompletion.measured ? t("management.ontimeOfMeasuredMeasured", { onTime: d.onTimeCompletion.onTime, measured: d.onTimeCompletion.measured }) : t("management.noCompletedJobsWithADeadline")} />
            <Metric label={t("management.averageLeadTime")} value={formatMinutes(d.averageLeadTimeMinutes)} hint={d.averageLeadTimeMinutes === null ? t("management.notEnoughData") : undefined} />
            <Metric label={t("management.averageStageTime")} value={formatMinutes(d.averageStageDurationMinutes)} hint={t("management.stagesmeasuredStagesMeasured", { stagesMeasured: d.stagesMeasured })} />
          </div>
        </div>
      )}
    </QuerySection>
  );
}

export function OrdersSection({ range }: { range: Range }) {
  const { t, fmt } = useI18n();
  const q = useOrderKpis(range);
  return (
    <QuerySection title={t("management.orders")} query={q} testId="order-kpis">
      {(d) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label={t("management.inProduction")} value={fmt.number(d.current.inProduction)} href="/orders?status=IN_PRODUCTION" />
            <Metric label={t("management.readyForDelivery")} value={fmt.number(d.current.readyForDelivery)} href="/orders?status=READY_FOR_DELIVERY" />
            <Metric label={t("management.partiallyShipped")} value={fmt.number(d.current.partiallyShipped)} href="/orders?status=PARTIALLY_SHIPPED" />
            <Metric label={t("common.delayed")} value={fmt.number(d.current.delayed)} tone={d.current.delayed ? "warning" : undefined} href="/orders?delayed=true" />
            <Metric label={t("management.deliveredRange")} value={fmt.number(d.inRange.delivered)} />
            <Metric label={t("management.onTimeDelivery")} value={formatPercent(d.onTimeDelivery.ratePercent)} hint={d.onTimeDelivery.measured ? t("management.ontimeOfMeasured", { onTime: d.onTimeDelivery.onTime, measured: d.onTimeDelivery.measured }) : t("management.noDeliveredOrdersWithATarget")} />
            <Metric label={t("management.averageCycleTime")} value={formatMinutes(d.averageCycleTimeMinutes)} hint={d.averageCycleTimeMinutes === null ? t("management.notEnoughData") : undefined} />
            <Metric label={t("common.onHold")} value={fmt.number(d.current.onHold)} />
          </div>
        </div>
      )}
    </QuerySection>
  );
}

export function QualitySection({ range }: { range: Range }) {
  const { t, fmt } = useI18n();
  const q = useQualityKpis(range);
  return (
    <QuerySection title={t("management.quality")} query={q} testId="quality-kpis" action={<Link href="/management/quality" className="text-xs text-brand hover:underline">{t("common.details")}</Link>}>
      {(d) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label={t("management.passRate")} testId="pass-rate" value={formatPercent(d.inspections.passRatePercent)} hint={d.inspections.completed ? t("management.completedInspections", { completed: d.inspections.completed }) : t("management.noInspectionsInRange")} tone={d.inspections.passRatePercent !== null && d.inspections.passRatePercent < 80 ? "warning" : undefined} />
            <Metric label={t("management.failRate")} testId="fail-rate" value={formatPercent(d.inspections.failRatePercent)} />
            <Metric label={t("management.openRework")} value={fmt.number(d.rework.open)} tone={d.rework.open ? "warning" : undefined} hint={t("management.createdCreatedInRange", { created: d.rework.created })} />
            <Metric label={t("management.rejectedUnits")} value={fmt.number(d.rejectedUnits)} />
          </div>
          {d.inspections.completed > 0 ? <SegmentBar label={t("management.inspectionResults")} segments={[{ label: t("management.pass"), value: d.inspections.pass, className: "bg-tone-success-dot" }, { label: t("management.conditional"), value: d.inspections.conditionalPass, className: "bg-tone-warning-dot" }, { label: t("management.fail"), value: d.inspections.fail, className: "bg-tone-danger-dot" }]} /> : null}
        </div>
      )}
    </QuerySection>
  );
}

/** Money is shown per currency and never summed across currencies. Amounts stay decimal strings. */
export function CommercialBlocks({ blocks }: { blocks: Array<{ currency: string; ordersWithAcceptedQuotation: number; acceptedQuotationValue: string; verifiedPayments: string; outstandingBalance: string; overpaidAmount: string }> }) {
  const { t, fmt } = useI18n();
  if (blocks.length === 0) return <p className="text-sm text-muted-foreground" data-testid="no-currency">{t("management.noAcceptedQuotationsYet")}</p>;
  return (
    <div className="space-y-3" data-testid="by-currency">
      {currencyKeys(blocks).map((cur) => {
        const b = blocks.find((x) => x.currency === cur)!;
        return (
          <div key={cur} data-testid={`currency-${cur}`} className="rounded-md border p-3">
            <p className="mb-2 flex items-center justify-between text-sm font-semibold">{cur}<span className="text-xs font-normal text-muted-foreground">{t("management.orderswithacceptedquotationOrdersWithAnAccep", { ordersWithAcceptedQuotation: b.ordersWithAcceptedQuotation })}</span></p>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
              {([[t.text("Accepted value"), b.acceptedQuotationValue], [t.text("Verified payments"), b.verifiedPayments], ["Outstanding", b.outstandingBalance], [t.text("Overpaid"), b.overpaidAmount]] as const).map(([l, v]) => <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd className="font-semibold tabular-nums">{fmt.money(v, cur)}</dd></div>)}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

export function CommercialSection({ range }: { range: Range }) {
  const { t, fmt } = useI18n();
  const q = useCommercialKpis(range);
  return (
    <QuerySection title={t("management.commercial")} query={q} testId="commercial-kpis" action={<Link href="/management/commercial" className="text-xs text-brand hover:underline">{t("common.details")}</Link>}>
      {(d) => (
        <div className="space-y-3">
          <CommercialBlocks blocks={d.byCurrency} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Metric label={t("management.unpaid")} value={fmt.number(d.orders.unpaid)} href="/orders?paymentState=UNPAID" />
            <Metric label={t("management.partiallyPaid")} value={fmt.number(d.orders.partiallyPaid)} href="/orders?paymentState=PARTIALLY_PAID" />
            <Metric label={t("management.paid")} value={fmt.number(d.orders.paid)} href="/orders?paymentState=PAID" />
            <Metric label={t("management.noAcceptedQuote")} value={fmt.number(d.orders.withoutAcceptedQuotation)} />
            <Metric label={t("management.reApprovalNeeded")} value={fmt.number(d.orders.commercialReapprovalRequired)} tone={d.orders.commercialReapprovalRequired ? "danger" : undefined} />
          </div>
        </div>
      )}
    </QuerySection>
  );
}

export function DeliverySection({ range }: { range: Range }) {
  const { t, fmt } = useI18n();
  const q = useDeliveryKpis(range);
  return (
    <QuerySection title={t("management.delivery")} query={q} testId="delivery-kpis" action={<Link href="/management/delivery" className="text-xs text-brand hover:underline">{t("common.details")}</Link>}>
      {(d) => {
        const s = d.shipments;
        return (
          <div className="space-y-3">
            <SegmentBar label={t("management.shipments")} segments={[{ label: t("management.ready"), value: s.ready, className: "bg-tone-ready-dot" }, { label: t("management.dispatched"), value: s.dispatched, className: "bg-tone-progress-dot" }, { label: t("management.inTransit"), value: s.inTransit, className: "bg-brand" }, { label: t("management.failed"), value: s.failed, className: "bg-tone-danger-dot" }, { label: t("management.deliveredRange"), value: s.deliveredInRange, className: "bg-tone-success-dot" }, { label: t("management.returnedRange"), value: s.returnedInRange, className: "bg-tone-warning-dot" }]} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label={t("management.partiallyFulfilledOrders")} value={fmt.number(d.partialDeliveryOrders)} href="/orders?status=PARTIALLY_SHIPPED" />
              <Metric label={t("management.dispatchDelivery")} value={formatMinutes(d.averageDispatchToDeliveryMinutes)} hint={d.dispatchToDeliveryMeasured ? t("management.dispatchtodeliverymeasuredMeasured", { dispatchToDeliveryMeasured: d.dispatchToDeliveryMeasured }) : t("management.notEnoughData")} />
              <Metric label={t("management.failed")} value={fmt.number(s.failed)} tone={s.failed ? "danger" : undefined} href="/delivery?status=FAILED" />
              <Metric label={t("management.draftShipments")} value={fmt.number(s.draft)} href="/delivery?status=DRAFT" />
            </div>
          </div>
        );
      }}
    </QuerySection>
  );
}

/** Where work accumulates: stages ranked by accumulated waiting time (the backend's ordering). */
export function BottlenecksSection({ range, limit }: { range: Range; limit?: number }) {
  const { t, fmt } = useI18n();
  const q = useBottlenecks(range);
  return (
    <QuerySection title={t("management.bottlenecks")} query={q} testId="bottlenecks" description={q.data?.caution}>
      {(d) => {
        const rows = (limit ? d.stages.slice(0, limit) : d.stages);
        const any = rows.some((r) => r.totalWaitMinutes > 0 || r.queuedNow > 0 || r.overdueNow > 0 || r.blockedNow > 0);
        if (!any) return <PositiveEmpty>{t("management.noCurrentBottlenecksNothingIsQueued")}</PositiveEmpty>;
        return (
          <div className="space-y-3">
            <RankedBars label={t("management.waitingTimeByStage")} rows={rows.map((s) => ({ key: s.stageCode, label: s.stageName, sub: fmt.code(s.department), value: s.totalWaitMinutes, text: formatMinutes(s.totalWaitMinutes), href: `/management/production?stageCode=${s.stageCode}` }))} />
            <div className="relative overflow-x-auto"><table className="w-full min-w-max text-sm"><caption className="sr-only">{t("management.stagesByWaitingTime")}</caption>
              <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1.5 text-start font-medium">{t("management.stage")}</th>{[t.text("Queued now"), t.text("Blocked"), t.text("Overdue"), t.text("Avg wait"), t.text("Avg duration"), "Rework"].map((h) => <th key={h} scope="col" className="px-3 text-end font-medium">{h}</th>)}</tr></thead>
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
  const { t, fmt } = useI18n();
  const q = useWip();
  return (
    <QuerySection title={t("management.workInProgressByStage")} query={q} testId="wip" description={t("management.unitsAreCountedForBulkWork")}>
      {(d) => {
        const total = d.stages.reduce((n, s) => n + s.queued.stages + s.active.stages + s.blocked.stages, 0);
        if (total === 0) return <PositiveEmpty>{t("management.noWorkInProgressRightNow")}</PositiveEmpty>;
        return (
          <ul className="space-y-3">
            {d.stages.map((s) => (
              <li key={s.stageCode} data-testid="wip-row">
                <p className="mb-1 flex items-baseline justify-between text-sm"><span className="font-medium">{s.stageName} <span className="text-xs font-normal text-muted-foreground">{fmt.code(s.department)}</span></span><span className="text-xs text-muted-foreground">{t("management.stagesDoneToday", { stages: s.completedToday.stages })}</span></p>
                <SegmentBar label={s.stageName} segments={[{ label: t("management.queued"), value: s.queued.stages, className: "bg-tone-ready-dot" }, { label: t("management.active"), value: s.active.stages, className: "bg-tone-progress-dot" }, { label: t("common.blocked"), value: s.blocked.stages, className: "bg-tone-danger-dot" }]} />
              </li>
            ))}
          </ul>
        );
      }}
    </QuerySection>
  );
}

export function WorkloadSection() {
  const { t, fmt } = useI18n();
  const q = useWorkloadDepartments();
  return (
    <QuerySection title={t("management.workloadByDepartment")} query={q} testId="workload" description={q.data?.note} action={<Link href="/management/workload" className="text-xs text-brand hover:underline">{t("common.details")}</Link>}>
      {(d) => (
        <div className="relative overflow-x-auto"><table className="w-full min-w-max text-sm"><caption className="sr-only">{t("management.stagesPerDepartment")}</caption>
          <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1.5 text-start font-medium">{t("management.department")}</th>{[t.text("Ready"), t.text("In progress"), t.text("Blocked"), t.text("Overdue"), t.text("Unassigned"), t.text("Staff")].map((h) => <th key={h} scope="col" className="px-3 text-end font-medium">{h}</th>)}</tr></thead>
          <tbody>{d.departments.map((r) => (
            <tr key={r.department} className="border-t" data-testid="workload-row">
              <th scope="row" className="py-1.5 text-start font-medium">{fmt.code(r.department)}</th>
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
  const { t, fmt } = useI18n();
  const q = useUtilization({ ...(department ? { department } : {}) });
  return (
    <QuerySection title={t("management.capacityVsPlannedDemand")} query={q} testId="capacity" description={t("management.next7DaysFromConfiguredDepartment")}>
      {(d) => d.series.length === 0 ? <p className="text-sm text-muted-foreground" data-testid="no-capacity">{t("management.noDepartmentCapacityIsConfiguredSo")}</p> : (
        <div className="space-y-3">
          <div className="relative overflow-x-auto"><table className="w-full min-w-max text-sm"><caption className="sr-only">{t("management.utilizationByDepartmentAndDay")}</caption>
            <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1.5 text-start font-medium">{t("management.department")}</th>{d.series[0]!.days.map((x) => <th key={x.date} scope="col" className="px-1 text-center font-medium">{x.date.slice(5)}</th>)}<th scope="col" className="px-2 text-end font-medium">{t("management.overloadedDays")}</th></tr></thead>
            <tbody>{d.series.map((s) => (
              <tr key={`${s.departmentType}-${s.stageCode ?? ""}`} className="border-t" data-testid="capacity-row">
                <th scope="row" className="py-1.5 text-start font-medium">{fmt.code(s.departmentType)}{s.stageCode ? ` · ${fmt.code(s.stageCode)}` : ""}</th>
                {s.days.map((x) => { const st = utilizationState(x); return <td key={x.date} className="px-0.5 py-0.5"><span data-state={st} title={t("management.demandOfCapacityCapacityunit", { demand: x.demand, capacity: x.capacity, capacityUnit: fmt.code(x.capacityUnit) })} className={`block rounded px-1.5 py-1 text-center text-xs tabular-nums ${STATE_CLASS[st]}`}>{x.utilizationPercent === null ? "—" : `${Math.round(x.utilizationPercent)}%`}</span></td>; })}
                <td className={`px-2 text-end tabular-nums ${s.overloadedDays ? "font-semibold text-danger" : ""}`}>{s.overloadedDays}</td>
              </tr>))}</tbody></table></div>
          {d.departmentsWithoutCapacity.length ? <p className="text-xs text-muted-foreground" data-testid="without-capacity">{t("management.noCapacityConfiguredForV1", { v1: d.departmentsWithoutCapacity.map((x) => fmt.code(typeof x === "string" ? x : x.departmentType ?? "")).join(", ") })}</p> : null}
          <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{t("management.assumptions")}</summary><ul className="mt-1 list-disc ps-5">{d.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></details>
        </div>
      )}
    </QuerySection>
  );
}

export function AlertRowItem({ a }: { a: AlertRow }) {
  const { t, fmt } = useI18n();
  const href = referenceHref(a.reference);
  return (
    <li data-testid="alert-row" data-status={a.status} data-severity={a.severity} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex shrink-0 items-center gap-2 sm:w-32 sm:flex-col sm:items-start"><SeverityBadge severity={a.severity} /><StatusBadge status={a.status === "OPEN" ? "BLOCKED" : "COMPLETED"} label={a.status === "OPEN" ? t("management.open") : t("management.resolved")} /></div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm"><span className="font-mono text-xs font-semibold">{a.reference}</span><span className="font-medium">{a.title}</span></p>
        <p className="mt-0.5 text-sm text-muted-foreground">{a.reason}</p>
        <p className="mt-1 text-xs text-muted-foreground">{fmt.code(a.type)}{a.department ? ` · ${fmt.code(a.department)}` : ""}{a.escalationLevel > 0 ? t("management.escalationLevelEscalationlevel", { escalationLevel: a.escalationLevel }) : t("management.notEscalated")}</p>
      </div>
      <dl className="shrink-0 text-xs sm:text-end"><div><dt className="inline text-muted-foreground">{t("management.firstSeen")}{" "}</dt><dd className="inline">{fmt.date(a.firstDetectedAt)}</dd></div>{a.resolvedAt ? <div><dt className="inline text-muted-foreground">{t("management.resolved")}{" "}</dt><dd className="inline">{fmt.date(a.resolvedAt)}</dd></div> : <div><dt className="inline text-muted-foreground">{t("management.lastSeen")}{" "}</dt><dd className="inline">{fmt.date(a.lastDetectedAt)}</dd></div>}</dl>
      {href ? <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">{t("management.open")}{" "}<ArrowRight aria-hidden className="rtl:-scale-x-100 size-3.5" /></Link> : null}
    </li>
  );
}

export function RecentAlertsSection() {
  const { t } = useI18n();
  const q = useAlerts({ status: "OPEN", pageSize: 5 });
  return (
    <QuerySection title={t("management.openOperationalAlerts")} query={q} testId="recent-alerts" action={<Link href="/management/alerts" className="text-xs text-brand hover:underline">{t("management.allAlerts")}</Link>}>
      {(d) => d.data.length === 0 ? <PositiveEmpty>{t("management.noOpenAlerts")}</PositiveEmpty> : <ul className="-mx-4 divide-y">{d.data.map((a) => <AlertRowItem key={a.id} a={a} />)}</ul>}
    </QuerySection>
  );
}

export function PipelineSection({ range }: { range: Range }) {
  const { t, fmt } = useI18n();
  const q = useDashboardPipeline(range);
  return (
    <QuerySection title={t("management.pipelines")} query={q} testId="pipelines">
      {(d) => (
        <div className="grid gap-4 lg:grid-cols-2">
          {([[t.text("Samples"), d.pipeline?.samples], [t.text("Orders"), d.pipeline?.orders]] as const).map(([t, c]) => c ? (
            <div key={t}><p className="mb-1.5 text-sm font-medium">{t}</p><ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">{Object.entries(c).map(([k, v]) => <li key={k} className="flex justify-between text-sm"><span className="truncate text-muted-foreground">{fmt.code(k.replace(/([a-z])([A-Z])/g, "$1_$2"))}</span><span className="font-semibold tabular-nums">{v}</span></li>)}</ul></div>
          ) : null)}
        </div>
      )}
    </QuerySection>
  );
}
