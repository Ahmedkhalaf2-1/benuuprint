"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Pagination } from "@/components/data-display/pagination";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-provider";
import { CommandCenter } from "@/features/command-center/command-center";
import { useListParams } from "@/hooks/use-list-params";

import { queryKeys } from "@/lib/query/keys";
import { useAlerts, useCommercialKpis, useDeliveryKpis, useManagementBoard, useQualityKpis, useScheduler, useWorkloadStaff } from "./hooks";
import { currencyKeys, formatMinutes, formatPercent } from "./logic";
import { AlertRowItem, BottlenecksSection, CapacitySection, CommercialSection, DeliverySection, NeedsAttentionSection, OrdersSection, PERM, PipelineSection, ProductionSection, QualitySection, RecentAlertsSection, RiskSection, WipSection, WorkloadSection } from "./sections";
import { EtaText, Metric, PositiveEmpty, QuerySection, RangeControl, RankedBars, RefreshButton, useRange } from "./ui";
import { DEPARTMENTS, type BoardRow } from "./types";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";

function useRefresh() {
  const qc = useQueryClient();
  return { refresh: () => qc.invalidateQueries({ queryKey: queryKeys.management.all }), busy: qc.isFetching({ queryKey: queryKeys.management.all }) > 0 };
}
const Header = ({ title, description, extra }: { title: string; description: string; extra?: React.ReactNode }) => {
  const { refresh, busy } = useRefresh();
  return <PageHeader title={title} description={description} actions={<>{extra}<RefreshButton onClick={refresh} busy={busy} /></>} />;
};

/** /dashboard — the Management Dashboard. Every section is its own query, so one failing or forbidden endpoint only affects that card. */
export function ManagementDashboard() {
  const { t } = useI18n();
  const { can } = useAuth();
  const { range, set } = useRange();
  const kpis = can(PERM.kpis);
  if (!can(PERM.dashboard)) return <AccessDeniedState />;
  return (
    <>
      <Header title={t("management.commandCenter")} description={t("management.whatNeedsYourAttentionNowAnd")} />
      <div className="space-y-6">
        <CommandCenter />
        {kpis ? <div id="needs-attention" className="scroll-mt-4"><NeedsAttentionSection /></div> : null}
        <RiskSection range={range} />
        {kpis || can(PERM.quality) || can(PERM.commercial) || can(PERM.workload) ? (
          <div className="space-y-4">
            <div><h2 className="text-lg font-semibold">{t("management.managementIntelligence")}</h2><div className="mt-2"><RangeControl range={range} onChange={set} /><p className="mt-1 text-xs text-muted-foreground">{t("management.theRangeAppliesToKpisCurrent")}</p></div></div>
            <div className="grid gap-4 xl:grid-cols-2">
              {kpis ? <ProductionSection range={range} /> : null}
              {kpis ? <BottlenecksSection range={range} limit={5} /> : null}
              {can(PERM.quality) ? <QualitySection range={range} /> : null}
              {can(PERM.commercial) ? <CommercialSection range={range} /> : null}
              {kpis ? <DeliverySection range={range} /> : null}
              {kpis ? <OrdersSection range={range} /> : null}
              {can(PERM.workload) ? <WorkloadSection /> : null}
              {can(PERM.capacity) ? <CapacitySection /> : null}
            </div>
          </div>
        ) : null}
        {can(PERM.alerts) ? <RecentAlertsSection /> : null}
        {can(PERM.dashboard) ? <PipelineSection range={range} /> : null}
      </div>
    </>
  );
}

function Guard({ perm, children }: { perm: string | string[]; children: React.ReactNode }) {
  const { canAny } = useAuth();
  return canAny(...(Array.isArray(perm) ? perm : [perm])) ? <>{children}</> : <AccessDeniedState />;
}

