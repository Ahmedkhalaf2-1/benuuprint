"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomer } from "@/features/customers/hooks";
import { BrandForm } from "./brand-form";
import { useI18n } from "@/i18n/provider";

/** /brands/new?customerId=… pre-selects the customer (e.g. from the customer detail page). */
export function BrandNewPage() {
  const { t } = useI18n();
  const customerId = useSearchParams().get("customerId") ?? "";
  const q = useCustomer(customerId);
  const loading = !!customerId && q.isLoading;
  const initial = q.data && q.data.status !== "ARCHIVED" ? { id: q.data.id, customerNumber: q.data.customerNumber, displayName: q.data.displayName } : null;
  return (
    <>
      <PageHeader title={t("brands.newBrand")} breadcrumbs={[{ label: t("brands.brands"), href: customerId ? `/brands?customerId=${customerId}` : "/brands" }, { label: t("common.new") }]} />
      {loading ? <Skeleton className="h-64 max-w-3xl" /> : <BrandForm initialCustomer={initial} />}
    </>
  );
}
