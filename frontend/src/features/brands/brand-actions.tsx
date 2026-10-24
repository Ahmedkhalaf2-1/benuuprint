"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api/errors";
import { useArchiveBrand, useRestoreBrand } from "./hooks";

export function ArchiveBrandDialog({
  brand,
  onOpenChange,
  onArchived,
}: {
  brand: { id: string; name: string; customerId: string } | null;
  onOpenChange: (open: boolean) => void;
  onArchived?: () => void;
}) {
  const archive = useArchiveBrand();
  return (
    <ConfirmDialog
      open={!!brand}
      onOpenChange={onOpenChange}
      title={`Archive ${brand?.name ?? "brand"}?`}
      description="The brand is hidden from default lists and its name becomes available again for this customer. Restoring it later re-checks that the name is still free. Nothing is deleted."
      confirmLabel="Archive brand"
      destructive
      loading={archive.isPending}
      onConfirm={() => {
        if (!brand) return;
        archive.mutate({ id: brand.id, customerId: brand.customerId }, {
          onSuccess: () => { toast.success(`${brand.name} archived`); onOpenChange(false); onArchived?.(); },
          onError: (e) => { toast.error(errorMessage(e)); onOpenChange(false); },
        });
      }}
    />
  );
}

/** Restore = setting a status on an archived brand. 409 if the customer is still archived or the name is taken. */
export function useRestoreBrandAction() {
  const m = useRestoreBrand();
  return {
    pending: m.isPending,
    restore: (brand: { id: string; name: string; customerId: string }, after?: () => void) =>
      m.mutate({ id: brand.id, customerId: brand.customerId }, {
        onSuccess: () => { toast.success(`${brand.name} restored`); after?.(); },
        onError: (e) => toast.error(errorMessage(e)),
      }),
  };
}
