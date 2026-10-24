"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api/errors";
import { useArchiveCustomer, useSetCustomerStatus } from "./hooks";

export function ArchiveCustomerDialog({
  customer,
  onOpenChange,
  onArchived,
}: {
  customer: { id: string; displayName: string } | null;
  onOpenChange: (open: boolean) => void;
  onArchived?: () => void;
}) {
  const archive = useArchiveCustomer();
  return (
    <ConfirmDialog
      open={!!customer}
      onOpenChange={onOpenChange}
      title={`Archive ${customer?.displayName ?? "customer"}?`}
      description="The customer is hidden from lists and can no longer be edited or receive new brands. Its live brands are archived too; after restoring the customer, each brand must be restored individually. Nothing is deleted."
      confirmLabel="Archive customer"
      destructive
      loading={archive.isPending}
      onConfirm={() => {
        if (!customer) return;
        archive.mutate(customer.id, {
          onSuccess: () => {
            toast.success(`${customer.displayName} archived`);
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
  const setStatus = useSetCustomerStatus();
  return {
    pending: setStatus.isPending,
    restore: (customer: { id: string; displayName: string }, after?: () => void) =>
      setStatus.mutate(
        { id: customer.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success(`${customer.displayName} restored`, { description: "Its brands stay archived until restored individually." });
            after?.();
          },
          onError: (e) => toast.error(errorMessage(e)),
        },
      ),
  };
}
