"use client";

import { AccessDeniedState, DetailSkeleton, ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { isApiError } from "@/lib/api/errors";
import { CustomerForm } from "./customer-form";
import { useCustomer } from "./hooks";
import { useI18n } from "@/i18n/provider";

export function CustomerEditPage({ id }: { id: string }) {
  const { t } = useI18n();
  const q = useCustomer(id);
  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data;
  if (!c) return null;
  if (c.status === "ARCHIVED") return <ErrorState title={t("customers.archivedCustomersCannotBeEdited")} error={new Error("Restore the customer first.")} className="py-20" />;
  return (
    <>
      <PageHeader title={t("customers.editDisplayname", { displayName: c.displayName })} breadcrumbs={[{ label: t("customers.customers"), href: "/customers" }, { label: c.customerNumber, href: `/customers/${c.id}` }, { label: t("common.edit") }]} />
      <CustomerForm customer={c} />
    </>
  );
}
