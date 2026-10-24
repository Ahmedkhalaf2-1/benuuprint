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
import { formatDate, formatNumber } from "@/lib/utils/format";
import * as api from "./api";
import { useOrderInvalidation } from "./hooks";
import { JOB_SOURCE_LABELS } from "./labels";
import type { OrderBatch, OrderDetail, OrderVariant } from "./types";

const toIsoDate = (d: string) => (d ? new Date(d).toISOString() : undefined);
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** Link target for a factory job (Production area). */
export const jobHref = (id: string) => `/production/jobs/${id}`;

export function BatchesPanel({ order }: { order: OrderDetail }) {
  const { can } = useAuth();
  const manage = can("order_batches.manage");
  const [editing, setEditing] = useState<OrderBatch | "new" | null>(null);
  const [reasoning, setReasoning] = useState<{ batch: OrderBatch; action: "hold" | "cancel" } | null>(null);
  const [jobFor, setJobFor] = useState<OrderBatch | null>(null);
  const inv = useOrderInvalidation();
  const act = useMutation({ mutationFn: ({ b, action }: { b: OrderBatch; action: "ready" | "resume" }) => api.batchAction(b.id, action), onSuccess: () => inv.order(order.id) });
  const run = (b: OrderBatch, action: "ready" | "resume", done: string) => act.mutate({ b, action }, { onSuccess: () => toast.success(done), onError: (e) => toast.error(errorMessage(e)) });
  const orderOpen = !["DRAFT", "PENDING_CONFIRMATION", "CANCELLED", "ON_HOLD", "COMPLETED", "DELIVERED"].includes(order.status);
  const variants = order.items.flatMap((i) => i.variants);
  const hasWholeJob = order.factoryJobs.some((j) => j.sourceType === "BULK_ORDER" && j.status !== "CANCELLED");

  return (
    <Card aria-labelledby="batches-title">
      <CardHeader>
        <CardTitle><span id="batches-title">Production batches</span></CardTitle>
        {manage ? <Button size="sm" variant="secondary" disabled={!orderOpen || hasWholeJob} title={hasWholeJob ? "The order already has a whole-order job" : !orderOpen ? "Batches can be planned for a confirmed order" : undefined} onClick={() => setEditing("new")}><Plus /> New batch</Button> : null}
      </CardHeader>
      {order.batches.length === 0 ? <EmptyState title="No batches" description={order.status === "DRAFT" || order.status === "PENDING_CONFIRMATION" ? "Batches can be planned once the order is confirmed." : "Split the order into batches, or create one whole-order job from the Production tab."} className="py-8" /> : (
        <ul className="divide-y" data-testid="batches">
          {order.batches.map((b) => (
            <li key={b.id} data-status={b.status} className="space-y-2 px-4 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs font-semibold">{b.batchNumber}</span><StatusBadge status={b.status} />
                <span className="font-semibold tabular-nums">{formatNumber(b.quantity)} units</span>
                <span className="text-xs text-muted-foreground">{b.targetStartDate ? `Start ${formatDate(b.targetStartDate)}` : "No start date"}{b.targetCompletionDate ? ` · due ${formatDate(b.targetCompletionDate)}` : ""}</span>
              </p>
              <ul className="flex flex-wrap gap-1.5" aria-label={`Allocations of ${b.batchNumber}`}>{b.allocations.map((a) => <li key={a.orderVariantId} className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs">{a.label} × {a.quantity}</li>)}</ul>
              {b.holdReason ? <p className="text-xs text-tone-warning-fg">On hold: {b.holdReason}</p> : null}
              {b.cancelReason ? <p className="text-xs text-muted-foreground">Cancelled: {b.cancelReason}</p> : null}
              {b.job ? <p className="text-xs">Job <Link href={jobHref(b.job.id)} className="font-mono font-semibold text-brand hover:underline">{b.job.jobNumber}</Link> · {b.job.status.toLowerCase().replace("_", " ")} · {b.job.completedQuantity}/{b.job.plannedQuantity ?? "?"} done</p> : null}
              <div className="flex flex-wrap gap-2">
                {manage && b.status === "PLANNED" ? <><Button size="sm" variant="secondary" onClick={() => setEditing(b)}>Edit allocations</Button><Button size="sm" onClick={() => run(b, "ready", `${b.batchNumber} is ready`)}>Mark ready</Button></> : null}
                {can("factory_jobs.manage") && b.status === "READY" && !b.job ? <Button size="sm" onClick={() => setJobFor(b)}>Create factory job</Button> : null}
                {manage && b.status === "ON_HOLD" ? <Button size="sm" variant="secondary" onClick={() => run(b, "resume", `${b.batchNumber} resumed`)}>Resume</Button> : null}
                {manage && !["ON_HOLD", "CANCELLED", "COMPLETED"].includes(b.status) ? <Button size="sm" variant="ghost" onClick={() => setReasoning({ batch: b, action: "hold" })}>Hold</Button> : null}
                {manage && !["CANCELLED", "COMPLETED"].includes(b.status) ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => setReasoning({ batch: b, action: "cancel" })}>Cancel</Button> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? <BatchDialog order={order} variants={variants} batch={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {reasoning ? <BatchReasonDialog orderId={order.id} {...reasoning} onClose={() => setReasoning(null)} /> : null}
      {jobFor ? <FactoryJobDialog orderId={order.id} title={`Create factory job for ${jobFor.batchNumber}`} create={(body) => api.createBatchJob(jobFor.id, body)} onClose={() => setJobFor(null)} /> : null}
    </Card>
  );
}

/** Allocation editor: ordered / already in other batches / this batch / remaining (server totals stay authoritative). */
function BatchDialog({ order, variants, batch, onClose }: { order: OrderDetail; variants: OrderVariant[]; batch: OrderBatch | null; onClose: () => void }) {
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
      <DialogContent title={batch ? `Edit allocations — ${batch.batchNumber}` : "New batch"} description="Choose how many units of each variant go into this batch. The server rejects over-allocation." className="max-w-2xl">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); if (bad || total === 0) { setError({ message: total === 0 ? "Allocate at least one unit." : "Quantities must be whole numbers." }); return; } try { await save.mutateAsync(); toast.success(batch ? "Allocations saved" : "Batch created"); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm"><caption className="sr-only">Variant allocation</caption>
              <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1 text-start font-medium">Variant</th><th scope="col" className="text-end font-medium">Ordered</th><th scope="col" className="text-end font-medium">In other batches</th><th scope="col" className="w-24 text-end font-medium">This batch</th><th scope="col" className="text-end font-medium">Remaining</th></tr></thead>
              <tbody>{variants.map((v) => {
                const others = v.allocatedQuantity - own(v);
                const remaining = v.quantity - others - num(v.id);
                return (
                  <tr key={v.id} data-testid="alloc-row" className="border-t">
                    <th scope="row" className="py-1.5 text-start font-medium">{v.label}</th>
                    <td className="text-end tabular-nums">{v.quantity}</td><td className="text-end tabular-nums">{others}</td>
                    <td className="py-1"><Input aria-label={`${v.label} units in this batch`} inputMode="numeric" className="h-8 text-end" value={qty[v.id] ?? ""} onChange={(e) => setQty({ ...qty, [v.id]: e.target.value })} /></td>
                    <td className={`text-end tabular-nums ${remaining < 0 ? "font-semibold text-danger" : ""}`}>{remaining}</td>
                  </tr>
                );
              })}</tbody>
              <tfoot><tr className="border-t font-semibold"><th scope="row" className="py-1.5 text-start">Batch total</th><td /><td /><td className="text-end tabular-nums">{total}</td><td /></tr></tfoot>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="b-start" label="Target start"><DatePicker id="b-start" value={start} onChange={(e) => setStart(e.target.value)} /></FormField>
            <FormField id="b-end" label="Target completion"><DatePicker id="b-end" value={end} onChange={(e) => setEnd(e.target.value)} /></FormField>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{batch ? "Save allocations" : "Create batch"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BatchReasonDialog({ orderId, batch, action, onClose }: { orderId: string; batch: OrderBatch; action: "hold" | "cancel"; onClose: () => void }) {
  const inv = useOrderInvalidation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({ mutationFn: () => api.batchAction(batch.id, action, { reason: reason.trim() }), onSuccess: () => inv.order(orderId) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`${action === "hold" ? "Hold" : "Cancel"} ${batch.batchNumber}`} description={action === "cancel" ? "Cancelling frees its units for another batch. A reason is required." : "A reason is required."}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(action === "hold" ? "Batch on hold" : "Batch cancelled"); onClose(); } catch (err) { setError(errorMessage(err)); } }}>
          {error ? <FormError message={error} /> : null}
          <FormField id="br" label="Reason" required><Textarea id="br" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Back</Button><Button type="submit" variant={action === "cancel" ? "danger" : "primary"} loading={run.isPending} disabled={reason.trim().length < 3}>{action === "hold" ? "Put on hold" : "Cancel batch"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Shared by whole-order and batch job creation. The job itself is operated in the Production area. */
export function FactoryJobDialog({ orderId, title, create, onClose, onCreated }: { orderId?: string; title: string; create: (body: api.FactoryJobBody) => Promise<{ id: string; jobNumber: string }>; onClose: () => void; onCreated?: () => void }) {
  const inv = useOrderInvalidation();
  const [planned, setPlanned] = useState(false);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => create({ ...(planned ? { release: false } : {}), ...(target ? { targetCompletionDate: toIsoDate(target) } : {}) }), onSuccess: () => { if (orderId) inv.job(orderId); onCreated?.(); } });
  const router = useRouter();
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={title} description="Creates the production job from the approved reference and the frozen order specification. Priority and dates are inherited.">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { const j = await run.mutateAsync(); toast.success(`${j.jobNumber} created`, { action: { label: "Open job", onClick: () => router.push(jobHref(j.id)) } }); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="fj-target" label="Target completion (optional)"><DatePicker id="fj-target" value={target} onChange={(e) => setTarget(e.target.value)} /></FormField>
          <div className="flex items-start gap-2"><Checkbox id="fj-planned" checked={planned} onCheckedChange={(c) => setPlanned(c === true)} className="mt-0.5" /><Label htmlFor="fj-planned" className="font-normal">Create as planned (assign stages before releasing)</Label></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={run.isPending}>Create factory job</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { JOB_SOURCE_LABELS };
