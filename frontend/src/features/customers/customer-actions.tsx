"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api/errors";
import { useArchiveCustomer, useSetCustomerStatus } from "./hooks";
import { useI18n } from "@/i18n/provider";

export function ArchiveCustomerDialog({
  customer,
  onOpenChange,
  onArchived,
}: {
  customer: { id: string; displayName: string } | null;
  onOpenChange: (open: boolean) => void;
  onArchived?: () => void;
}) {
  const { t } = useI18n();
  const archive = useArchiveCustomer();
  return (
    <ConfirmDialog
      open={!!customer}
      onOpenChange={onOpenChange}
      title={t("customers.archiveV1", { v1: customer?.displayName ?? "customer" })}
      description={t("customers.theCustomerIsHiddenFromLists")}
      confirmLabel={t("customers.archiveCustomer")}
      destructive
      loading={archive.isPending}
      onConfirm={() => {
        if (!customer) return;
        archive.mutate(customer.id, {
          onSuccess: () => {
            toast.success(t("customers.displaynameArchived", { displayName: customer.displayName }));
            onOpenChange(false);
            onArchived?.();
          },
          onError: (e) => {
            toast.error(errorMessage(e));
            onOpenChange(false);
          },
        });
      }}
    />
  );
}

/** Restore = setting a status on an archived customer (there is no dedicated restore route). */
export function useRestoreCustomer() {
  const { t } = useI18n();
  const setStatus = useSetCustomerStatus();
  return {
    pending: setStatus.isPending,
    restore: (customer: { id: string; displayName: string }, after?: () => void) =>
      setStatus.mutate(
        { id: customer.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success(t("customers.displaynameRestored", { displayName: customer.displayName }), { description: t("customers.itsBrandsStayArchivedUntilRestored") });
            after?.();
          },
          onError: (e) => toast.error(errorMessage(e)),
        },
      ),
  };
}
