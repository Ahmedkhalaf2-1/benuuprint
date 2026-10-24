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
import { formatDateTime, humanizeCode } from "@/lib/utils/format";
import { FileDropzoneShell } from "@/components/ui/file-dropzone-shell";
import * as sapi from "./api";
import { BLOCKER_LABELS, STAGE_FILE_TYPES } from "./labels";
import { BLOCKER_TYPES, type Blocker, type JobNote, type StageFile, type StageQuantity, type StageReports } from "./types";

/** Signed URL for a file a stage shows: requested on click only, resolved on the API origin, never stored. */
export function StageFileButton({ stageId, file }: { stageId: string; file: StageFile }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="secondary" loading={busy} aria-label={`Download ${file.originalName}`} onClick={async () => {
      setBusy(true);
      try {
        const r = await api.get<{ url: string }>(sapi.stageFileUrlPath(stageId, file.assetId));
        window.open(resolveDownloadUrl(r.url), "_blank", "noopener,noreferrer");
      } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
    }}><Download /> Download</Button>
  );
}

/** One-file uploader that posts through a caller-supplied (staff or admin) route; never straight to storage. */
export function StageUploader({ onUpload, hint, disabled }: { onUpload: (file: File) => Promise<unknown>; hint: string; disabled?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <FileDropzoneShell hint={hint} disabled={disabled || !!busy} accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" onFiles={async ([file]) => {
        if (!file) return;
        setError(null); setBusy(file.name);
        try { await onUpload(file); toast.success("File attached"); } catch (e) { setError(errorMessage(e)); } finally { setBusy(null); }
      }} />
      {busy ? <p role="status" className="text-sm text-muted-foreground">Uploading {busy}…</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function FilesSection({ stageId, files, canAttach, onUpload }: { stageId: string; files: StageFile[]; canAttach: boolean; onUpload: (file: File, type: string) => Promise<unknown> }) {
  const [type, setType] = useState<string>("STAGE_PHOTO");
  return (
    <section aria-label="Files" className="space-y-2">
      <h4 className="text-sm font-semibold">Files</h4>
      {files.length === 0 ? <p className="text-sm text-muted-foreground">No files.</p> : (
        <ul className="divide-y rounded-md border" data-testid="stage-files">
          {files.map((f) => (
            <li key={f.attachmentId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{f.originalName}</span>
              <span className="text-xs text-muted-foreground">{humanizeCode(f.type)} · {formatFileSize(f.sizeBytes)}</span>
              <StageFileButton stageId={stageId} file={f} />
            </li>
          ))}
        </ul>
      )}
      {canAttach ? (
        <div className="space-y-2">
          <div className="max-w-xs"><Select aria-label="File type" value={type} onValueChange={setType} options={STAGE_FILE_TYPES.map((t) => ({ value: t, label: humanizeCode(t) }))} /></div>
          <StageUploader hint="PNG, JPEG, GIF, WebP or PDF. Stored privately as part of the production record." onUpload={(f) => onUpload(f, type)} />
        </div>
      ) : null}
    </section>
  );
}

export function NotesSection({ notes, canAdd, onAdd }: { notes: JobNote[]; canAdd: boolean; onAdd: (content: string) => Promise<unknown> }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({ mutationFn: onAdd });
  return (
    <section aria-label="Notes" className="space-y-2">
      <h4 className="text-sm font-semibold">Internal notes <span className="text-xs font-normal text-muted-foreground">(staff only)</span></h4>
      {notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes.</p> : (
        <ul className="space-y-2" data-testid="stage-notes">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border px-3 py-2 text-sm"><p className="whitespace-pre-wrap">{n.content}</p><p className="mt-1 text-xs text-muted-foreground">{n.authorName} · {formatDateTime(n.createdAt)}</p></li>
          ))}
        </ul>
      )}
      {canAdd ? (
        <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await add.mutateAsync(text.trim()); setText(""); toast.success("Note added"); } catch (err) { setError(errorMessage(err)); } }}>
          {error ? <FormError message={error} /> : null}
          <Textarea aria-label="New note" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an internal note…" />
          <Button type="submit" size="sm" variant="secondary" loading={add.isPending} disabled={text.trim().length === 0}>Add note</Button>
        </form>
      ) : null}
    </section>
  );
}

