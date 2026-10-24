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

/** /samples/new[?customerId=…] */
export function NewSamplePage() {
  const customerId = useSearchParams().get("customerId") ?? "";
  const c = useCustomer(customerId);
  const initial = c.data && c.data.status !== "ARCHIVED" ? { id: c.data.id, customerNumber: c.data.customerNumber, displayName: c.data.displayName } : null;
  return (
    <>
      <PageHeader title="New sample" description="Save a draft at any time; it only needs to be complete when you submit it." breadcrumbs={[{ label: "Samples", href: "/samples" }, { label: "New" }]} />
      {customerId && c.isLoading ? <Skeleton className="h-64" /> : <SampleForm initialCustomer={initial} />}
    </>
  );
}

/** /samples/[id]/edit — drafts only (the specification is locked after submission). */
export function EditSamplePage({ id }: { id: string }) {
  const q = useSample(id);
  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const s = q.data;
  if (!s) return null;
  if (s.status !== "DRAFT") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">{s.sampleNumber} can no longer be edited</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only drafts are editable. Use “Request changes” on the sample to return it to draft.</p>
        <Button asChild className="mt-4"><Link href={`/samples/${s.id}`}>Back to sample</Link></Button>
      </div>
    );
  }
  return (
    <>
      <PageHeader title={`Edit ${s.sampleNumber}`} description="Each part (decoration, files, artwork…) saves immediately; the form fields save with “Save draft”." breadcrumbs={[{ label: "Samples", href: "/samples" }, { label: s.sampleNumber, href: `/samples/${s.id}` }, { label: "Edit" }]} />
      <SampleForm sample={s} />
    </>
  );
}
