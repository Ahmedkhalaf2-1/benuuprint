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
import { formatDate, formatMoney, formatNumber, humanizeCode } from "@/lib/utils/format";
import { queryKeys } from "@/lib/query/keys";
import { useAlerts, useCommercialKpis, useDeliveryKpis, useManagementBoard, useQualityKpis, useScheduler, useWorkloadStaff } from "./hooks";
import { currencyKeys, formatMinutes, formatPercent } from "./logic";
import { AlertRowItem, BottlenecksSection, CapacitySection, CommercialSection, DeliverySection, NeedsAttentionSection, OrdersSection, PERM, PipelineSection, ProductionSection, QualitySection, RecentAlertsSection, RiskSection, WipSection, WorkloadSection } from "./sections";
import { EtaText, Metric, PositiveEmpty, QuerySection, RangeControl, RankedBars, RefreshButton, useRange } from "./ui";
import { DEPARTMENTS, type BoardRow } from "./types";

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
  const { can } = useAuth();
  const { range, set } = useRange();
  const kpis = can(PERM.kpis);
  if (!can(PERM.dashboard)) return <AccessDeniedState />;
  return (
    <>
      <Header title="Command Center" description="What needs your attention now — and what to do about it." />
      <div className="space-y-6">
        <CommandCenter />
        {kpis ? <div id="needs-attention" className="scroll-mt-4"><NeedsAttentionSection /></div> : null}
        <RiskSection range={range} />
        {kpis || can(PERM.quality) || can(PERM.commercial) || can(PERM.workload) ? (
          <div className="space-y-4">
            <div><h2 className="text-lg font-semibold">Management intelligence</h2><div className="mt-2"><RangeControl range={range} onChange={set} /><p className="mt-1 text-xs text-muted-foreground">The range applies to KPIs; current-state figures (blocked now, queues, workload) always show now.</p></div></div>
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
  const { can } = useAuth();
  const { range, set } = useRange();
  const { params, update } = useListParams({ pageSize: 20 });
  const f = params.filters;
  const q = useManagementBoard({ page: params.page, pageSize: params.pageSize, stageCode: f.stageCode, department: f.department, priority: f.priority, kind: f.kind, blocked: f.blocked, delayed: f.delayed }, can(PERM.kpis));
  const setF = (k: string, v: string | undefined) => update({ filters: { [k]: v === ALL ? undefined : v } });
  return (
    <Guard perm={PERM.kpis}>
      <Header title="Production overview" description="Live jobs across departments with delays, risk and estimated completion. Open a job to act on it." />
      <div className="space-y-4">
        <QuerySection title="Live jobs" query={q} testId="management-board" action={<Link href="/production" className="text-xs text-brand hover:underline">Operational board</Link>}>
          {(d) => (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select aria-label="Department" className="h-8 w-40" value={f.department ?? ALL} onValueChange={(v) => setF("department", v)} options={[{ value: ALL, label: "All departments" }, ...DEPARTMENTS.map((x) => ({ value: x, label: humanizeCode(x) }))]} />
                <Select aria-label="Priority" className="h-8 w-36" value={f.priority ?? ALL} onValueChange={(v) => setF("priority", v)} options={[{ value: ALL, label: "Any priority" }, ...["LOW", "NORMAL", "HIGH", "URGENT"].map((x) => ({ value: x, label: humanizeCode(x) }))]} />
                <Select aria-label="Kind" className="h-8 w-32" value={f.kind ?? ALL} onValueChange={(v) => setF("kind", v)} options={[{ value: ALL, label: "Samples + bulk" }, { value: "SAMPLE", label: "Samples" }, { value: "BULK", label: "Bulk" }]} />
                <label className="flex items-center gap-2 text-sm"><Switch aria-label="Delayed" checked={f.delayed === "true"} onCheckedChange={(c) => setF("delayed", c ? "true" : undefined)} /> Delayed</label>
                <label className="flex items-center gap-2 text-sm"><Switch aria-label="Blocked" checked={f.blocked === "true"} onCheckedChange={(c) => setF("blocked", c ? "true" : undefined)} /> Blocked</label>
                {f.stageCode ? <button type="button" className="text-xs text-brand hover:underline" onClick={() => setF("stageCode", undefined)}>Stage: {humanizeCode(f.stageCode)} ✕</button> : null}
              </div>
              {d.data.length === 0 ? <EmptyState title="No jobs match" description="No live jobs match the current filters." className="py-8" /> : (
                <div className="relative overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[60rem] text-sm"><caption className="sr-only">Live jobs</caption>
                    <thead className="bg-surface-muted text-xs text-muted-foreground"><tr>{["Job", "Customer", "Status", "Current stage", "Progress", "Delay / risk", d.etaIncluded ? "Estimated completion" : null].filter(Boolean).map((h) => <th key={h} scope="col" className="h-9 px-3 text-start font-medium">{h}</th>)}</tr></thead>
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
  return (
    <tr className="border-t align-top" data-testid="board-row" data-blocked={r.blocked} data-delayed={r.delayed}>
      <td className="px-3 py-2"><Link href={`/production/jobs/${r.jobId}`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{r.jobNumber}</Link><span className="block text-xs text-muted-foreground">{r.productName} · {r.kind === "BULK" ? `bulk${r.batchNumber ? ` ${r.batchNumber}` : ""}` : "sample"}</span><PriorityBadge priority={r.priority} className="mt-1" /></td>
      <td className="px-3 py-2">{r.customerName}<span className="block text-xs text-muted-foreground">{r.brandName}</span></td>
      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
      <td className="px-3 py-2">{r.currentStages.length ? r.currentStages.map((s) => <span key={s.stageId} className="block"><Link href={`/production/jobs/${r.jobId}?stage=${s.stageId}`} className="hover:text-brand hover:underline">{s.stageName}</Link><span className="text-xs text-muted-foreground"> · {humanizeCode(s.status)}{s.dueAt ? ` · due ${formatDate(s.dueAt)}` : ""}</span></span>) : <span className="text-muted-foreground">—</span>}</td>
      <td className="px-3 py-2 tabular-nums">{r.progress.stagesCompleted}/{r.progress.stagesRequired} stages{r.progress.plannedQuantity != null ? <span className="block text-xs text-muted-foreground">{r.progress.completedQuantity}/{r.progress.plannedQuantity} units</span> : null}</td>
      <td className="px-3 py-2">{r.blocked || r.delayed || r.projectedLate ? (
        <span className="space-y-0.5">{r.blocked ? <span className="block text-xs font-medium text-tone-blocked-fg">Blocked</span> : null}{r.delayed ? <span className="block text-xs font-medium text-tone-danger-fg">Delayed{r.delayMinutes ? ` ${formatMinutes(r.delayMinutes)}` : ""}</span> : null}{r.delayReasons.length ? <span className="block text-xs text-muted-foreground">{r.delayReasons.map((x) => humanizeCode(x)).join(", ")}</span> : null}{r.projectedLate ? <span className="block text-xs font-medium text-tone-warning-fg">Projected late</span> : null}</span>
      ) : <span className="text-xs text-muted-foreground">On track</span>}</td>
      {eta ? <td className="px-3 py-2"><EtaText at={r.estimatedCompletionAt} quality={r.etaDataQuality} compact /></td> : null}
    </tr>
  );
}

export function QualityPage() {
  const { range, set } = useRange();
  const q = useQualityKpis(range);
  return (
    <Guard perm={PERM.quality}>
      <Header title="Quality" description="Inspection results, rework and rejected units." extra={null} />
      <div className="mb-4"><RangeControl range={range} onChange={set} timezone={q.data?.timezone} /></div>
      <div className="space-y-4">
        <QualitySection range={range} />
        <QuerySection title="Where inspections fail" query={q} testId="failures">
          {(d) => (
            <div className="grid gap-6 lg:grid-cols-2">
              <div><p className="mb-2 text-sm font-medium">By stage</p>{d.failuresByStage.length === 0 ? <PositiveEmpty>No failed inspections in this range.</PositiveEmpty> : <RankedBars label="Failures by stage" rows={d.failuresByStage.map((s) => ({ key: s.stageCode, label: s.stageName, value: s.failures, text: `${s.failures} failed${s.failedUnits ? ` · ${s.failedUnits} units` : ""}` }))} />}</div>
              <div><p className="mb-2 text-sm font-medium">By product</p>{d.failuresByProduct.length === 0 ? <PositiveEmpty>No failures by product.</PositiveEmpty> : <RankedBars label="Failures by product" rows={d.failuresByProduct.map((s) => ({ key: s.productTypeId, label: s.productName, value: s.failures, text: `${s.failures} failed` }))} />}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:col-span-2">
                <Metric label="Inspected units" value={formatNumber(d.inspections.inspectedUnits)} />
                <Metric label="Failed units" value={formatNumber(d.inspections.failedUnits)} />
                <Metric label="Repeat-failure rate" testId="repeat-rate" value={formatPercent(d.repeatFailure.ratePercent)} hint={d.repeatFailure.jobStagesWithFailure ? `${d.repeatFailure.repeated} of ${d.repeatFailure.jobStagesWithFailure} failed stages repeated` : "No failed stages in range"} />
                <Metric label="Rework-flagged units" value={formatNumber(d.reworkFlaggedUnits)} />
              </div>
              {d.rework.note ? <p className="text-xs text-muted-foreground lg:col-span-2">{d.rework.note}</p> : null}
              {d.notDerived?.length ? <p className="text-xs text-muted-foreground lg:col-span-2" data-testid="not-derived">Not reported: {d.notDerived.join("; ")}</p> : null}
            </div>
          )}
        </QuerySection>
      </div>
    </Guard>
  );
}

export function CommercialPage() {
  const { range, set } = useRange();
  const q = useCommercialKpis(range);
  return (
    <Guard perm={PERM.commercial}>
      <Header title="Commercial" description="Accepted quotations, verified payments and balances — per currency, never combined." />
      <div className="mb-4"><RangeControl range={range} onChange={set} timezone={q.data?.timezone} /></div>
      <div className="space-y-4">
        <CommercialSection range={range} />
        <QuerySection title="Verified payments in range" query={q} testId="verified-in-range" description={q.data?.definitions?.verifiedInRange}>
          {(d) => (
            <div className="space-y-3">
              {d.verifiedInRange.length === 0 ? <p className="text-sm text-muted-foreground">No payments were verified in this range.</p> : (
                <ul className="divide-y rounded-md border" aria-label="Verified payments by currency">{d.verifiedInRange.map((v) => <li key={`${v.currency}-${v.target}`} data-testid="verified-row" className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"><span>{v.currency} · {humanizeCode(v.target)}<span className="ms-2 text-xs text-muted-foreground">{v.payments} payments</span></span><span className="font-semibold tabular-nums">{formatMoney(v.total, v.currency)}</span></li>)}</ul>
              )}
              <p className="text-xs text-muted-foreground" data-testid="currencies">Currencies: {currencyKeys(d.byCurrency).join(", ") || "none"} — amounts in different currencies are listed separately and never added together.</p>
            </div>
          )}
        </QuerySection>
      </div>
    </Guard>
  );
}

export function DeliveryInsightsPage() {
  const { range, set } = useRange();
  const q = useDeliveryKpis(range);
  return (
    <Guard perm={PERM.kpis}>
      <Header title="Delivery" description="Shipments in flight, failures, and commitments past their date." />
      <div className="mb-4"><RangeControl range={range} onChange={set} timezone={q.data?.timezone} /></div>
      <div className="space-y-4">
        <DeliverySection range={range} />
        <QuerySection title="Commitments" query={q} testId="commitments" description={q.data?.definitions?.overdueDeliveryCommitments}>
          {(d) => <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Metric label="Orders past target date" value={formatNumber(d.overdueDeliveryCommitments.ordersPastTargetDate)} tone={d.overdueDeliveryCommitments.ordersPastTargetDate ? "warning" : "good"} href="/orders?delayed=true" /><Metric label="Shipments past scheduled date" value={formatNumber(d.overdueDeliveryCommitments.shipmentsPastScheduledDate)} tone={d.overdueDeliveryCommitments.shipmentsPastScheduledDate ? "warning" : "good"} href="/delivery?open=true" /><Metric label="Ready to ship" value={formatNumber(d.shipments.ready)} href="/delivery?status=READY" /></div>}
        </QuerySection>
        <OrdersSection range={range} />
      </div>
    </Guard>
  );
}

export function WorkloadPage() {
  const { can } = useAuth();
  const { params, update } = useListParams({ pageSize: 20 });
  const dept = params.filters.department;
  const staff = useWorkloadStaff({ page: params.page, pageSize: params.pageSize, department: dept }, can(PERM.workload));
  return (
    <Guard perm={[PERM.workload, PERM.capacity]}>
      <Header title="Workload & capacity" description="Who is loaded with what, and whether configured capacity covers the planned demand." />
      <div className="space-y-4">
        {can(PERM.workload) ? <WorkloadSection /> : null}
        {can(PERM.capacity) ? <CapacitySection department={dept} /> : null}
        {can(PERM.workload) ? (
          <QuerySection title="Staff workload" query={staff} testId="staff-workload" description={staff.data?.note}
            action={<Select aria-label="Department" className="h-8 w-40" value={dept ?? ALL} onValueChange={(v) => update({ filters: { department: v === ALL ? undefined : v } })} options={[{ value: ALL, label: "All departments" }, ...DEPARTMENTS.map((x) => ({ value: x, label: humanizeCode(x) }))]} />}>
            {(d) => d.data.length === 0 ? <EmptyState title="No staff" description="No staff match." className="py-8" /> : (
              <div className="space-y-2">
                <div className="relative overflow-x-auto rounded-md border"><table className="w-full min-w-max text-sm"><caption className="sr-only">Workload per staff member</caption>
                  <thead className="bg-surface-muted text-xs text-muted-foreground"><tr><th scope="col" className="h-9 px-3 text-start font-medium">Staff</th>{["Active", "Ready", "In progress", "Blocked", "Overdue", "Completed", "On-time", "Avg completion", "Capacity / day"].map((h) => <th key={h} scope="col" className="px-3 text-end font-medium">{h}</th>)}</tr></thead>
                  <tbody>{d.data.map((s) => (
                    <tr key={s.userId} className="border-t" data-testid="staff-row">
                      <th scope="row" className="px-3 py-1.5 text-start font-medium">{s.name}<span className="block text-xs font-normal text-muted-foreground">{s.roles.map((r) => humanizeCode(r)).join(", ")}</span></th>
                      <td className="px-3 text-end tabular-nums">{s.activeAssignments}</td><td className="px-3 text-end tabular-nums">{s.readyAssignments}</td><td className="px-3 text-end tabular-nums">{s.inProgressAssignments}</td>
                      <td className={`px-3 text-end tabular-nums ${s.blockedAssignments ? "font-semibold text-danger" : ""}`}>{s.blockedAssignments}</td>
                      <td className={`px-3 text-end tabular-nums ${s.overdueAssignments ? "font-semibold text-danger" : ""}`}>{s.overdueAssignments}</td>
                      <td className="px-3 text-end tabular-nums">{s.stagesCompleted}</td>
                      <td className="px-3 text-end tabular-nums">{formatPercent(s.onTimeCompletionRate, 0)}</td>
                      <td className="px-3 text-end tabular-nums">{formatMinutes(s.averageCompletionMinutes)}</td>
                      <td className="px-3 text-end tabular-nums">{s.capacityMinutesPerDay === null ? <span className="text-muted-foreground" title="No staff capacity configured">—</span> : `${s.capacityMinutesPerDay}m`}</td>
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
  const { can } = useAuth();
  const { params, update } = useListParams({ pageSize: 20 });
  const f = params.filters;
  const q = useAlerts({ page: params.page, pageSize: params.pageSize, status: f.status ?? "OPEN", type: f.type, severity: f.severity }, can(PERM.alerts));
  const health = useScheduler(can(PERM.alerts));
  const setF = (k: string, v: string | undefined) => update({ filters: { [k]: v === ALL ? undefined : v } });
  return (
    <Guard perm={PERM.alerts}>
      <Header title="Operational alerts" description="Problems detected by the scheduler, with their escalation state." />
      <div className="space-y-4">
        <QuerySection title="Scheduler" query={health} testId="scheduler">
          {(h) => (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className={h.enabled ? "font-medium text-tone-success-fg" : "font-medium text-danger"} data-testid="scheduler-state">{h.enabled ? "Automation is running" : "Automation is disabled"}</span>
              <span className="text-muted-foreground">Outbox every {h.intervals.outbox}s · dispatch every {h.intervals.dispatch}s · alert evaluation every {h.intervals.alerts}s</span>
              <span className="text-muted-foreground">{h.runningNow.length ? `Running now: ${h.runningNow.join(", ")}` : "Idle"}</span>
            </div>
          )}
        </QuerySection>
        <QuerySection title="Alerts" query={q} testId="alerts"
          action={<>
            <Select aria-label="State" className="h-8 w-32" value={f.status ?? "OPEN"} onValueChange={(v) => setF("status", v === "OPEN" ? undefined : v)} options={[{ value: "OPEN", label: "Open" }, { value: "RESOLVED", label: "Resolved" }]} />
            <Select aria-label="Severity" className="h-8 w-36" value={f.severity ?? ALL} onValueChange={(v) => setF("severity", v)} options={[{ value: ALL, label: "Any severity" }, ...["CRITICAL", "WARNING", "INFO"].map((v) => ({ value: v, label: humanizeCode(v) }))]} />
            <Select aria-label="Type" className="h-8 w-48" value={f.type ?? ALL} onValueChange={(v) => setF("type", v)} options={[{ value: ALL, label: "Any type" }, ...ALERT_TYPES.map((v) => ({ value: v, label: humanizeCode(v) }))]} />
          </>}>
          {(d) => d.data.length === 0 ? <PositiveEmpty>{(f.status ?? "OPEN") === "OPEN" ? "No open alerts." : "No resolved alerts match."}</PositiveEmpty> : (
            <div><ul className="-mx-4 divide-y">{d.data.map((a) => <AlertRowItem key={a.id} a={a} />)}</ul><Pagination meta={d.meta} onPageChange={(page) => update({ page })} onPageSizeChange={(pageSize) => update({ pageSize })} /></div>
          )}
        </QuerySection>
      </div>
    </Guard>
  );
}
