"use client";

import { AccessDeniedState, DetailSkeleton, ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { isApiError } from "@/lib/api/errors";
import { CustomerForm } from "./customer-form";
import { useCustomer } from "./hooks";

export function CustomerEditPage({ id }: { id: string }) {
  const q = useCustomer(id);
  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data;
  if (!c) return null;
  if (c.status === "ARCHIVED") return <ErrorState title="Archived customers cannot be edited" error={new Error("Restore the customer first.")} className="py-20" />;
  return (
    <>
      <PageHeader title={`Edit ${c.displayName}`} breadcrumbs={[{ label: "Customers", href: "/customers" }, { label: c.customerNumber, href: `/customers/${c.id}` }, { label: "Edit" }]} />
      <CustomerForm customer={c} />
    </>
  );
}
