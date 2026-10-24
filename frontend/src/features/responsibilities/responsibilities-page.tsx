"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AccessDeniedState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage, isApiError } from "@/lib/api/errors";
import * as api from "./api";
import { ApplyActiveDialog, WorkerPickerDialog } from "./dialogs";
import { useAttention, useOverview, useResponsibilityInvalidation } from "./hooks";
import { GROUP_TITLE, REASON_TEXT, groupAreas } from "./labels";
import { WorkerDrilldown } from "./worker-drilldown";
import type { ResponsibilityOverviewItem } from "./types";
import { useI18n } from "@/i18n/provider";

function AreaCard({ a, canManage, onChange, onApply, onClear, onWorker }: { a: ResponsibilityOverviewItem; canManage: boolean; onChange: () => void; onApply: () => void; onClear: () => void; onWorker: (id: string, name: string) => void }) {
  const { t } = useI18n();
  const configured = !!a.globalDefault;
  const attention = a.health === "NEEDS_ATTENTION";
  const reason = a.globalDefault?.reason ?? a.reason;
  const unit = a.stageKey === "DELIVERY" ? "live shipments" : "active stages";
  return (
    <Card variant={attention ? "attention" : "default"} className="space-y-3 p-4" data-testid="area-card" data-stage={a.stageKey} data-health={a.health}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">{a.stageKey}</p>
          <h3 className="text-lg font-semibold uppercase tracking-[-0.01em]">{a.label}</h3>
        </div>
        {attention ? <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-tone-warning-bg px-2 text-xs font-semibold text-tone-warning-fg"><AlertTriangle aria-hidden className="size-3.5" />{t("common.needsAttention")}</span> : !configured ? <span className="inline-flex h-6 items-center rounded-sm bg-surface-sunken px-2 text-xs font-medium text-muted-foreground">{t("responsibilities.notConfigured")}</span> : null}
      </div>
      {attention && a.globalDefault ? (
        <p role="alert" data-testid="area-attention" className="text-sm text-tone-warning-fg"><span className="font-semibold">{a.globalDefault.primaryUser.name}</span> {reason ? REASON_TEXT[reason] ?? t("responsibilities.canNoLongerTakeThisWork") : t("responsibilities.canNoLongerTakeThisWork")}{t("responsibilities.newWorkLeftUnassigned", { label: a.label })}</p>
      ) : configured && a.effectiveUser ? (
        <div>
          <button type="button" onClick={() => onWorker(a.effectiveUser!.id, a.effectiveUser!.name)} className="text-start text-xl font-semibold hover:text-brand hover:underline" data-testid="area-owner">{a.effectiveUser.name}</button>
          <p className="text-sm text-muted-foreground">{a.eligibleRoleCodes.length ? `${a.eligibleRoleCodes.join(", ").replace(/_/g, " ").toLowerCase()} · ` : ""}<span data-testid="area-load">{a.activeWork} {unit}</span>{" "}{t("responsibilities.factoryDefault2")}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="area-empty">{t("responsibilities.noDefaultResponsibleWorkerIsConfigured", { label: a.label })}</p>
      )}
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={configured && !attention ? "secondary" : "primary"} onClick={onChange}>{attention ? t("responsibilities.assignAnotherWorker") : configured ? t("responsibilities.changeResponsible") : t("responsibilities.setResponsible")}</Button>
          {configured ? <Button size="sm" variant="secondary" onClick={onApply}>{t("responsibilities.applyToActiveWork")}</Button> : null}
          {configured ? <Button size="sm" variant="ghost" onClick={onClear}>{t("responsibilities.clearDefault")}</Button> : null}
        </div>
      ) : null}
    </Card>
  );
}

