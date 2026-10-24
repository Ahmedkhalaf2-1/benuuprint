"use client";

import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { FormError, FormField } from "@/components/forms/field";
import { formatFileSize } from "@/components/data-display/asset-download-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { resolveDownloadUrl } from "@/lib/api/assets";
import { errorMessage, isApiError } from "@/lib/api/errors";

import { FileDropzoneShell } from "@/components/ui/file-dropzone-shell";
import * as sapi from "./api";
import { BLOCKER_LABELS, STAGE_FILE_TYPES } from "./labels";
import { BLOCKER_TYPES, type Blocker, type JobNote, type StageFile, type StageQuantity, type StageReports } from "./types";
import { useI18n } from "@/i18n/provider";

/** Signed URL for a file a stage shows: requested on click only, resolved on the API origin, never stored. */
export function StageFileButton({ stageId, file }: { stageId: string; file: StageFile }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="secondary" loading={busy} aria-label={t("production.downloadOriginalname", { originalName: file.originalName })} onClick={async () => {
      setBusy(true);
      try {
        const r = await api.get<{ url: string }>(sapi.stageFileUrlPath(stageId, file.assetId));
        window.open(resolveDownloadUrl(r.url), "_blank", "noopener,noreferrer");
      } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
    }}><Download />{" "}{t("production.download")}</Button>
  );
}

/** One-file uploader that posts through a caller-supplied (staff or admin) route; never straight to storage. */
export function StageUploader({ onUpload, hint, disabled }: { onUpload: (file: File) => Promise<unknown>; hint: string; disabled?: boolean }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <FileDropzoneShell hint={hint} disabled={disabled || !!busy} accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" onFiles={async ([file]) => {
        if (!file) return;
        setError(null); setBusy(file.name);
        try { await onUpload(file); toast.success(t("production.fileAttached")); } catch (e) { setError(errorMessage(e)); } finally { setBusy(null); }
      }} />
      {busy ? <p role="status" className="text-sm text-muted-foreground">{t("production.uploadingBusy", { busy })}</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function FilesSection({ stageId, files, canAttach, onUpload }: { stageId: string; files: StageFile[]; canAttach: boolean; onUpload: (file: File, type: string) => Promise<unknown> }) {
  const { t, fmt } = useI18n();
  const [type, setType] = useState<string>("STAGE_PHOTO");
  return (
    <section aria-label={t("production.files")} className="space-y-2">
      <h4 className="text-sm font-semibold">{t("production.files")}</h4>
      {files.length === 0 ? <p className="text-sm text-muted-foreground">{t("production.noFiles")}</p> : (
        <ul className="divide-y rounded-md border" data-testid="stage-files">
          {files.map((f) => (
            <li key={f.attachmentId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{f.originalName}</span>
              <span className="text-xs text-muted-foreground">{fmt.code(f.type)} · {formatFileSize(f.sizeBytes)}</span>
              <StageFileButton stageId={stageId} file={f} />
            </li>
          ))}
        </ul>
      )}
      {canAttach ? (
        <div className="space-y-2">
          <div className="max-w-xs"><Select aria-label={t("production.fileType")} value={type} onValueChange={setType} options={STAGE_FILE_TYPES.map((t) => ({ value: t, label: fmt.code(t) }))} /></div>
          <StageUploader hint={t("production.pngJpegGifWebpOrPdf")} onUpload={(f) => onUpload(f, type)} />
        </div>
      ) : null}
    </section>
  );
}

export function NotesSection({ notes, canAdd, onAdd }: { notes: JobNote[]; canAdd: boolean; onAdd: (content: string) => Promise<unknown> }) {
  const { t, fmt } = useI18n();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({ mutationFn: onAdd });
  return (
    <section aria-label={t("common.notes")} className="space-y-2">
      <h4 className="text-sm font-semibold">{t("common.internalNotes")}{" "}<span className="text-xs font-normal text-muted-foreground">{t("production.staffOnly")}</span></h4>
      {notes.length === 0 ? <p className="text-sm text-muted-foreground">{t("production.noNotes")}</p> : (
        <ul className="space-y-2" data-testid="stage-notes">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border px-3 py-2 text-sm"><p className="whitespace-pre-wrap">{n.content}</p><p className="mt-1 text-xs text-muted-foreground">{n.authorName} · {fmt.dateTime(n.createdAt)}</p></li>
          ))}
        </ul>
      )}
      {canAdd ? (
        <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await add.mutateAsync(text.trim()); setText(""); toast.success(t("production.noteAdded")); } catch (err) { setError(errorMessage(err)); } }}>
          {error ? <FormError message={error} /> : null}
          <Textarea aria-label={t("production.newNote")} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("production.addAnInternalNote")} />
          <Button type="submit" size="sm" variant="secondary" loading={add.isPending} disabled={text.trim().length === 0}>{t("production.addNote")}</Button>
        </form>
      ) : null}
    </section>
  );
}