/** /management/production — the management board (jobs, delays, risk, ETA), bottlenecks and WIP. Jobs open the real Factory Job screen. */
export function ProductionInsightsPage() {
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const { range, set } = useRange();
  const { params, update } = useListParams({ pageSize: 20 });
  const f = params.filters;
  const q = useManagementBoard({ page: params.page, pageSize: params.pageSize, stageCode: f.stageCode, department: f.department, priority: f.priority, kind: f.kind, blocked: f.blocked, delayed: f.delayed }, can(PERM.kpis));
  const setF = (k: string, v: string | undefined) => update({ filters: { [k]: v === ALL ? undefined : v } });
  return (
    <Guard perm={PERM.kpis}>
      <Header title={t("management.productionOverview")} description={t("management.liveJobsAcrossDepartmentsWithDelays")} />
      <div className="space-y-4">
        <QuerySection title={t("management.liveJobs")} query={q} testId="management-board" action={<Link href="/production" className="text-xs text-brand hover:underline">{t("management.operationalBoard")}</Link>}>
          {(d) => (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select aria-label={t("management.department")} className="h-8 w-40" value={f.department ?? ALL} onValueChange={(v) => setF("department", v)} options={[{ value: ALL, label: t("management.allDepartments") }, ...DEPARTMENTS.map((x) => ({ value: x, label: fmt.code(x) }))]} />
                <Select aria-label={t("common.priority")} className="h-8 w-36" value={f.priority ?? ALL} onValueChange={(v) => setF("priority", v)} options={[{ value: ALL, label: t("management.anyPriority") }, ...["LOW", "NORMAL", "HIGH", "URGENT"].map((x) => ({ value: x, label: fmt.code(x) }))]} />
                <Select aria-label={t("management.kind")} className="h-8 w-32" value={f.kind ?? ALL} onValueChange={(v) => setF("kind", v)} options={[{ value: ALL, label: t("management.samplesBulk") }, { value: "SAMPLE", label: t("management.samples") }, { value: "BULK", label: t("management.bulk") }]} />
                <label className="flex items-center gap-2 text-sm"><Switch aria-label={t("common.delayed")} checked={f.delayed === "true"} onCheckedChange={(c) => setF("delayed", c ? "true" : undefined)} />{" "}{t("common.delayed")}</label>
                <label className="flex items-center gap-2 text-sm"><Switch aria-label={t("common.blocked")} checked={f.blocked === "true"} onCheckedChange={(c) => setF("blocked", c ? "true" : undefined)} />{" "}{t("common.blocked")}</label>
                {f.stageCode ? <button type="button" className="text-xs text-brand hover:underline" onClick={() => setF("stageCode", undefined)}>{t("management.stageStagecode", { stageCode: fmt.code(f.stageCode) })}</button> : null}
              </div>
              {d.data.length === 0 ? <EmptyState title={t("management.noJobsMatch")} description={t("management.noLiveJobsMatchTheCurrent")} className="py-8" /> : (
                <div className="relative overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[60rem] text-sm"><caption className="sr-only">{t("management.liveJobs")}</caption>
                    <thead className="bg-surface-muted text-xs text-muted-foreground"><tr>{[t.text("Job"), t.text("Customer"), t.text("Status"), t.text("Current stage"), t.text("Progress"), t.text("Delay / risk"), d.etaIncluded ? "Estimated completion" : null].filter(Boolean).map((h) => <th key={h} scope="col" className="h-9 px-3 text-start font-medium">{h}</th>)}</tr></thead>
                    <tbody>{d.data.map((r) => <BoardRowView key={r.jobId} r={r} eta={d.etaIncluded} />)}</tbody>
                  </table>
                </div>
              )}
              <Pagination meta={d.meta} onPageChange={(page) => update({ page })} onPageSizeChange={(pageSize) => update({ pageSize })} />
            </div>
          )}
        </QuerySection>
        <div className="mb-2"><RangeControl range={range} onChange={set} /></div>
        <BottlenecksSection range={range} />
        {can(PERM.workload) ? <WipSection /> : null}
      </div>
    </Guard>
  );
}

