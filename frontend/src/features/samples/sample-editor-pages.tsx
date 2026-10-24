"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AccessDeniedState, DetailSkeleton, ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomer } from "@/features/customers/hooks";
import { isApiError } from "@/lib/api/errors";
import { useSample } from "./hooks";
import { SampleForm } from "./sample-form";
import { useI18n } from "@/i18n/provider";

/** /samples/new[?customerId=…] */
export function NewSamplePage() {
  const { t } = useI18n();
  const customerId = useSearchParams().get("customerId") ?? "";
  const c = useCustomer(customerId);
  const initial = c.data && c.data.status !== "ARCHIVED" ? { id: c.data.id, customerNumber: c.data.customerNumber, displayName: c.data.displayName } : null;
  return (
    <>
      <PageHeader title={t("samples.newSample")} description={t("samples.saveADraftAtAnyTime")} breadcrumbs={[{ label: t("samples.samples"), href: "/samples" }, { label: t("common.new") }]} />
      {customerId && c.isLoading ? <Skeleton className="h-64" /> : <SampleForm initialCustomer={initial} />}
    </>
  );
}

/** /samples/[id]/edit — drafts only (the specification is locked after submission). */
export function EditSamplePage({ id }: { id: string }) {
  const { t } = useI18n();
  const q = useSample(id);
  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const s = q.data;
  if (!s) return null;
  if (s.status !== "DRAFT") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">{t("samples.samplenumberCanNoLongerBeEdited", { sampleNumber: s.sampleNumber })}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("samples.onlyDraftsAreEditableUseRequest")}</p>
        <Button asChild className="mt-4"><Link href={`/samples/${s.id}`}>{t("samples.backToSample")}</Link></Button>
      </div>
    );
  }
  return (
    <>
      <PageHeader title={t("samples.editSamplenumber", { sampleNumber: s.sampleNumber })} description={t("samples.eachPartDecorationFilesArtworkSaves")} breadcrumbs={[{ label: t("samples.samples"), href: "/samples" }, { label: s.sampleNumber, href: `/samples/${s.id}` }, { label: t("common.edit") }]} />
      <SampleForm sample={s} />
    </>
  );
}
