"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api/errors";
import { useArchiveBrand, useRestoreBrand } from "./hooks";
import { useI18n } from "@/i18n/provider";

export function ArchiveBrandDialog({
  brand,
  onOpenChange,
  onArchived,
}: {
  brand: { id: string; name: string; customerId: string } | null;
  onOpenChange: (open: boolean) => void;
  onArchived?: () => void;
}) {
  const { t } = useI18n();
  const archive = useArchiveBrand();
  return (
    <ConfirmDialog
      open={!!brand}
      onOpenChange={onOpenChange}
      title={t("brands.archiveV1", { v1: brand?.name ?? "brand" })}
      description={t("brands.theBrandIsHiddenFromDefault")}
      confirmLabel={t("brands.archiveBrand")}
      destructive
      loading={archive.isPending}
      onConfirm={() => {
        if (!brand) return;
        archive.mutate({ id: brand.id, customerId: brand.customerId }, {
          onSuccess: () => { toast.success(t("brands.nameArchived", { name: brand.name })); onOpenChange(false); onArchived?.(); },
          onError: (e) => { toast.error(errorMessage(e)); onOpenChange(false); },
        });
      }}
    />
  );
}

/** Restore = setting a status on an archived brand. 409 if the customer is still archived or the name is taken. */
export function useRestoreBrandAction() {
  const { t } = useI18n();
  const m = useRestoreBrand();
  return {
    pending: m.isPending,
    restore: (brand: { id: string; name: string; customerId: string }, after?: () => void) =>
      m.mutate({ id: brand.id, customerId: brand.customerId }, {
        onSuccess: () => { toast.success(t("brands.nameRestored", { name: brand.name })); after?.(); },
        onError: (e) => toast.error(errorMessage(e)),
      }),
  };
}
