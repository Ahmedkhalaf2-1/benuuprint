"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { customerApi } from "@/lib/customer/client";
import { resolveDownloadUrl } from "@/lib/api/assets";
import { errorMessage } from "@/lib/api/errors";
import * as api from "./api";
import { useI18n } from "@/i18n/provider";
import { localizedMap } from "@/i18n/active";

/** Private download: the signed link is requested only on click, resolved against the API origin and opened once. Never shown or stored. */
export function FileDownloadButton({ sampleId, attachmentId, name }: { sampleId: string; attachmentId: string; name: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="secondary" loading={busy} aria-label={t("customer.downloadName", { name })} onClick={async () => {
      setBusy(true);
      try {
        const r = await customerApi.get<{ url: string }>(api.fileUrlPath(sampleId, attachmentId));
        window.open(resolveDownloadUrl(r.url), "_blank", "noopener,noreferrer");
      } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
    }}><Download />{" "}{t("common.download")}</Button>
  );
}

export const FILE_TYPE_LABELS: Record<string, string> = localizedMap({ REFERENCE: "Reference", ARTWORK: "Artwork", SIZE_CHART: "Size chart", OTHER: "Other" });
