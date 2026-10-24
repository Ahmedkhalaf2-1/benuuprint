"use client";

import { useMutation } from "@tanstack/react-query";
import { FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AssetDownloadButton, formatFileSize } from "@/components/data-display/asset-download-button";
import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage } from "@/lib/api/errors";
import * as api from "./api";
import { FileUploader } from "./file-uploader";
import { useSampleInvalidation } from "./hooks";
import { ATTACHMENT_TYPE_LABELS } from "./labels";
import { SAMPLE_ATTACHMENT_TYPES, type SampleAttachment, type SampleDetail } from "./types";

/** Reference files attached to the sample (REFERENCE, MOCKUP, SIZE_CHART, ARTWORK, OTHER). Attach/detach is DRAFT-only. */
export function SampleFiles({ sample, editable, canUpload }: { sample: SampleDetail; editable: boolean; canUpload: boolean }) {
  const inv = useSampleInvalidation();
  const [type, setType] = useState<string>("REFERENCE");
  const [removing, setRemoving] = useState<SampleAttachment | null>(null);
  const remove = useMutation({ mutationFn: (a: SampleAttachment) => api.detachSampleAsset(sample.id, a.attachmentId), onSuccess: () => { void inv.detail(sample.id); } });
  const needsChart = sample.fitMethod === "CUSTOM_SIZE_CHART" && !sample.attachments.some((a) => a.type === "SIZE_CHART");

  return (
    <Card id="sec-files" aria-labelledby="files-title" className="scroll-mt-20">
      <CardHeader><CardTitle><span id="files-title">Reference files</span></CardTitle><span className="text-xs text-muted-foreground">{sample.attachments.length}</span></CardHeader>
      {needsChart ? <p role="status" className="border-b bg-tone-warning-bg px-4 py-2 text-sm text-tone-warning-fg">Fit method is “Custom size chart”: attach a file of type Size chart before submitting.</p> : null}
      {sample.attachments.length === 0 ? <EmptyState title="No reference files" description={editable ? "Attach mockups, reference photos or a size chart." : undefined} className="py-6" /> : (
        <ul className="divide-y" data-testid="sample-files">
          {sample.attachments.map((a) => (
            <li key={a.attachmentId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
              <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{a.originalName}</span>
              <Badge variant="outline">{ATTACHMENT_TYPE_LABELS[a.type] ?? a.type}</Badge>
              <span className="text-xs text-muted-foreground">{formatFileSize(a.sizeBytes)}</span>
              <AssetDownloadButton assetId={a.assetId} fileName={a.originalName} />
              {editable ? <IconButton size="sm" label={`Remove ${a.originalName}`} icon={<Trash2 />} onClick={() => setRemoving(a)} /> : null}
            </li>
          ))}
        </ul>
      )}
      {editable && canUpload ? (
        <CardContent className="space-y-3 border-t">
          <div className="max-w-xs space-y-1.5"><Label htmlFor="file-type">File type</Label><Select id="file-type" value={type} onValueChange={setType} options={SAMPLE_ATTACHMENT_TYPES.map((t) => ({ value: t, label: ATTACHMENT_TYPE_LABELS[t] ?? t }))} /></div>
          <FileUploader assetType={type} onUploaded={async (asset) => { await api.attachSampleAsset(sample.id, asset.id); void inv.detail(sample.id); toast.success(`${asset.originalName} attached`); }} />
        </CardContent>
      ) : editable ? <p className="border-t px-4 py-3 text-xs text-muted-foreground">Your role cannot upload files.</p> : null}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.originalName ?? "file"}?`}
        description="The file is detached from this draft. The file itself is kept by the system."
        confirmLabel="Remove file"
        destructive
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing, { onSuccess: () => { toast.success("File removed"); setRemoving(null); }, onError: (e) => { toast.error(errorMessage(e)); setRemoving(null); } })}
      />
    </Card>
  );
}