export function BlockersSection({ blockers, canResolve, onResolve }: { blockers: Blocker[]; canResolve: boolean; onResolve: (b: Blocker, note: string) => Promise<unknown> }) {
  const [resolving, setResolving] = useState<Blocker | null>(null);
  if (blockers.length === 0) return null;
  const open = blockers.filter((b) => b.status === "OPEN");
  return (
    <section aria-label="Blockers" className="space-y-2" data-testid="blockers">
      <h4 className="text-sm font-semibold">Blockers {open.length ? <span className="ms-1 rounded-sm bg-tone-blocked-bg px-1.5 text-xs text-tone-blocked-fg">{open.length} open</span> : null}</h4>
      <ul className="space-y-2">
        {blockers.map((b) => (
          <li key={b.id} data-status={b.status} className={`rounded-md border px-3 py-2 text-sm ${b.status === "OPEN" ? "border-tone-blocked-dot bg-tone-blocked-bg/40" : "opacity-80"}`}>
            <p className="flex flex-wrap items-center gap-2"><span className="font-medium">{BLOCKER_LABELS[b.type] ?? humanizeCode(b.type)}</span><StatusBadge status={b.status === "OPEN" ? "BLOCKED" : b.status === "RESOLVED" ? "COMPLETED" : "CANCELLED"} label={humanizeCode(b.status)} /></p>
            <p className="mt-1">{b.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">Raised {formatDateTime(b.createdAt)}{b.stageName ? ` · ${b.stageName}` : " · whole job"}{b.resolvedAt ? ` · resolved ${formatDateTime(b.resolvedAt)}` : ""}</p>
            {b.resolutionNote ? <p className="text-xs">Resolution: {b.resolutionNote}</p> : null}
            {canResolve && b.status === "OPEN" ? <Button size="sm" variant="secondary" className="mt-2" onClick={() => setResolving(b)}>Resolve</Button> : null}
          </li>
        ))}
      </ul>
      {resolving ? <ResolveDialog blocker={resolving} onResolve={onResolve} onClose={() => setResolving(null)} /> : null}
    </section>
  );
}

function ResolveDialog({ blocker, onResolve, onClose }: { blocker: Blocker; onResolve: (b: Blocker, note: string) => Promise<unknown>; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({ mutationFn: () => onResolve(blocker, note.trim()) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title="Resolve blocker" description={`${BLOCKER_LABELS[blocker.type] ?? blocker.type}: ${blocker.description}`}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success("Blocker resolved"); onClose(); } catch (err) { setError(errorMessage(err)); } }}>
          {error ? <FormError message={error} /> : null}
          <FormField id="rb-note" label="What was done to clear it?"><Textarea id="rb-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Back</Button><Button type="submit" loading={run.isPending}>Resolve blocker</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RaiseBlockerDialog({ target, onRaise, onClose }: { target: string; onRaise: (body: { type: string; description: string }) => Promise<unknown>; onClose: () => void }) {
  const [type, setType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => onRaise({ type, description: description.trim() }) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title="Raise a blocker" description={`${target}. Work on it stops until the blocker is resolved.`}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); toast.success("Blocker raised"); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="bk-type" label="Type" required><Select id="bk-type" value={type} onValueChange={setType} placeholder="Choose…" options={BLOCKER_TYPES.map((t) => ({ value: t, label: BLOCKER_LABELS[t] ?? t }))} /></FormField>
          <FormField id="bk-desc" label="Description" required><Textarea id="bk-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" variant="danger" loading={run.isPending} disabled={!type || description.trim().length < 3}>Raise blocker</Button></div>
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
    <section aria-label="Quantity" className="space-y-3" data-testid="quantity-section">
      <h4 className="text-sm font-semibold">Quantity</h4>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {([["Required", quantity.required], ["Produced", quantity.produced], ["Rejected", quantity.rejected], ["Rework flagged", quantity.reworkFlagged], ["Remaining", quantity.remaining]] as const).map(([l, v]) => (
          <div key={l} className="rounded-md border p-2"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd></div>
        ))}
      </dl>
      {quantity.reworkAffectedQuantity != null ? <p className="text-xs text-tone-warning-fg">This occurrence redoes only the {quantity.reworkAffectedQuantity} units sent back — not the whole job.</p> : null}
      {canReport ? (
        <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); setError(null); if (bad || total === 0) { setError({ message: total === 0 ? "Report at least one produced or rejected unit." : "Quantities must be whole numbers." }); return; } try { await run.mutateAsync(); setProduced(""); setRejected(""); setRework(""); setVariant(""); setNotes(""); toast.success("Quantity reported"); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <div className="grid gap-2 sm:grid-cols-3">
            <FormField id="rq-p" label="Produced (good)"><Input id="rq-p" inputMode="numeric" value={produced} onChange={(e) => setProduced(e.target.value)} /></FormField>
            <FormField id="rq-r" label="Rejected (scrapped)"><Input id="rq-r" inputMode="numeric" value={rejected} onChange={(e) => setRejected(e.target.value)} /></FormField>
            <FormField id="rq-w" label="Flag for rework"><Input id="rq-w" inputMode="numeric" value={rework} onChange={(e) => setRework(e.target.value)} /></FormField>
          </div>
          {orderVariants.length ? <FormField id="rq-v" label="Variant (optional)"><Select id="rq-v" value={variant || "__none"} onValueChange={(v) => setVariant(v === "__none" ? "" : v)} options={[{ value: "__none", label: "Not specified" }, ...orderVariants.map((v) => ({ value: v.id, label: v.label }))]} /></FormField> : null}
          <FormField id="rq-n" label="Notes"><Input id="rq-n" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          <p className="text-xs text-muted-foreground">Partial reports are fine: report what is done now and the rest later. The stage completes only when every required unit is accounted for.</p>
          <Button type="submit" size="sm" loading={run.isPending}>Add report</Button>
        </form>
      ) : null}
      {reports && reports.length > 0 ? (
        <ol className="divide-y rounded-md border text-sm" aria-label="Reports so far" data-testid="reports">
          {reports.map((r) => <li key={r.id} className="px-3 py-1.5"><span className="tabular-nums">+{r.producedQuantity} produced{r.rejectedQuantity ? `, ${r.rejectedQuantity} rejected` : ""}{r.reworkQuantity ? `, ${r.reworkQuantity} rework-flagged` : ""}</span><span className="block text-xs text-muted-foreground">{r.reportedByName ?? "—"} · {formatDateTime(r.createdAt)}{r.notes ? ` · ${r.notes}` : ""}</span></li>)}
        </ol>
      ) : null}
    </section>
  );
}
