"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage, isApiError } from "@/lib/api/errors";

import * as api from "./api";
import { useOrderInvalidation } from "./hooks";
import { JOB_SOURCE_LABELS } from "./labels";
import type { OrderBatch, OrderDetail, OrderVariant } from "./types";
import { useI18n } from "@/i18n/provider";

const toIsoDate = (d: string) => (d ? new Date(d).toISOString() : undefined);
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** Link target for a factory job (Production area). */
export const jobHref = (id: string) => `/production/jobs/${id}`;

export function BatchesPanel({ order }: { order: OrderDetail }) {
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const manage = can("order_batches.manage");
  const [editing, setEditing] = useState<OrderBatch | "new" | null>(null);
  const [reasoning, setReasoning] = useState<{ batch: OrderBatch; action: "hold" | "cancel" } | null>(null);
  const [jobFor, setJobFor] = useState<OrderBatch | null>(null);
  const inv = useOrderInvalidation();
  const act = useMutation({ mutationFn: ({ b, action }: { b: OrderBatch; action: "ready" | "resume" }) => api.batchAction(b.id, action), onSuccess: () => inv.order(order.id) });
  const run = (b: OrderBatch, action: "ready" | "resume", done: string) => act.mutate({ b, action }, { onSuccess: () => toast.success(t.text(done)), onError: (e) => toast.error(errorMessage(e)) });
  const orderOpen = !["DRAFT", "PENDING_CONFIRMATION", "CANCELLED", "ON_HOLD", "COMPLETED", "DELIVERED"].includes(order.status);
  const variants = order.items.flatMap((i) => i.variants);
  const hasWholeJob = order.factoryJobs.some((j) => j.sourceType === "BULK_ORDER" && j.status !== "CANCELLED");

  return (
    <Card aria-labelledby="batches-title">
      <CardHeader>
        <CardTitle><span id="batches-title">{t("orders.productionBatches")}</span></CardTitle>
        {manage ? <Button size="sm" variant="secondary" disabled={!orderOpen || hasWholeJob} title={hasWholeJob ? t("orders.theOrderAlreadyHasAWhole") : !orderOpen ? t("orders.batchesCanBePlannedForA") : undefined} onClick={() => setEditing("new")}><Plus />{" "}{t("orders.newBatch")}</Button> : null}
      </CardHeader>
      {order.batches.length === 0 ? <EmptyState title={t("orders.noBatches")} description={order.status === "DRAFT" || order.status === "PENDING_CONFIRMATION" ? t("orders.batchesCanBePlannedOnceThe") : t("orders.splitTheOrderIntoBatchesOr")} className="py-8" /> : (
        <ul className="divide-y" data-testid="batches">
          {order.batches.map((b) => (
            <li key={b.id} data-status={b.status} className="space-y-2 px-4 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs font-semibold">{b.batchNumber}</span><StatusBadge status={b.status} />
                <span className="font-semibold tabular-nums">{t("orders.quantityUnits", { quantity: fmt.number(b.quantity) })}</span>
                <span className="text-xs text-muted-foreground">{b.targetStartDate ? t("orders.startTargetstartdate", { targetStartDate: fmt.date(b.targetStartDate) }) : t("orders.noStartDate")}{b.targetCompletionDate ? t("orders.dueTargetcompletiondate", { targetCompletionDate: fmt.date(b.targetCompletionDate) }) : ""}</span>
              </p>
              <ul className="flex flex-wrap gap-1.5" aria-label={t("orders.allocationsOfBatchnumber", { batchNumber: b.batchNumber })}>{b.allocations.map((a) => <li key={a.orderVariantId} className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs">{a.label} × {a.quantity}</li>)}</ul>
              {b.holdReason ? <p className="text-xs text-tone-warning-fg">{t("orders.onHoldHoldreason", { holdReason: b.holdReason })}</p> : null}
              {b.cancelReason ? <p className="text-xs text-muted-foreground">{t("orders.cancelledCancelreason", { cancelReason: b.cancelReason })}</p> : null}
              {b.job ? <p className="text-xs">{t("orders.job")}{" "}<Link href={jobHref(b.job.id)} className="font-mono font-semibold text-brand hover:underline">{b.job.jobNumber}</Link> · {b.job.status.toLowerCase().replace("_", " ")} · {b.job.completedQuantity}/{b.job.plannedQuantity ?? "?"}{" "}{t("orders.done")}</p> : null}
              <div className="flex flex-wrap gap-2">
                {manage && b.status === "PLANNED" ? <><Button size="sm" variant="secondary" onClick={() => setEditing(b)}>{t("orders.editAllocations")}</Button><Button size="sm" onClick={() => run(b, "ready", `${b.batchNumber} is ready`)}>{t("orders.markReady")}</Button></> : null}
                {can("factory_jobs.manage") && b.status === "READY" && !b.job ? <Button size="sm" onClick={() => setJobFor(b)}>{t("orders.createFactoryJob")}</Button> : null}
                {manage && b.status === "ON_HOLD" ? <Button size="sm" variant="secondary" onClick={() => run(b, "resume", `${b.batchNumber} resumed`)}>{t("orders.resume")}</Button> : null}
                {manage && !["ON_HOLD", "CANCELLED", "COMPLETED"].includes(b.status) ? <Button size="sm" variant="ghost" onClick={() => setReasoning({ batch: b, action: "hold" })}>{t("orders.hold")}</Button> : null}
                {manage && !["CANCELLED", "COMPLETED"].includes(b.status) ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => setReasoning({ batch: b, action: "cancel" })}>{t("common.cancel")}</Button> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? <BatchDialog order={order} variants={variants} batch={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {reasoning ? <BatchReasonDialog orderId={order.id} {...reasoning} onClose={() => setReasoning(null)} /> : null}
      {jobFor ? <FactoryJobDialog orderId={order.id} title={t("orders.createFactoryJobForBatchnumber", { batchNumber: jobFor.batchNumber })} create={(body) => api.createBatchJob(jobFor.id, body)} onClose={() => setJobFor(null)} /> : null}
    </Card>
  );
}

/** Allocation editor: ordered / already in other batches / this batch / remaining (server totals stay authoritative). */
function BatchDialog({ order, variants, batch, onClose }: { order: OrderDetail; variants: OrderVariant[]; batch: OrderBatch | null; onClose: () => void }) {
  const { t } = useI18n();
  const inv = useOrderInvalidation();
  const own = (v: OrderVariant) => batch?.allocations.find((a) => a.orderVariantId === v.id)?.quantity ?? 0;
  const [qty, setQty] = useState<Record<string, string>>(Object.fromEntries(variants.map((v) => [v.id, own(v) ? String(own(v)) : ""])));
  const [start, setStart] = useState(dateInput(batch?.targetStartDate ?? null));
  const [end, setEnd] = useState(dateInput(batch?.targetCompletionDate ?? null));
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const num = (id: string) => (/^\d+$/.test((qty[id] ?? "").trim()) ? Number(qty[id]) : 0);
  const total = variants.reduce((n, v) => n + num(v.id), 0);
  const bad = variants.some((v) => (qty[v.id] ?? "").trim() !== "" && !/^\d+$/.test(qty[v.id]!.trim()));
  const save = useMutation({
    mutationFn: () => {
      const allocations = variants.filter((v) => num(v.id) > 0).map((v) => ({ orderVariantId: v.id, quantity: num(v.id) }));
      const dates = { targetStartDate: toIsoDate(start), targetCompletionDate: toIsoDate(end) };
      return batch ? api.replaceAllocations(batch.id, { allocations, ...dates }) : api.createBatch(order.id, { allocations, ...dates });
    },
    onSuccess: () => inv.order(order.id),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent title={batch ? t("orders.editAllocationsBatchnumber", { batchNumber: batch.batchNumber }) : t("orders.newBatch")} description={t("orders.chooseHowManyUnitsOfEach")} className="max-w-2xl">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); if (bad || total === 0) { setError({ message: total === 0 ? t("orders.allocateAtLeastOneUnit") : t("orders.quantitiesMustBeWholeNumbers") }); return; } try { await save.mutateAsync(); toast.success(batch ? t("orders.allocationsSaved") : t("orders.batchCreated")); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm"><caption className="sr-only">{t("orders.variantAllocation")}</caption>
              <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1 text-start font-medium">{t("orders.variant")}</th><th scope="col" className="text-end font-medium">{t("orders.ordered")}</th><th scope="col" className="text-end font-medium">{t("orders.inOtherBatches")}</th><th scope="col" className="w-24 text-end font-medium">{t("orders.thisBatch")}</th><th scope="col" className="text-end font-medium">{t("orders.remaining")}</th></tr></thead>
              <tbody>{variants.map((v) => {
                const others = v.allocatedQuantity - own(v);
                const remaining = v.quantity - others - num(v.id);
                return (
                  <tr key={v.id} data-testid="alloc-row" className="border-t">
                    <th scope="row" className="py-1.5 text-start font-medium">{v.label}</th>
                    <td className="text-end tabular-nums">{v.quantity}</td><td className="text-end tabular-nums">{others}</td>
                    <td className="py-1"><Input aria-label={t("orders.labelUnitsInThisBatch", { label: v.label })} inputMode="numeric" className="h-8 text-end" value={qty[v.id] ?? ""} onChange={(e) => setQty({ ...qty, [v.id]: e.target.value })} /></td>
                    <td className={`text-end tabular-nums ${remaining < 0 ? "font-semibold text-danger" : ""}`}>{remaining}</td>
                  </tr>
                );
              })}</tbody>
              <tfoot><tr className="border-t font-semibold"><th scope="row" className="py-1.5 text-start">{t("orders.batchTotal")}</th><td /><td /><td className="text-end tabular-nums">{total}</td><td /></tr></tfoot>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="b-start" label={t("orders.targetStart")}><DatePicker id="b-start" value={start} onChange={(e) => setStart(e.target.value)} /></FormField>
            <FormField id="b-end" label={t("orders.targetCompletion")}><DatePicker id="b-end" value={end} onChange={(e) => setEnd(e.target.value)} /></FormField>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" loading={save.isPending}>{batch ? t("orders.saveAllocations") : t("orders.createBatch")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BatchReasonDialog({ orderId, batch, action, onClose }: { orderId: string; batch: OrderBatch; action: "hold" | "cancel"; onClose: () => void }) {
  const { t } = useI18n();
  const inv = useOrderInvalidation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({ mutationFn: () => api.batchAction(batch.id, action, { reason: reason.trim() }), onSuccess: () => inv.order(orderId) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`${action === "hold" ? "Hold" : "Cancel"} ${batch.batchNumber}`} description={action === "cancel" ? t("orders.cancellingFreesItsUnitsForAnother") : t("orders.aReasonIsRequired")}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(action === "hold" ? t("orders.batchOnHold") : t("orders.batchCancelled")); onClose(); } catch (err) { setError(errorMessage(err)); } }}>
          {error ? <FormError message={error} /> : null}
          <FormField id="br" label={t("common.reason")} required><Textarea id="br" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.back")}</Button><Button type="submit" variant={action === "cancel" ? "danger" : "primary"} loading={run.isPending} disabled={reason.trim().length < 3}>{action === "hold" ? t("orders.putOnHold") : t("orders.cancelBatch")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Shared by whole-order and batch job creation. The job itself is operated in the Production area. */
export function FactoryJobDialog({ orderId, title, create, onClose, onCreated }: { orderId?: string; title: string; create: (body: api.FactoryJobBody) => Promise<{ id: string; jobNumber: string }>; onClose: () => void; onCreated?: () => void }) {
  const { t } = useI18n();
  const inv = useOrderInvalidation();
  const [planned, setPlanned] = useState(false);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => create({ ...(planned ? { release: false } : {}), ...(target ? { targetCompletionDate: toIsoDate(target) } : {}) }), onSuccess: () => { if (orderId) inv.job(orderId); onCreated?.(); } });
  const router = useRouter();
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={title} description={t("orders.createsTheProductionJobFromThe")}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { const j = await run.mutateAsync(); toast.success(t("orders.jobnumberCreated", { jobNumber: j.jobNumber }), { action: { label: t("orders.openJob"), onClick: () => router.push(jobHref(j.id)) } }); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="fj-target" label={t("orders.targetCompletionOptional")}><DatePicker id="fj-target" value={target} onChange={(e) => setTarget(e.target.value)} /></FormField>
          <div className="flex items-start gap-2"><Checkbox id="fj-planned" checked={planned} onCheckedChange={(c) => setPlanned(c === true)} className="mt-0.5" /><Label htmlFor="fj-planned" className="font-normal">{t("orders.createAsPlannedAssignStagesBefore")}</Label></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" loading={run.isPending}>{t("orders.createFactoryJob")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { JOB_SOURCE_LABELS };