export function BlockersSection({ blockers, canResolve, onResolve }: { blockers: Blocker[]; canResolve: boolean; onResolve: (b: Blocker, note: string) => Promise<unknown> }) {
  const { t, fmt } = useI18n();
  const [resolving, setResolving] = useState<Blocker | null>(null);
  if (blockers.length === 0) return null;
  const open = blockers.filter((b) => b.status === "OPEN");
  return (
    <section aria-label={t("production.blockers")} className="space-y-2" data-testid="blockers">
      <h4 className="text-sm font-semibold">{t("production.blockers")}{" "}{open.length ? <span className="ms-1 rounded-sm bg-tone-blocked-bg px-1.5 text-xs text-tone-blocked-fg">{t("production.lengthOpen", { length: open.length })}</span> : null}</h4>
      <ul className="space-y-2">
        {blockers.map((b) => (
          <li key={b.id} data-status={b.status} className={`rounded-md border px-3 py-2 text-sm ${b.status === "OPEN" ? "border-tone-blocked-dot bg-tone-blocked-bg/40" : "opacity-80"}`}>
            <p className="flex flex-wrap items-center gap-2"><span className="font-medium">{BLOCKER_LABELS[b.type] ?? fmt.code(b.type)}</span><StatusBadge status={b.status === "OPEN" ? "BLOCKED" : b.status === "RESOLVED" ? "COMPLETED" : "CANCELLED"} label={fmt.code(b.status)} /></p>
            <p className="mt-1">{b.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("production.raisedCreatedat", { createdAt: fmt.dateTime(b.createdAt) })}{b.stageName ? ` · ${b.stageName}` : t("production.wholeJob")}{b.resolvedAt ? t("production.resolvedResolvedat", { resolvedAt: fmt.dateTime(b.resolvedAt) }) : ""}</p>
            {b.resolutionNote ? <p className="text-xs">{t("production.resolutionResolutionnote", { resolutionNote: b.resolutionNote })}</p> : null}
            {canResolve && b.status === "OPEN" ? <Button size="sm" variant="secondary" className="mt-2" onClick={() => setResolving(b)}>{t("production.resolve")}</Button> : null}
          </li>
        ))}
      </ul>
      {resolving ? <ResolveDialog blocker={resolving} onResolve={onResolve} onClose={() => setResolving(null)} /> : null}
    </section>
  );
}

