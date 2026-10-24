"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import * as api from "./api";
import { ApplyActiveDialog, WorkerPickerDialog } from "./dialogs";
import { useMatrix, useOperations, useOverview, useResponsibilityInvalidation } from "./hooks";
import { groupAreas, GROUP_TITLE, REASON_TEXT, sourceLabel } from "./labels";
import { WorkCard, workState } from "./process";
import type { CustomerResponsibilityItem } from "./types";
import { useI18n } from "@/i18n/provider";

/* ------------------------------------------------ operations ------------------------------------------------ */
function Tile({ label, value, tone }: { label: string; value: number; tone?: "warning" | "danger" }) {
  return <div className="rounded-md border bg-surface p-3"><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt><dd className={cn("mt-1 text-3xl font-semibold tabular-nums", tone && value > 0 && (tone === "danger" ? "text-tone-danger-fg" : "text-tone-warning-fg"))}>{value}</dd></div>;
}

/** Every live work item of the customer, in the backend's priority order (blocked, overdue, in progress, ready, planned). */
export function CustomerOperations({ customerId }: { customerId: string }) {
  const { t } = useI18n();
  const q = useOperations(customerId);
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const work = q.data?.currentWork ?? [];
  if (work.length === 0) return <EmptyState title={t("responsibilities.noActiveFactoryWork")} description={t("responsibilities.noActiveFactoryWorkForThis")} className="py-10" />;
  const states = work.map(workState);
  return (
    <div className="space-y-4" data-testid="customer-operations">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={t("responsibilities.activeWork")} value={work.length} />
        <Tile label={t("responsibilities.inProgress")} value={work.filter((w) => w.currentStage?.status === "IN_PROGRESS").length} />
        <Tile label={t("common.blocked")} value={states.filter((s) => s === "blocked").length} tone="danger" />
        <Tile label={t("common.unassigned")} value={states.filter((s) => s === "unassigned").length} tone="warning" />
      </dl>
      <div className="grid gap-3 lg:grid-cols-2">{work.map((w) => <WorkCard key={`${w.jobId}`} w={w} />)}</div>
    </div>
  );
}

/* ------------------------------------------- responsibility matrix ------------------------------------------- */
/** Sales ownership is the backend's (latest live order/sample); the shape is not spelled out, so only a name is read. */
function salesOwnerName(v: unknown): { name: string; ref?: string } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const u = (o.user ?? o.owner ?? o) as Record<string, unknown>;
  const name = typeof u.name === "string" ? u.name : null;
  const ref = typeof o.referenceNumber === "string" ? o.referenceNumber : undefined;
  return name ? { name, ref } : null;
}

function MatrixRow({ r, customer, canManage, onOverride, onReset, onApply }: { r: CustomerResponsibilityItem; customer: { id: string; name: string }; canManage: boolean; onOverride: () => void; onReset: () => void; onApply: () => void }) {
  const { t } = useI18n();
  const overridden = r.source === "CUSTOMER_OVERRIDE";
  const attention = r.health === "NEEDS_ATTENTION";
  return (
    <li data-testid="matrix-row" data-stage={r.stageKey} data-source={r.source} className={cn("space-y-1.5 rounded-md border bg-surface p-3", attention && "border-tone-warning-dot/60")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">{r.label}</p>
        <p className="text-[0.6875rem] text-muted-foreground" data-testid="matrix-source">{sourceLabel(r.source)}</p>
      </div>
      <p className="text-lg font-semibold">{r.effectiveUser?.name ?? <span className="text-muted-foreground">{t("common.unassigned")}</span>}</p>
      {attention ? <p role="alert" className="text-xs text-tone-warning-fg">{t("common.needsAttention")}{r.reason ? t("responsibilities.theConfiguredOwnerV1", { v1: REASON_TEXT[r.reason] ?? "cannot take this work" }) : ""}.</p> : null}
      {overridden ? <p className="text-xs text-muted-foreground">{t("responsibilities.factoryDefault")}{" "}{r.globalDefaultUser?.name ?? t("responsibilities.none")}</p> : null}
      {r.activeWork > 0 && r.effectiveUser ? <p className="text-xs text-muted-foreground">{t("responsibilities.nameHoldsActiveworkOpen", { name: r.effectiveUser.name, activeWork: r.activeWork })}{" "}{r.stageKey === "DELIVERY" ? t("responsibilities.shipments") : t("responsibilities.stages")}</p> : null}
      {canManage ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="secondary" onClick={onOverride}>{overridden ? t("responsibilities.changeOverride") : t("responsibilities.overrideForThisCustomer")}</Button>
          {overridden ? <Button size="sm" variant="ghost" onClick={onReset}>{t("responsibilities.useFactoryDefault")}</Button> : null}
          {r.effectiveUser ? <Button size="sm" variant="ghost" onClick={onApply}>{t("responsibilities.applyToNameSActiveWork", { name: customer.name })}</Button> : null}
        </div>
      ) : null}
    </li>
  );
}

