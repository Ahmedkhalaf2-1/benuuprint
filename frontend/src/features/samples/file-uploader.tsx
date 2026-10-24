"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { FileDropzoneShell } from "@/components/ui/file-dropzone-shell";
import { errorMessage } from "@/lib/api/errors";
import type { Asset } from "@/features/master-data/types";
import { uploadAsset } from "./api";

export const UPLOAD_HINT = "PNG, JPEG, GIF, WebP or PDF · up to 20 MB by default (limits are enforced by the server). Files are stored privately.";

/**
 * Uploads ONE file through the backend (`POST /admin/assets`, multipart): never directly to storage. Shows pending state,
 * the file name and the server's validation message. (fetch exposes no upload progress, so a busy indicator is shown.)
 */
export function FileUploader({ assetType, onUploaded, disabled, hint = UPLOAD_HINT }: { assetType: string; onUploaded: (asset: Asset, file: File) => Promise<void> | void; disabled?: boolean; hint?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <FileDropzoneShell
        hint={hint}
        disabled={disabled || !!busy}
        accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
        onFiles={async ([file]) => {
          if (!file) return;
          setError(null);
          setBusy(file.name);
          try {
            const asset = await uploadAsset(file, assetType);
            await onUploaded(asset, file);
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(null);
          }
        }}
      />
      {busy ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden className="size-4 animate-spin" /> Uploading {busy}…</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
