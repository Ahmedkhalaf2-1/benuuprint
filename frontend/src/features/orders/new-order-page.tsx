"use client";

import { useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, EmptyState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerBrands } from "@/features/brands/hooks";
import { useAuth } from "@/features/auth/auth-provider";
import { CustomerPicker, type PickedCustomer } from "@/features/customers/customer-picker";
import { useProductionSpecs, useSamples } from "@/features/samples/hooks";
import type { ProductionSpec } from "@/features/samples/types";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";

import * as api from "./api";
import { useOrderInvalidation } from "./hooks";
import { PRIORITIES } from "./types";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";

/** The newest APPROVED_REFERENCE of a sample: the only production reference a bulk order may use (never PRE_PRODUCTION). */
export function latestApprovedReference(specs: ProductionSpec[] | undefined): ProductionSpec | null {
  const refs = (specs ?? []).filter((s) => s.kind === "APPROVED_REFERENCE");
  return refs.sort((a, b) => b.revision - a.revision)[0] ?? null;
}

/**
 * Standalone entry to order creation. The backend has no free-form create: an order is always pinned to the APPROVED_REFERENCE of
 * an approved sample (`POST /admin/samples/:id/create-order`). This screen finds the sample by customer/brand, shows the reference
 * that will be pinned, and creates the DRAFT; quantities and variants are entered on the order itself.
 */
export function NewOrderPage() {
  const { t, fmt } = useI18n();
  const { can } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const inv = useOrderInvalidation();
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [brandId, setBrandId] = useState(ALL);
  const [sampleId, setSampleId] = useState(sp.get("sampleId") ?? "");
  const [priority, setPriority] = useState("NORMAL");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const brands = useCustomerBrands(customer?.id, { pageSize: 50, status: "ACTIVE" });
  const samples = useSamples({ status: "APPROVED,COMPLETED", ...(customer ? { customerId: customer.id } : {}), pageSize: 20, sort: "newest" } as never);
  const specs = useProductionSpecs(sampleId, !!sampleId);
  const ref = latestApprovedReference(sampleId ? specs.data : undefined);
  const rows = (samples.data?.data ?? []).filter((s) => brandId === ALL || s.brand.id === brandId);
  const picked = rows.find((s) => s.id === sampleId) ?? (samples.data?.data ?? []).find((s) => s.id === sampleId);

  const create = useMutation({
    mutationFn: () => api.createOrderFromSample(sampleId, { priority, ...(date ? { targetDeliveryDate: new Date(date).toISOString() } : {}), ...(notes.trim() ? { internalNotes: notes.trim() } : {}) }),
    onSuccess: () => inv.lists(),
  });

  if (!can("orders.manage")) return <AccessDeniedState title={t("orders.youCannotCreateOrders")} />;

  return (
    <>
      <PageHeader title={t("orders.newBulkOrder")} breadcrumbs={[{ label: t("orders.orders"), href: "/orders" }, { label: t("common.new") }]} description={t("orders.bulkOrdersAreAlwaysBasedOn")} />
      <div className="max-w-3xl space-y-6">
        {error ? <FormError {...error} /> : null}
        <section aria-labelledby="s1" className="space-y-3 rounded-lg border bg-surface p-4">
          <h2 id="s1" className="text-sm font-semibold">{t("orders.n1ApprovedSample")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="no-customer" label={t("common.customer")}><CustomerPicker id="no-customer" value={customer} onChange={(c) => { setCustomer(c); setBrandId(ALL); setSampleId(""); }} /></FormField>
            <FormField id="no-brand" label={t("common.brand2")}><Select id="no-brand" disabled={!customer} value={brandId} onValueChange={(v) => { setBrandId(v); setSampleId(""); }} options={[{ value: ALL, label: t("orders.allBrands") }, ...(brands.data?.data ?? []).map((b) => ({ value: b.id, label: b.name }))]} /></FormField>
          </div>
          {samples.isLoading ? <Skeleton className="h-24" /> : samples.error ? <ErrorState error={samples.error} onRetry={() => samples.refetch()} /> : rows.length === 0 ? (
            <EmptyState title={t("orders.noApprovedSamples")} description={t("orders.onlyApprovedOrCompletedSamplesCan")} className="py-8" />
          ) : (
            <ul role="listbox" aria-label={t("orders.approvedSamples")} className="divide-y rounded-md border" data-testid="sample-options">
              {rows.map((s) => (
                <li key={s.id} role="option" aria-selected={s.id === sampleId}>
                  <button type="button" onClick={() => setSampleId(s.id)} className={cn("flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2.5 text-start text-sm hover:bg-surface-muted", s.id === sampleId && "bg-brand-soft/40")}>
                    <span className="font-mono text-xs font-semibold">{s.sampleNumber}</span>
                    <span className="min-w-0 flex-1">{s.productType?.name ?? s.customProductName ?? t("orders.customProduct")}<span className="block text-xs text-muted-foreground">{s.customer.displayName} · {s.brand.name}</span></span>
                    <StatusBadge status={s.status} />
                    {s.approvedAt ? <span className="text-xs text-muted-foreground">{t("orders.approvedApprovedat", { approvedAt: fmt.date(s.approvedAt) })}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {sampleId ? (
          <section aria-labelledby="s2" className="space-y-2 rounded-lg border bg-surface p-4" data-testid="reference-card">
            <h2 id="s2" className="flex items-center justify-between text-sm font-semibold">{t("orders.n2ApprovedReference")}{" "}<span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground"><Lock aria-hidden className="size-3" />{" "}{t("orders.frozenReadOnly")}</span></h2>
            {specs.isLoading ? <Skeleton className="h-12" /> : specs.error ? <ErrorState error={specs.error} onRetry={() => specs.refetch()} /> : ref ? (
              <p className="text-sm">{picked?.sampleNumber ?? t("orders.thisSample")}{" "}{t("orders.reference")}{" "}<strong>{t("orders.revisionRevision", { revision: ref.revision })}</strong>{t("orders.frozenCreatedatFingerprint", { createdAt: fmt.date(ref.createdAt) })}{" "}<span className="font-mono text-xs">{ref.specHash.slice(0, 12)}…</span>{t("orders.referencePinnedNote")}</p>
            ) : <p role="alert" className="text-sm text-danger">{t("orders.thisSampleHasNoApprovedReference")}</p>}
          </section>
        ) : null}

        <section aria-labelledby="s3" className="space-y-3 rounded-lg border bg-surface p-4">
          <h2 id="s3" className="text-sm font-semibold">{t("orders.n3OrderDetails")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="no-prio" label={t("common.priority")}><Select id="no-prio" value={priority} onValueChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: fmt.code(p) }))} /></FormField>
            <FormField id="no-date" label={t("orders.targetDeliveryDate")}><DatePicker id="no-date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
          </div>
          <FormField id="no-notes" label={t("common.internalNotes")}><Input id="no-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
        </section>

        <div className="flex gap-2">
          <Button disabled={!sampleId || !ref} loading={create.isPending} onClick={async () => { setError(null); try { const o = await create.mutateAsync(); toast.success(t("orders.ordernumberCreatedAsADraft", { orderNumber: o.orderNumber })); router.push(`/orders/${o.id}?tab=variants`); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); } }}>{t("orders.createDraftOrder")}</Button>
          <Button variant="secondary" onClick={() => router.push("/orders")}>{t("common.cancel")}</Button>
        </div>
      </div>
    </>
  );
}