function BoardRowView({ r, eta }: { r: BoardRow; eta: boolean }) {
  const { t, fmt } = useI18n();
  return (
    <tr className="border-t align-top" data-testid="board-row" data-blocked={r.blocked} data-delayed={r.delayed}>
      <td className="px-3 py-2"><Link href={`/production/jobs/${r.jobId}`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{r.jobNumber}</Link><span className="block text-xs text-muted-foreground">{r.productName} · {r.kind === "BULK" ? t("management.bulkV1", { v1: r.batchNumber ? ` ${r.batchNumber}` : "" }) : t("management.sample")}</span><PriorityBadge priority={r.priority} className="mt-1" /></td>
      <td className="px-3 py-2">{r.customerName}<span className="block text-xs text-muted-foreground">{r.brandName}</span></td>
      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
      <td className="px-3 py-2">{r.currentStages.length ? r.currentStages.map((s) => <span key={s.stageId} className="block"><Link href={`/production/jobs/${r.jobId}?stage=${s.stageId}`} className="hover:text-brand hover:underline">{s.stageName}</Link><span className="text-xs text-muted-foreground"> · {fmt.code(s.status)}{s.dueAt ? t("management.dueDueat", { dueAt: fmt.date(s.dueAt) }) : ""}</span></span>) : <span className="text-muted-foreground">—</span>}</td>
      <td className="px-3 py-2 tabular-nums">{t("management.stagesProgress", { done: r.progress.stagesCompleted, total: r.progress.stagesRequired })}{r.progress.plannedQuantity != null ? <span className="block text-xs text-muted-foreground">{t("management.unitsProgress", { done: r.progress.completedQuantity, total: r.progress.plannedQuantity })}</span> : null}</td>
      <td className="px-3 py-2">{r.blocked || r.delayed || r.projectedLate ? (
        <span className="space-y-0.5">{r.blocked ? <span className="block text-xs font-medium text-tone-blocked-fg">{t("common.blocked")}</span> : null}{r.delayed ? <span className="block text-xs font-medium text-tone-danger-fg">{t("common.delayed")}{r.delayMinutes ? ` ${formatMinutes(r.delayMinutes)}` : ""}</span> : null}{r.delayReasons.length ? <span className="block text-xs text-muted-foreground">{r.delayReasons.map((x) => fmt.code(x)).join(", ")}</span> : null}{r.projectedLate ? <span className="block text-xs font-medium text-tone-warning-fg">{t("management.projectedLate")}</span> : null}</span>
      ) : <span className="text-xs text-muted-foreground">{t("management.onTrack")}</span>}</td>
      {eta ? <td className="px-3 py-2"><EtaText at={r.estimatedCompletionAt} quality={r.etaDataQuality} compact /></td> : null}
    </tr>
  );
}

export function QualityPage() {
  const { t, fmt } = useI18n();
  const { range, set } = useRange();
  const q = useQualityKpis(range);
  return (
    <Guard perm={PERM.quality}>
      <Header title={t("management.quality")} description={t("management.inspectionResultsReworkAndRejectedUnits")} extra={null} />
      <div className="mb-4"><RangeControl range={range} onChange={set} timezone={q.data?.timezone} /></div>
      <div className="space-y-4">
        <QualitySection range={range} />
        <QuerySection title={t("management.whereInspectionsFail")} query={q} testId="failures">
          {(d) => (
            <div className="grid gap-6 lg:grid-cols-2">
              <div><p className="mb-2 text-sm font-medium">{t("management.byStage")}</p>{d.failuresByStage.length === 0 ? <PositiveEmpty>{t("management.noFailedInspectionsInThisRange")}</PositiveEmpty> : <RankedBars label={t("management.failuresByStage")} rows={d.failuresByStage.map((s) => ({ key: s.stageCode, label: s.stageName, value: s.failures, text: t("management.failuresFailedV2", { failures: s.failures, v2: s.failedUnits ? ` · ${s.failedUnits} units` : "" }) }))} />}</div>
              <div><p className="mb-2 text-sm font-medium">{t("management.byProduct")}</p>{d.failuresByProduct.length === 0 ? <PositiveEmpty>{t("management.noFailuresByProduct")}</PositiveEmpty> : <RankedBars label={t("management.failuresByProduct")} rows={d.failuresByProduct.map((s) => ({ key: s.productTypeId, label: s.productName, value: s.failures, text: t("management.failuresFailed", { failures: s.failures }) }))} />}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:col-span-2">
                <Metric label={t("management.inspectedUnits")} value={fmt.number(d.inspections.inspectedUnits)} />
                <Metric label={t("management.failedUnits")} value={fmt.number(d.inspections.failedUnits)} />
                <Metric label={t("management.repeatFailureRate")} testId="repeat-rate" value={formatPercent(d.repeatFailure.ratePercent)} hint={d.repeatFailure.jobStagesWithFailure ? t("management.repeatedOfJobstageswithfailureFailedStagesRe", { repeated: d.repeatFailure.repeated, jobStagesWithFailure: d.repeatFailure.jobStagesWithFailure }) : t("management.noFailedStagesInRange")} />
                <Metric label={t("management.reworkFlaggedUnits")} value={fmt.number(d.reworkFlaggedUnits)} />
              </div>
              {d.rework.note ? <p className="text-xs text-muted-foreground lg:col-span-2">{d.rework.note}</p> : null}
              {d.notDerived?.length ? <p className="text-xs text-muted-foreground lg:col-span-2" data-testid="not-derived">{t("management.notReportedV1", { v1: d.notDerived.join("; ") })}</p> : null}
            </div>
          )}
        </QuerySection>
      </div>
    </Guard>
  );
}

export function CommercialPage() {
  const { t, fmt } = useI18n();
  const { range, set } = useRange();
  const q = useCommercialKpis(range);
  return (
    <Guard perm={PERM.commercial}>
      <Header title={t("management.commercial")} description={t("management.acceptedQuotationsVerifiedPaymentsAndBalance")} />
      <div className="mb-4"><RangeControl range={range} onChange={set} timezone={q.data?.timezone} /></div>
      <div className="space-y-4">
        <CommercialSection range={range} />
        <QuerySection title={t("management.verifiedPaymentsInRange")} query={q} testId="verified-in-range" description={q.data?.definitions?.verifiedInRange}>
          {(d) => (
            <div className="space-y-3">
              {d.verifiedInRange.length === 0 ? <p className="text-sm text-muted-foreground">{t("management.noPaymentsWereVerifiedInThis")}</p> : (
                <ul className="divide-y rounded-md border" aria-label={t("management.verifiedPaymentsByCurrency")}>{d.verifiedInRange.map((v) => <li key={`${v.currency}-${v.target}`} data-testid="verified-row" className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"><span>{v.currency} · {fmt.code(v.target)}<span className="ms-2 text-xs text-muted-foreground">{t("management.paymentsPayments", { payments: v.payments })}</span></span><span className="font-semibold tabular-nums">{fmt.money(v.total, v.currency)}</span></li>)}</ul>
              )}
              <p className="text-xs text-muted-foreground" data-testid="currencies">{t("management.currencies")}{" "}{currencyKeys(d.byCurrency).join(", ") || t("management.none")}{" "}{t("management.amountsInDifferentCurrenciesAreListed")}</p>
            </div>
          )}
        </QuerySection>
      </div>
    </Guard>
  );
}

export function DeliveryInsightsPage() {
  const { t, fmt } = useI18n();
  const { range, set } = useRange();
  const q = useDeliveryKpis(range);
  return (
    <Guard perm={PERM.kpis}>
      <Header title={t("management.delivery")} description={t("management.shipmentsInFlightFailuresAndCommitments")} />
      <div className="mb-4"><RangeControl range={range} onChange={set} timezone={q.data?.timezone} /></div>
      <div className="space-y-4">
        <DeliverySection range={range} />
        <QuerySection title={t("management.commitments")} query={q} testId="commitments" description={q.data?.definitions?.overdueDeliveryCommitments}>
          {(d) => <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Metric label={t("management.ordersPastTargetDate")} value={fmt.number(d.overdueDeliveryCommitments.ordersPastTargetDate)} tone={d.overdueDeliveryCommitments.ordersPastTargetDate ? "warning" : "good"} href="/orders?delayed=true" /><Metric label={t("management.shipmentsPastScheduledDate")} value={fmt.number(d.overdueDeliveryCommitments.shipmentsPastScheduledDate)} tone={d.overdueDeliveryCommitments.shipmentsPastScheduledDate ? "warning" : "good"} href="/delivery?open=true" /><Metric label={t("management.readyToShip")} value={fmt.number(d.shipments.ready)} href="/delivery?status=READY" /></div>}
        </QuerySection>
        <OrdersSection range={range} />
      </div>
    </Guard>
  );
}

export function WorkloadPage() {
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const { params, update } = useListParams({ pageSize: 20 });
  const dept = params.filters.department;
  const staff = useWorkloadStaff({ page: params.page, pageSize: params.pageSize, department: dept }, can(PERM.workload));
  return (
    <Guard perm={[PERM.workload, PERM.capacity]}>
      <Header title={t("management.workloadCapacity")} description={t("management.whoIsLoadedWithWhatAnd")} />
      <div className="space-y-4">
        {can(PERM.workload) ? <WorkloadSection /> : null}
        {can(PERM.capacity) ? <CapacitySection department={dept} /> : null}
        {can(PERM.workload) ? (
          <QuerySection title={t("management.staffWorkload")} query={staff} testId="staff-workload" description={staff.data?.note}
            action={<Select aria-label={t("management.department")} className="h-8 w-40" value={dept ?? ALL} onValueChange={(v) => update({ filters: { department: v === ALL ? undefined : v } })} options={[{ value: ALL, label: t("management.allDepartments") }, ...DEPARTMENTS.map((x) => ({ value: x, label: fmt.code(x) }))]} />}>
            {(d) => d.data.length === 0 ? <EmptyState title={t("management.noStaff")} description={t("management.noStaffMatch")} className="py-8" /> : (
              <div className="space-y-2">
                <div className="relative overflow-x-auto rounded-md border"><table className="w-full min-w-max text-sm"><caption className="sr-only">{t("management.workloadPerStaffMember")}</caption>
                  <thead className="bg-surface-muted text-xs text-muted-foreground"><tr><th scope="col" className="h-9 px-3 text-start font-medium">{t("management.staff")}</th>{[t.text("Active"), t.text("Ready"), t.text("In progress"), t.text("Blocked"), t.text("Overdue"), t.text("Completed"), "On-time", t.text("Avg completion"), t.text("Capacity / day")].map((h) => <th key={h} scope="col" className="px-3 text-end font-medium">{h}</th>)}</tr></thead>
                  <tbody>{d.data.map((s) => (
                    <tr key={s.userId} className="border-t" data-testid="staff-row">
                      <th scope="row" className="px-3 py-1.5 text-start font-medium">{s.name}<span className="block text-xs font-normal text-muted-foreground">{s.roles.map((r) => fmt.code(r)).join(", ")}</span></th>
                      <td className="px-3 text-end tabular-nums">{s.activeAssignments}</td><td className="px-3 text-end tabular-nums">{s.readyAssignments}</td><td className="px-3 text-end tabular-nums">{s.inProgressAssignments}</td>
                      <td className={`px-3 text-end tabular-nums ${s.blockedAssignments ? "font-semibold text-danger" : ""}`}>{s.blockedAssignments}</td>
                      <td className={`px-3 text-end tabular-nums ${s.overdueAssignments ? "font-semibold text-danger" : ""}`}>{s.overdueAssignments}</td>
                      <td className="px-3 text-end tabular-nums">{s.stagesCompleted}</td>
                      <td className="px-3 text-end tabular-nums">{formatPercent(s.onTimeCompletionRate, 0)}</td>
                      <td className="px-3 text-end tabular-nums">{formatMinutes(s.averageCompletionMinutes)}</td>
                      <td className="px-3 text-end tabular-nums">{s.capacityMinutesPerDay === null ? <span className="text-muted-foreground" title={t("management.noStaffCapacityConfigured")}>—</span> : `${s.capacityMinutesPerDay}m`}</td>
                    </tr>))}</tbody></table></div>
                <Pagination meta={d.meta} onPageChange={(page) => update({ page })} onPageSizeChange={(pageSize) => update({ pageSize })} />
              </div>
            )}
          </QuerySection>
        ) : null}
      </div>
    </Guard>
  );
}

const ALERT_TYPES = ["BLOCKED_STAGE", "DELAYED_STAGE", "OVERDUE_JOB", "OVERDUE_ORDER", "FAILED_QC", "OPEN_REWORK", "PAYMENT_BLOCK", "COMMERCIAL_REAPPROVAL_REQUIRED", "UNASSIGNED_READY_STAGE", "APPROACHING_DEADLINE", "SHIPMENT_FAILED", "DELIVERY_DELAY", "PACKAGING_DELAY"];

/** Read-only: the backend raises, de-duplicates, escalates and resolves alerts; this page only reflects them (there is no acknowledge/resolve endpoint). */
export function AlertsPage() {
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const { params, update } = useListParams({ pageSize: 20 });
  const f = params.filters;
  const q = useAlerts({ page: params.page, pageSize: params.pageSize, status: f.status ?? "OPEN", type: f.type, severity: f.severity }, can(PERM.alerts));
  const health = useScheduler(can(PERM.alerts));
  const setF = (k: string, v: string | undefined) => update({ filters: { [k]: v === ALL ? undefined : v } });
  return (
    <Guard perm={PERM.alerts}>
      <Header title={t("management.operationalAlerts")} description={t("management.problemsDetectedByTheSchedulerWith")} />
      <div className="space-y-4">
        <QuerySection title={t("management.scheduler")} query={health} testId="scheduler">
          {(h) => (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className={h.enabled ? "font-medium text-tone-success-fg" : "font-medium text-danger"} data-testid="scheduler-state">{h.enabled ? t("management.automationIsRunning") : t("management.automationIsDisabled")}</span>
              <span className="text-muted-foreground">{t("management.outboxEveryOutboxSDispatchEvery", { outbox: h.intervals.outbox, dispatch: h.intervals.dispatch, alerts: h.intervals.alerts })}</span>
              <span className="text-muted-foreground">{h.runningNow.length ? t("management.runningNowV1", { v1: h.runningNow.join(", ") }) : t("management.idle")}</span>
            </div>
          )}
        </QuerySection>
        <QuerySection title={t("management.alerts")} query={q} testId="alerts"
          action={<>
            <Select aria-label={t("management.state")} className="h-8 w-32" value={f.status ?? "OPEN"} onValueChange={(v) => setF("status", v === "OPEN" ? undefined : v)} options={[{ value: "OPEN", label: t("management.open") }, { value: "RESOLVED", label: t("management.resolved") }]} />
            <Select aria-label={t("management.severity")} className="h-8 w-36" value={f.severity ?? ALL} onValueChange={(v) => setF("severity", v)} options={[{ value: ALL, label: t("management.anySeverity") }, ...["CRITICAL", "WARNING", "INFO"].map((v) => ({ value: v, label: fmt.code(v) }))]} />
            <Select aria-label={t("common.type")} className="h-8 w-48" value={f.type ?? ALL} onValueChange={(v) => setF("type", v)} options={[{ value: ALL, label: t("management.anyType") }, ...ALERT_TYPES.map((v) => ({ value: v, label: fmt.code(v) }))]} />
          </>}>
          {(d) => d.data.length === 0 ? <PositiveEmpty>{(f.status ?? "OPEN") === "OPEN" ? t("management.noOpenAlerts") : t("management.noResolvedAlertsMatch")}</PositiveEmpty> : (
            <div><ul className="-mx-4 divide-y">{d.data.map((a) => <AlertRowItem key={a.id} a={a} />)}</ul><Pagination meta={d.meta} onPageChange={(page) => update({ page })} onPageSizeChange={(pageSize) => update({ pageSize })} /></div>
          )}
        </QuerySection>
      </div>
    </Guard>
  );
}
