"use client";

import { useMutation, useQueries } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccessDeniedState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import * as papi from "@/features/production/api";
import type { JobStage } from "@/features/production/types";
import type { OrderDetail } from "@/features/orders/types";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import { formatDateTime } from "@/lib/utils/format";
import * as api from "./api";
import { useFulfillmentInvalidation, usePackaging } from "./hooks";
import { PackagingReportForm } from "./packaging-report-form";
import type { PackagingSpec, PackagingSpecInput } from "./types";

const flag = (v: boolean) => (v ? "Required" : "No");

export function PackagingPanel({ order }: { order: OrderDetail }) {
  const { can } = useAuth();
  const inv = useFulfillmentInvalidation();
  const q = usePackaging(order.id);
  const [editing, setEditing] = useState(false);
  const jobs = order.factoryJobs.filter((j) => j.status !== "CANCELLED");
  const stageQs = useQueries({ queries: jobs.map((j) => ({ queryKey: queryKeys.fulfillment.packagingStages(j.id), queryFn: ({ signal }: { signal: AbortSignal }) => papi.listJobStages(j.id, signal), enabled: can("production_quantity.report") })) });
  const active: Array<{ stage: JobStage; jobNumber: string }> = stageQs.flatMap((s, i) => (s.data ?? []).filter((x) => x.departmentType === "PACKAGING" && x.stageCode === "PACKAGING" && !x.superseded && x.status === "IN_PROGRESS").map((stage) => ({ stage, jobNumber: jobs[i]!.jobNumber })));
  const variants = order.items.flatMap((i) => i.variants).map((v) => ({ id: v.id, label: v.label }));

  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title="Packaging is not available to your role" className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const p = q.data;
  if (!p) return null;
  const r = p.reconciliation;

  return (
    <div className="space-y-4" data-testid="packaging-panel">
      <Card aria-labelledby="pk-recon">
        <CardHeader><CardTitle><span id="pk-recon">Packaging progress</span></CardTitle><span className="text-xs text-muted-foreground">{r.packagingComplete ? "All produced units are packed" : "Packaging in progress"}</span></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {([["Produced (final stage)", r.completedQuantity], ["Packed", r.packedQuantity], ["Damaged", r.damagedQuantity], ["Cartons", r.cartonCount], ["Ready to ship", r.shippableQuantity]] as const).map(([l, v]) => <div key={l} className="rounded-md border p-3"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{v}</dd></div>)}
          </dl>
          {!p.defined ? <p role="status" className="mt-3 rounded-md bg-tone-warning-bg px-3 py-2 text-sm text-tone-warning-fg">Define the packaging specification <strong>before packaging starts</strong>: the backend refuses packaging reports without it and locks the specification once packaging has started.</p> : null}
        </CardContent>
      </Card>

      <Card aria-labelledby="pk-spec">
        <CardHeader><CardTitle><span id="pk-spec">Packaging specification</span></CardTitle>{can("packaging.manage") ? <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>{p.defined ? "Edit specification" : "Define specification"}</Button> : null}</CardHeader>
        <CardContent>
          {!p.defined ? <p className="text-sm text-muted-foreground">Not defined yet.</p> : (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2" data-testid="packaging-spec">
              <div><dt className="text-xs text-muted-foreground">Folding</dt><dd>{p.foldingInstructions ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Units per carton</dt><dd>{p.unitsPerCarton ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Polybag</dt><dd>{flag(p.polybagRequired)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Labels</dt><dd>{flag(p.labelsRequired)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Hang tags</dt><dd>{flag(p.hangTagsRequired)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Stickers</dt><dd>{flag(p.stickersRequired)}{p.stickerNotes ? ` — ${p.stickerNotes}` : ""}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Carton notes</dt><dd>{p.cartonNotes ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Special instructions</dt><dd>{p.specialInstructions ?? "—"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Components</dt><dd>{p.components.length ? <ul>{p.components.map((c) => <li key={c.id}>{c.name}{c.quantityPerUnit ? ` × ${c.quantityPerUnit} per unit` : ""}{c.notes ? ` — ${c.notes}` : ""}</li>)}</ul> : "—"}</dd></div>
            </dl>
          )}
        </CardContent>
      </Card>

      {can("production_quantity.report") ? (
        <Card aria-labelledby="pk-exec">
          <CardHeader><CardTitle><span id="pk-exec">Packaging execution</span></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {active.length === 0 ? <p className="text-sm text-muted-foreground" data-testid="no-packaging-stage">No packaging stage is in progress. Packaging staff start it from My work; reports are added while it runs.</p> : active.map(({ stage, jobNumber }) => (
              <div key={stage.id} className="space-y-2 rounded-md border p-3" data-testid="packaging-stage">
                <p className="text-sm font-medium">{jobNumber} · {stage.stageName}{stage.assignees.length ? ` · ${stage.assignees.map((a) => a.name).join(", ")}` : " · unassigned"}</p>
                <PackagingReportForm variants={variants} onReport={async (b) => { await api.reportPackaging(stage.id, b); inv.packaging(order.id); }} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {p.reports.length ? (
        <Card aria-labelledby="pk-reports">
          <CardHeader><CardTitle><span id="pk-reports">Reports</span></CardTitle></CardHeader>
          <CardContent>
            <ol className="divide-y rounded-md border text-sm" data-testid="packaging-reports">
              {p.reports.map((x) => <li key={x.id} className="px-3 py-1.5"><span className="tabular-nums">{x.packedQuantity} packed{x.damagedQuantity ? `, ${x.damagedQuantity} damaged` : ""}{x.cartonCount ? `, ${x.cartonCount} cartons` : ""}</span><span className="block text-xs text-muted-foreground">{x.reportedByName ?? "—"} · {formatDateTime(x.createdAt)}{x.notes ? ` · ${x.notes}` : ""}</span></li>)}
            </ol>
          </CardContent>
        </Card>
      ) : null}
      {editing ? <SpecDialog orderId={order.id} spec={p} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}

interface CompRow { key: number; componentOptionId?: string; name: string; qty: string; notes: string }
let seq = 0;

function SpecDialog({ orderId, spec, onClose }: { orderId: string; spec: PackagingSpec; onClose: () => void }) {
  const inv = useFulfillmentInvalidation();
  const [f, setF] = useState({ folding: spec.foldingInstructions ?? "", polybag: spec.polybagRequired, labels: spec.labelsRequired, hangTags: spec.hangTagsRequired, stickers: spec.stickersRequired, stickerNotes: spec.stickerNotes ?? "", perCarton: spec.unitsPerCarton ? String(spec.unitsPerCarton) : "", cartonNotes: spec.cartonNotes ?? "", special: spec.specialInstructions ?? "" });
  const [rows, setRows] = useState<CompRow[]>(spec.components.map((c) => ({ key: ++seq, componentOptionId: c.componentOptionId ?? undefined, name: c.name, qty: c.quantityPerUnit ? String(c.quantityPerUnit) : "", notes: c.notes ?? "" })));
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({ mutationFn: (b: PackagingSpecInput) => api.putPackaging(orderId, b) });
  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent title="Packaging specification" description="What packaging staff must use. It can no longer change once packaging has started." className="max-w-xl">
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setError(null);
          if (f.perCarton.trim() && !/^\d+$/.test(f.perCarton.trim())) { setError({ message: "Units per carton must be a whole number." }); return; }
          const body: PackagingSpecInput = { polybagRequired: f.polybag, labelsRequired: f.labels, hangTagsRequired: f.hangTags, stickersRequired: f.stickers, ...(f.folding.trim() ? { foldingInstructions: f.folding.trim() } : {}), ...(f.stickerNotes.trim() ? { stickerNotes: f.stickerNotes.trim() } : {}), ...(f.perCarton.trim() ? { unitsPerCarton: Number(f.perCarton) } : {}), ...(f.cartonNotes.trim() ? { cartonNotes: f.cartonNotes.trim() } : {}), ...(f.special.trim() ? { specialInstructions: f.special.trim() } : {}),
            components: rows.filter((r) => r.name.trim()).map((r) => ({ ...(r.componentOptionId ? { componentOptionId: r.componentOptionId } : { customName: r.name.trim() }), ...(r.qty.trim() && Number(r.qty) ? { quantityPerUnit: Number(r.qty) } : {}), ...(r.notes.trim() ? { notes: r.notes.trim() } : {}) })) };
          try { await save.mutateAsync(body); inv.packaging(orderId); toast.success("Packaging specification saved"); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); }
        }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="ps-fold" label="Folding instructions"><Input id="ps-fold" value={f.folding} onChange={(e) => set({ folding: e.target.value })} /></FormField>
          <div className="grid grid-cols-2 gap-2">
            {([["polybag", "Polybag required"], ["labels", "Labels required"], ["hangTags", "Hang tags required"], ["stickers", "Stickers required"]] as const).map(([k, l]) => <div key={k} className="flex items-center gap-2"><Checkbox id={`ps-${k}`} checked={f[k]} onCheckedChange={(c) => set({ [k]: c === true } as never)} /><Label htmlFor={`ps-${k}`} className="font-normal">{l}</Label></div>)}
          </div>
          {f.stickers ? <FormField id="ps-sn" label="Sticker notes"><Input id="ps-sn" value={f.stickerNotes} onChange={(e) => set({ stickerNotes: e.target.value })} /></FormField> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField id="ps-pc" label="Units per carton"><Input id="ps-pc" inputMode="numeric" value={f.perCarton} onChange={(e) => set({ perCarton: e.target.value })} /></FormField>
            <FormField id="ps-cn" label="Carton notes"><Input id="ps-cn" value={f.cartonNotes} onChange={(e) => set({ cartonNotes: e.target.value })} /></FormField>
          </div>
          <FormField id="ps-sp" label="Special instructions"><Textarea id="ps-sp" rows={2} value={f.special} onChange={(e) => set({ special: e.target.value })} /></FormField>
          <div className="space-y-1.5">
            <p className="text-[0.8125rem] font-medium">Components</p>
            {rows.map((r, i) => (
              <div key={r.key} className="grid grid-cols-[1fr_5rem_2rem] gap-2">
                <Input aria-label={`Component ${i + 1} name`} value={r.name} disabled={!!r.componentOptionId} onChange={(e) => setRows((x) => x.map((y) => (y.key === r.key ? { ...y, name: e.target.value } : y)))} />
                <Input aria-label={`Component ${i + 1} per unit`} inputMode="numeric" placeholder="/unit" value={r.qty} onChange={(e) => setRows((x) => x.map((y) => (y.key === r.key ? { ...y, qty: e.target.value } : y)))} />
                <IconButton size="sm" label={`Remove component ${i + 1}`} icon={<Trash2 />} onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} />
              </div>
            ))}
            <Button type="button" size="sm" variant="secondary" onClick={() => setRows((x) => [...x, { key: ++seq, name: "", qty: "", notes: "" }])}><Plus /> Add component</Button>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save specification</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
