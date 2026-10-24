"use client";

import { AccessDeniedState, DetailSkeleton, ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { isApiError } from "@/lib/api/errors";
import { BrandForm } from "./brand-form";
import { useBrand } from "./hooks";

export function BrandEditPage({ id }: { id: string }) {
  const q = useBrand(id);
  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const b = q.data;
  if (!b) return null;
  return (
    <>
      <PageHeader title={`Edit ${b.name}`} breadcrumbs={[{ label: "Brands", href: `/brands?customerId=${b.customerId}` }, { label: b.brandNumber, href: `/brands/${b.id}` }, { label: "Edit" }]} />
      <BrandForm brand={b} />
    </>
  );
}