export function CustomerResponsibilities({ customerId, customerName }: { customerId: string; customerName: string }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const canManage = can("responsibilities.manage");
  const q = useMatrix(customerId);
  const invalidate = useResponsibilityInvalidation();
  const [override, setOverride] = useState<CustomerResponsibilityItem | null>(null);
  const [reset, setReset] = useState<CustomerResponsibilityItem | null>(null);
  const [apply, setApply] = useState<{ r: CustomerResponsibilityItem; intro?: string } | null>(null);
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data?.items ?? [];
  const sales = salesOwnerName(q.data?.commercial?.salesOwner);
  const customer = { id: customerId, name: customerName };
  return (
    <div className="space-y-6" data-testid="customer-responsibilities">
      <section aria-label={t("responsibilities.commercial")}>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-brand">{t("responsibilities.commercial")}</h3>
        <div className="rounded-md border bg-surface p-3" data-testid="sales-owner"><p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("responsibilities.salesOwner")}</p><p className="text-lg font-semibold">{sales?.name ?? <span className="text-muted-foreground">{t("responsibilities.noneOnALiveOrderOr")}</span>}</p>{sales?.ref ? <p className="text-xs text-muted-foreground">{t("responsibilities.fromRef", { ref: sales.ref })}</p> : null}</div>
      </section>
      {items.length === 0 ? <EmptyState title={t("responsibilities.noAreasReturned")} description={t("responsibilities.theBackendReturnedNoResponsibilityAreas")} className="py-8" /> : groupAreas(items).map(({ group, items: rows }) => (
        <section key={group} aria-label={GROUP_TITLE[group]}>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-brand">{group === "FULFILLMENT" ? t("responsibilities.fulfillment") : t("responsibilities.factoryV1", { v1: GROUP_TITLE[group] })}</h3>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((r) => <MatrixRow key={r.stageKey} r={r} customer={customer} canManage={canManage} onOverride={() => setOverride(r)} onReset={() => setReset(r)} onApply={() => setApply({ r })} />)}</ul>
        </section>
      ))}
      {override ? (
        <WorkerPickerDialog
          title={t("responsibilities.labelForCustomername", { label: override.label, customerName })} stageLabel={override.label} eligibleRoleCodes={override.eligibleRoleCodes} currentUserId={override.customerOverrideUser?.id}
          scopeText={(name) => t("responsibilities.overrideScope", { label: override.label, customer: customerName, name })}
          saveLabel={t("responsibilities.saveOverride")} onSave={(userId) => api.setOverride(customerId, override.stageKey, { userId })}
          onClose={(saved) => { const r = override; setOverride(null); if (saved) { invalidate(); toast.success(t("responsibilities.overrideSaved")); setApply({ r, intro: t("responsibilities.overrideFollows", { label: r.label, customer: customerName }) }); } }}
        />
      ) : null}
      {reset ? (
        <Dialog open onOpenChange={(o) => !o && setReset(null)}>
          <DialogContent title={t("responsibilities.useTheFactoryDefaultForLabel", { label: reset.label })} description={t("responsibilities.customernameGoesBackToTheGlobal", { customerName, label: reset.label, v3: reset.globalDefaultUser ? ` (${reset.globalDefaultUser.name})` : "" })}>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReset(null)}>{t("common.cancel")}</Button>
              <Button onClick={async () => { try { await api.clearOverride(customerId, reset.stageKey); invalidate(); toast.success(t("responsibilities.usingTheFactoryDefault")); setReset(null); } catch (e) { toast.error(errorMessage(e)); } }}>{t("responsibilities.useFactoryDefault")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      {apply ? <ApplyActiveDialog stageKey={apply.r.stageKey} stageLabel={apply.r.label} customer={customer} intro={apply.intro} onClose={() => setApply(null)} /> : null}
    </div>
  );
}

/* ----------------------------------------------- bulk overrides ----------------------------------------------- */
/** Set or clear one area's override for many customers (all-or-nothing on the backend). */
export function BulkResponsibilityDialog({ customers, onClose, onDone }: { customers: Array<{ id: string; name: string }>; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const overview = useOverview();
  const invalidate = useResponsibilityInvalidation();
  const areas = overview.data ?? [];
  const [stageKey, setStageKey] = useState("");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const area = areas.find((a) => a.stageKey === stageKey);
  const done = (msg: string) => { invalidate(); toast.success(t.text(msg)); onDone(); };
  return (
    <>
      <Dialog open={!picking} onOpenChange={(o) => !o && !busy && onClose()}>
        <DialogContent title={t("responsibilities.setResponsibility")} description={t.plural("responsibilities", "customersSelected", customers.length)}>
          <div className="space-y-3" data-testid="bulk-dialog">
            <ul className="max-h-24 overflow-y-auto text-xs text-muted-foreground">{customers.map((c) => <li key={c.id}>{c.name}</li>)}</ul>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t("common.area")}</p>
              <ul role="radiogroup" aria-label={t("common.area")} className="flex flex-wrap gap-2">{areas.map((a) => <li key={a.stageKey}><button type="button" role="radio" aria-checked={stageKey === a.stageKey} onClick={() => setStageKey(a.stageKey)} className={cn("h-9 rounded-md border px-3 text-sm", stageKey === a.stageKey ? "border-brand bg-brand-soft/50" : "hover:border-border-strong")}>{a.label}</button></li>)}</ul>
            </div>
            <p className="text-xs text-muted-foreground">{t("responsibilities.changesFutureWorkForTheseCustomers")}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
              <Button variant="secondary" disabled={!area} loading={busy} onClick={async () => { setBusy(true); try { await api.bulkOverrides({ customerIds: customers.map((c) => c.id), stageKey, clear: true }); done("Using the factory default"); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } }}>{t("responsibilities.useFactoryDefault")}</Button>
              <Button disabled={!area} onClick={() => setPicking(true)}>{t("responsibilities.chooseResponsible")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {picking && area ? (
        <WorkerPickerDialog
          title={t.plural("responsibilities", "areaForCustomers", customers.length, { label: area.label })} stageLabel={area.label} eligibleRoleCodes={area.eligibleRoleCodes}
          scopeText={(name) => t.plural("responsibilities", "futureWorkForCustomers", customers.length, { area: area.label, name })}
          saveLabel={t("responsibilities.applyOverride")} onSave={(userId) => api.bulkOverrides({ customerIds: customers.map((c) => c.id), stageKey: area.stageKey, userId })}
          onClose={(saved) => { setPicking(false); if (saved) done("Overrides applied"); }}
        />
      ) : null}
    </>
  );
}