function ResolveDialog({ blocker, onResolve, onClose }: { blocker: Blocker; onResolve: (b: Blocker, note: string) => Promise<unknown>; onClose: () => void }) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({ mutationFn: () => onResolve(blocker, note.trim()) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={t("production.resolveBlocker")} description={`${BLOCKER_LABELS[blocker.type] ?? blocker.type}: ${blocker.description}`}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(t("production.blockerResolved")); onClose(); } catch (err) { setError(errorMessage(err)); } }}>
          {error ? <FormError message={error} /> : null}
          <FormField id="rb-note" label={t("production.whatWasDoneToClearIt")}><Textarea id="rb-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.back")}</Button><Button type="submit" loading={run.isPending}>{t("production.resolveBlocker")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RaiseBlockerDialog({ target, onRaise, onClose }: { target: string; onRaise: (body: { type: string; description: string }) => Promise<unknown>; onClose: () => void }) {
  const { t } = useI18n();
  const [type, setType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => onRaise({ type, description: description.trim() }) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={t("production.raiseABlocker")} description={t("production.blockerWorkStops", { target })}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success(t("production.blockerRaised")); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="bk-type" label={t("common.type")} required><Select id="bk-type" value={type} onValueChange={setType} placeholder={t("common.choose")} options={BLOCKER_TYPES.map((t) => ({ value: t, label: BLOCKER_LABELS[t] ?? t }))} /></FormField>
          <FormField id="bk-desc" label={t("common.description")} required><Textarea id="bk-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" variant="danger" loading={run.isPending} disabled={!type || description.trim().length < 3}>{t("production.raiseBlocker")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Bulk quantity reporting: the backend decides when the stage may complete; reports are append-only and can never exceed what remains. */
export function QuantitySection({ quantity, reports, canReport, orderVariants, onReport }: {
  quantity: StageQuantity;
  reports?: StageReports["reports"];
  canReport: boolean;
  orderVariants: Array<{ id: string; label: string }>;
  onReport: (body: sapi.ReportBody) => Promise<unknown>;
}) {
  const { t, fmt } = useI18n();
  const [produced, setProduced] = useState("");
  const [rejected, setRejected] = useState("");
  const [rework, setRework] = useState("");
  const [variant, setVariant] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const n = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : 0);
  const bad = [produced, rejected, rework].some((v) => v.trim() !== "" && !/^\d+$/.test(v.trim()));
  const total = n(produced) + n(rejected);
  const run = useMutation({ mutationFn: () => onReport({ ...(n(produced) ? { producedQuantity: n(produced) } : {}), ...(n(rejected) ? { rejectedQuantity: n(rejected) } : {}), ...(n(rework) ? { reworkQuantity: n(rework) } : {}), ...(variant ? { orderVariantId: variant } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) }) });
  return (
    <section aria-label={t("common.quantity")} className="space-y-3" data-testid="quantity-section">
      <h4 className="text-sm font-semibold">{t("common.quantity")}</h4>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {([["Required", quantity.required], [t.text("Produced"), quantity.produced], [t.text("Rejected"), quantity.rejected], [t.text("Rework flagged"), quantity.reworkFlagged], [t.text("Remaining"), quantity.remaining]] as const).map(([l, v]) => (
          <div key={l} className="rounded-md border p-2"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd></div>
        ))}
      </dl>
      {quantity.reworkAffectedQuantity != null ? <p className="text-xs text-tone-warning-fg">{t("production.thisOccurrenceRedoesOnlyTheReworkaffectedqua", { reworkAffectedQuantity: quantity.reworkAffectedQuantity })}</p> : null}
      {canReport ? (
        <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); setError(null); if (bad || total === 0) { setError({ message: total === 0 ? t("production.reportAtLeastOneProducedOr") : t("production.quantitiesMustBeWholeNumbers") }); return; } try { await run.mutateAsync(); setProduced(""); setRejected(""); setRework(""); setVariant(""); setNotes(""); toast.success(t("production.quantityReported")); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <div className="grid gap-2 sm:grid-cols-3">
            <FormField id="rq-p" label={t("production.producedGood")}><Input id="rq-p" inputMode="numeric" value={produced} onChange={(e) => setProduced(e.target.value)} /></FormField>
            <FormField id="rq-r" label={t("production.rejectedScrapped")}><Input id="rq-r" inputMode="numeric" value={rejected} onChange={(e) => setRejected(e.target.value)} /></FormField>
            <FormField id="rq-w" label={t("production.flagForRework")}><Input id="rq-w" inputMode="numeric" value={rework} onChange={(e) => setRework(e.target.value)} /></FormField>
          </div>
          {orderVariants.length ? <FormField id="rq-v" label={t("production.variantOptional")}><Select id="rq-v" value={variant || "__none"} onValueChange={(v) => setVariant(v === "__none" ? "" : v)} options={[{ value: "__none", label: t("production.notSpecified") }, ...orderVariants.map((v) => ({ value: v.id, label: v.label }))]} /></FormField> : null}
          <FormField id="rq-n" label={t("common.notes")}><Input id="rq-n" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          <p className="text-xs text-muted-foreground">{t("production.partialReportsAreFineReportWhat")}</p>
          <Button type="submit" size="sm" loading={run.isPending}>{t("production.addReport")}</Button>
        </form>
      ) : null}
      {reports && reports.length > 0 ? (
        <ol className="divide-y rounded-md border text-sm" aria-label={t("production.reportsSoFar")} data-testid="reports">
          {reports.map((r) => <li key={r.id} className="px-3 py-1.5"><span className="tabular-nums">{t("production.producedquantityProduced", { producedQuantity: r.producedQuantity })}{r.rejectedQuantity ? t("production.rejectedquantityRejected", { rejectedQuantity: r.rejectedQuantity }) : ""}{r.reworkQuantity ? t("production.reworkquantityReworkFlagged", { reworkQuantity: r.reworkQuantity }) : ""}</span><span className="block text-xs text-muted-foreground">{r.reportedByName ?? "—"} · {fmt.dateTime(r.createdAt)}{r.notes ? ` · ${r.notes}` : ""}</span></li>)}
        </ol>
      ) : null}
    </section>
  );
}
