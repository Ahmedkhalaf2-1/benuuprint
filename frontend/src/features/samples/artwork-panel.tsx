"use client";

import { zodResolver } from "@/lib/forms/resolver";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, Plus } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AssetDownloadButton, formatFileSize } from "@/components/data-display/asset-download-button";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";

import * as api from "./api";
import { FileUploader } from "./file-uploader";
import { useSampleApprovals, useSampleArtworks, useSampleInvalidation } from "./hooks";
import { PURPOSE_LABELS } from "./labels";
import { ARTWORK_PURPOSES, type Artwork, type ArtworkVersion, type SampleDetail } from "./types";
import { useI18n } from "@/i18n/provider";

const newSchema = z.object({ name: z.string().trim().min(1, "Enter a name").max(120), purpose: z.enum(ARTWORK_PURPOSES), notes: z.string().trim().max(1000) });
type NewValues = z.infer<typeof newSchema>;

/**
 * Artwork + immutable versions. A file is never replaced in place: new file = new version. The single APPROVED version is
 * the production-facing one and is visually distinct; approval itself goes through the approvals flow (Approvals tab).
 */
export function ArtworkPanel({ sample, canEdit, canRequestApproval }: { sample: SampleDetail; canEdit: boolean; canRequestApproval: boolean }) {
  const { t, fmt } = useI18n();
  const q = useSampleArtworks(sample.id);
  const approvals = useSampleApprovals(sample.id);
  const inv = useSampleInvalidation();
  const [creating, setCreating] = useState(false);
  const [versioning, setVersioning] = useState<Artwork | null>(null);
  const requestApproval = useMutation({
    mutationFn: (versionId: string) => api.requestApproval(sample.id, { type: "ARTWORK", artworkVersionId: versionId }),
    onSuccess: () => { void inv.approvals(sample.id); toast.success(t("samples.approvalRequestedRecordTheDecisionIn")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const pendingFor = (v: ArtworkVersion) => approvals.data?.some((a) => a.type === "ARTWORK" && a.artworkVersionId === v.id && a.status === "PENDING");

  return (
    <Card id="sec-artwork" aria-labelledby="art-title" className="scroll-mt-20">
      <CardHeader>
        <CardTitle><span id="art-title">{t("samples.artwork")}</span></CardTitle>
        {canEdit ? <Button size="sm" variant="secondary" onClick={() => setCreating(true)}><Plus />{" "}{t("samples.newArtwork")}</Button> : null}
      </CardHeader>
      {q.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" /> : q.data && q.data.length === 0 ? (
        <EmptyState title={t("samples.noArtworkForThisSample")} description={canEdit ? t("samples.uploadArtworkToLinkItTo") : undefined} className="py-8" />
      ) : (
        <div className="divide-y" data-testid="artworks">
          {q.data?.map((a) => {
            const versions = [...a.versions].sort((x, y) => y.versionNumber - x.versionNumber);
            return (
              <section key={a.id} aria-label={t("samples.artworkName", { name: a.name })} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium">{a.name}</h4>
                  <Badge variant="outline">{PURPOSE_LABELS[a.purpose] ?? a.purpose}</Badge>
                  {a.approvedVersionId ? <span className="inline-flex items-center gap-1 text-xs font-medium text-tone-success-fg"><BadgeCheck aria-hidden className="size-4" />{" "}{t("samples.approvedVersionInUse")}</span> : <span className="text-xs text-muted-foreground">{t("samples.noApprovedVersionYet")}</span>}
                  {canEdit ? <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setVersioning(a)}><Plus />{" "}{t("samples.newVersion")}</Button> : null}
                </div>
                <ol className="space-y-1.5" aria-label={t("samples.versionsOfName", { name: a.name })}>
                  {versions.map((v) => {
                    const approved = v.id === a.approvedVersionId || v.status === "APPROVED";
                    return (
                      <li key={v.id} data-testid="artwork-version" data-status={v.status} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm", approved && "border-tone-success-dot bg-tone-success-bg/50", (v.status === "SUPERSEDED" || v.status === "REJECTED") && "opacity-70")}>
                        <span className="font-semibold">v{v.versionNumber}</span>
                        <StatusBadge status={v.status} />
                        {v.asset ? <span className="min-w-0 flex-1 truncate">{v.asset.originalName} <span className="text-xs text-muted-foreground">· {formatFileSize(v.asset.sizeBytes)}</span></span> : <span className="flex-1 text-muted-foreground">{t("samples.noFile")}</span>}
                        <span className="text-xs text-muted-foreground">{v.approvedAt ? t("samples.approvedApprovedat", { approvedAt: fmt.date(v.approvedAt) }) : v.rejectedAt ? t("samples.rejectedRejectedat", { rejectedAt: fmt.date(v.rejectedAt) }) : t("samples.addedCreatedat", { createdAt: fmt.date(v.createdAt) })}</span>
                        {v.asset ? <AssetDownloadButton assetId={v.asset.id} fileName={v.asset.originalName} /> : null}
                        {v.status === "DRAFT" && canRequestApproval && !pendingFor(v) ? <Button size="sm" variant="secondary" loading={requestApproval.isPending} onClick={() => requestApproval.mutate(v.id)}>{t("samples.requestApproval")}</Button> : null}
                        {pendingFor(v) ? <Badge variant="brand">{t("samples.approvalPending")}</Badge> : null}
                        {v.rejectionReason ? <p className="basis-full text-xs text-muted-foreground">{t("samples.rejectedRejectionreason", { rejectionReason: v.rejectionReason })}</p> : null}
                        {v.notes ? <p className="basis-full text-xs text-muted-foreground">{v.notes}</p> : null}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}
      {creating ? <NewArtworkDialog sampleId={sample.id} onClose={() => setCreating(false)} /> : null}
      {versioning ? <NewVersionDialog sampleId={sample.id} artwork={versioning} onClose={() => setVersioning(null)} /> : null}
    </Card>
  );
}

function NewArtworkDialog({ sampleId, onClose }: { sampleId: string; onClose: () => void }) {
  const { t } = useI18n();
  const inv = useSampleInvalidation();
  const [assetId, setAssetId] = useState<{ id: string; name: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<NewValues>({ resolver: zodResolver(newSchema), defaultValues: { name: "", purpose: "FRONT_PRINT", notes: "" } });
  const purpose = useWatch({ control, name: "purpose" });
  const create = useMutation({ mutationFn: (v: NewValues) => api.createArtwork({ sampleId, name: v.name.trim(), purpose: v.purpose, assetId: assetId!.id, notes: v.notes.trim() || undefined }), onSuccess: () => { void inv.artwork(sampleId); } });
  const submit = handleSubmit(async (v) => {
    setFormError(null);
    if (!assetId) return setFileError("Upload the artwork file first");
    try { await create.mutateAsync(v); toast.success(t("samples.artworkCreatedVersion1")); onClose(); } catch (e) { setFormError(errorMessage(e)); }
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t("samples.newArtwork")} description={t("samples.createsTheArtworkWithTheUploaded")} className="max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-3">
          {formError ? <FormError message={formError} /> : null}
          <FormField id="aw-name" label={t("common.name")} required error={errors.name?.message}><Input id="aw-name" autoFocus aria-invalid={!!errors.name} {...register("name")} /></FormField>
          <FormField id="aw-purpose" label={t("samples.purpose")}><Select id="aw-purpose" value={purpose} onValueChange={(v) => setValue("purpose", v as NewValues["purpose"])} options={ARTWORK_PURPOSES.map((p) => ({ value: p, label: PURPOSE_LABELS[p] ?? p }))} /></FormField>
          <FormField id="aw-file" label={t("samples.file")} required error={fileError ?? undefined}>
            {assetId ? <p className="text-sm">{t("samples.nameUploaded", { name: assetId.name })}{" "}<Button type="button" variant="link" onClick={() => setAssetId(null)}>{t("samples.replace")}</Button></p> : <FileUploader assetType="ARTWORK" onUploaded={(a, f) => { setAssetId({ id: a.id, name: f.name }); setFileError(null); }} />}
          </FormField>
          <FormField id="aw-notes" label={t("common.notes")}><Textarea id="aw-notes" rows={2} {...register("notes")} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" loading={create.isPending}>{t("samples.createArtwork")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewVersionDialog({ sampleId, artwork, onClose }: { sampleId: string; artwork: Artwork; onClose: () => void }) {
  const { t } = useI18n();
  const inv = useSampleInvalidation();
  const [uploaded, setUploaded] = useState<{ id: string; name: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({ mutationFn: () => api.addArtworkVersion(artwork.id, { assetId: uploaded!.id, notes: notes.trim() || undefined }), onSuccess: () => { void inv.artwork(sampleId); } });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t("samples.newVersionOfName", { name: artwork.name })} description={t("samples.theNewFileBecomesANew")} className="max-w-lg">
        <div className="space-y-3">
          {error ? <FormError message={error} /> : null}
          {uploaded ? <p className="text-sm">{t("samples.nameUploaded", { name: uploaded.name })}</p> : <FileUploader assetType="ARTWORK" onUploaded={(a, f) => setUploaded({ id: a.id, name: f.name })} />}
          <FormField id="v-notes" label={t("common.notes")}><Textarea id="v-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button loading={add.isPending} disabled={!uploaded} onClick={async () => { setError(null); try { await add.mutateAsync(); toast.success(t("samples.newVersionAdded")); onClose(); } catch (e) { setError(errorMessage(e)); } }}>{t("samples.addVersion")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
