"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAssetDownloadUrl } from "@/lib/api/assets";
import { errorMessage } from "@/lib/api/errors";
import { useI18n } from "@/i18n/provider";

/**
 * Private file download: the signed URL is requested only when the user clicks, resolved on the API origin
 * (lib/api/assets) and opened once. Storage keys / paths are never built or shown by the frontend.
 */
export function AssetDownloadButton({ assetId, fileName, size = "sm" }: { assetId: string; fileName: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size={size}
      variant="secondary"
      loading={busy}
      aria-label={t("common.downloadFilename", { fileName })}
      onClick={async () => {
        setBusy(true);
        try {
          const { url } = await getAssetDownloadUrl(assetId);
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
          toast.error(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download />{" "}{t("common.download")}</Button>
  );
}

export function formatFileSize(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