export function ResponsibilitiesPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const canManage = can("responsibilities.manage");
  const overview = useOverview();
  const attention = useAttention();
  const invalidate = useResponsibilityInvalidation();
  const [picking, setPicking] = useState<ResponsibilityOverviewItem | null>(null);
  const [applying, setApplying] = useState<{ area: ResponsibilityOverviewItem; intro?: string } | null>(null);
  const [clearing, setClearing] = useState<ResponsibilityOverviewItem | null>(null);
  const [worker, setWorker] = useState<{ id: string; name: string } | null>(null);

  if (overview.isLoading) return <PageSkeleton />;
  if (overview.error) return isApiError(overview.error) && overview.error.kind === "forbidden" ? <AccessDeniedState /> : <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;
  const areas = overview.data ?? [];
  const feed = attention.data;
  const rules = feed?.rulesNeedingAttention?.count ?? 0;
  const unassigned = feed?.unassignedActiveStages?.count ?? 0;

  return (
    <>
      <PageHeader title={t("responsibilities.factoryResponsibilities")} description={t("responsibilities.chooseWhoNormallyOwnsEachStage")} />
      {rules > 0 || unassigned > 0 ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2" data-testid="attention-summary">
          {rules > 0 ? <Card variant="attention" className="p-4"><p className="text-3xl font-semibold tabular-nums">{rules}</p><p className="text-sm font-medium">{t("responsibilities.responsibilitiesNeedAttention")}</p><p className="text-xs text-muted-foreground">{t("responsibilities.aRulePointsAtSomeoneWho")}</p></Card> : null}
          {unassigned > 0 ? (
            <Card variant="attention" className="p-4" id="unassigned"><p className="text-3xl font-semibold tabular-nums">{unassigned}</p><p className="text-sm font-medium">{t("responsibilities.unassignedActiveStages")}</p>
              {feed?.unassignedActiveStages?.byStageKey?.length ? <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">{feed.unassignedActiveStages.byStageKey.map((b) => <span key={b.stageKey} className="rounded-sm bg-surface-sunken px-1.5 py-0.5">{b.label ?? areas.find((a) => a.stageKey === b.stageKey)?.label ?? b.stageKey}{b.count != null ? ` · ${b.count}` : ""}</span>)}</p> : null}
            </Card>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-8">
        {groupAreas(areas).map(({ group, items }) => (
          <section key={group} aria-label={GROUP_TITLE[group]} data-testid={`group-${group}`}>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-brand">{GROUP_TITLE[group]}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((a) => <AreaCard key={a.stageKey} a={a} canManage={canManage} onChange={() => setPicking(a)} onApply={() => setApplying({ area: a })} onClear={() => setClearing(a)} onWorker={(id, name) => setWorker({ id, name })} />)}
            </div>
          </section>
        ))}
        {areas.length === 0 ? <p className="text-sm text-muted-foreground">{t("responsibilities.noOperationalAreasWereReturned")}</p> : null}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">{t("responsibilities.changingADefaultOnlyAffectsFuture")}{" "}<Link href="/customers" className="inline-flex items-center gap-1 text-brand hover:underline">{t("responsibilities.customerSpecificOverridesLiveOnEach")}{" "}<ArrowRight aria-hidden className="rtl:-scale-x-100 size-3" /></Link></p>

      {picking ? (
        <WorkerPickerDialog
          title={t("responsibilities.labelWhoIsResponsible", { label: picking.label })} stageLabel={picking.label} eligibleRoleCodes={picking.eligibleRoleCodes} currentUserId={picking.globalDefault?.primaryUser.id}
          scopeText={(name) => `${picking.globalDefault ? t("responsibilities.scopeFromTo", { from: picking.globalDefault.primaryUser.name, to: name }) : ""}${t("responsibilities.futureWorkAssignedTo", { label: picking.label, name })}`}
          onSave={(userId) => api.setGlobal(picking.stageKey, { userId })}
          onClose={(saved) => { const a = picking; setPicking(null); if (saved) { invalidate(); toast.success(t("responsibilities.labelResponsibilitySaved", { label: a.label })); setApplying({ area: a, intro: t("responsibilities.defaultFollowsIntro", { label: a.label }) }); } }}
        />
      ) : null}
      {applying ? <ApplyActiveDialog stageKey={applying.area.stageKey} stageLabel={applying.area.label} intro={applying.intro} onClose={() => setApplying(null)} /> : null}
      {clearing ? (
        <Dialog open onOpenChange={(o) => !o && setClearing(null)}>
          <DialogContent title={t("responsibilities.clearTheLabelDefault", { label: clearing.label })} description={t("responsibilities.futureWorkForThisAreaWill")}>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setClearing(null)}>{t("common.cancel")}</Button>
              <Button variant="danger" onClick={async () => { try { await api.clearGlobal(clearing.stageKey); invalidate(); toast.success(t("responsibilities.defaultCleared")); setClearing(null); } catch (e) { toast.error(errorMessage(e)); } }}>{t("responsibilities.clearDefault")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      {worker ? <WorkerDrilldown worker={worker} areas={areas} onClose={() => setWorker(null)} /> : null}
    </>
  );
}
