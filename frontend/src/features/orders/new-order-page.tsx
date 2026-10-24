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
import { formatDate, humanizeCode } from "@/lib/utils/format";
import * as api from "./api";
import { useOrderInvalidation } from "./hooks";
import { PRIORITIES } from "./types";

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

  if (!can("orders.manage")) return <AccessDeniedState title="You cannot create orders" />;

  return (
    <>
      <PageHeader title="New bulk order" breadcrumbs={[{ label: "Orders", href: "/orders" }, { label: "New" }]} description="Bulk orders are always based on an approved reference. Pick the approved sample; quantities and variants come next." />
      <div className="max-w-3xl space-y-6">
        {error ? <FormError {...error} /> : null}
        <section aria-labelledby="s1" className="space-y-3 rounded-lg border bg-surface p-4">
          <h2 id="s1" className="text-sm font-semibold">1. Approved sample</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="no-customer" label="Customer"><CustomerPicker id="no-customer" value={customer} onChange={(c) => { setCustomer(c); setBrandId(ALL); setSampleId(""); }} /></FormField>
            <FormField id="no-brand" label="Brand"><Select id="no-brand" disabled={!customer} value={brandId} onValueChange={(v) => { setBrandId(v); setSampleId(""); }} options={[{ value: ALL, label: "All brands" }, ...(brands.data?.data ?? []).map((b) => ({ value: b.id, label: b.name }))]} /></FormField>
          </div>
          {samples.isLoading ? <Skeleton className="h-24" /> : samples.error ? <ErrorState error={samples.error} onRetry={() => samples.refetch()} /> : rows.length === 0 ? (
            <EmptyState title="No approved samples" description="Only approved (or completed) samples can start a bulk order. Approve the sample first." className="py-8" />
          ) : (
            <ul role="listbox" aria-label="Approved samples" className="divide-y rounded-md border" data-testid="sample-options">
              {rows.map((s) => (
                <li key={s.id} role="option" aria-selected={s.id === sampleId}>
                  <button type="button" onClick={() => setSampleId(s.id)} className={cn("flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2.5 text-start text-sm hover:bg-surface-muted", s.id === sampleId && "bg-brand-soft/40")}>
                    <span className="font-mono text-xs font-semibold">{s.sampleNumber}</span>
                    <span className="min-w-0 flex-1">{s.productType?.name ?? s.customProductName ?? "Custom product"}<span className="block text-xs text-muted-foreground">{s.customer.displayName} · {s.brand.name}</span></span>
                    <StatusBadge status={s.status} />
                    {s.approvedAt ? <span className="text-xs text-muted-foreground">approved {formatDate(s.approvedAt)}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {sampleId ? (
          <section aria-labelledby="s2" className="space-y-2 rounded-lg border bg-surface p-4" data-testid="reference-card">
            <h2 id="s2" className="flex items-center justify-between text-sm font-semibold">2. Approved reference <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground"><Lock aria-hidden className="size-3" /> Frozen — read only</span></h2>
            {specs.isLoading ? <Skeleton className="h-12" /> : specs.error ? <ErrorState error={specs.error} onRetry={() => specs.refetch()} /> : ref ? (
              <p className="text-sm">{picked?.sampleNumber ?? "This sample"} · reference <strong>revision {ref.revision}</strong>, frozen {formatDate(ref.createdAt)}, fingerprint <span className="font-mono text-xs">{ref.specHash.slice(0, 12)}…</span>. The order will be pinned to it; the pre-production specification is never used for bulk production.</p>
            ) : <p role="alert" className="text-sm text-danger">This sample has no approved reference, so it cannot start a bulk order.</p>}
          </section>
        ) : null}

        <section aria-labelledby="s3" className="space-y-3 rounded-lg border bg-surface p-4">
          <h2 id="s3" className="text-sm font-semibold">3. Order details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="no-prio" label="Priority"><Select id="no-prio" value={priority} onValueChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: humanizeCode(p) }))} /></FormField>
            <FormField id="no-date" label="Target delivery date"><DatePicker id="no-date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
          </div>
          <FormField id="no-notes" label="Internal notes"><Input id="no-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
        </section>

        <div className="flex gap-2">
          <Button disabled={!sampleId || !ref} loading={create.isPending} onClick={async () => { setError(null); try { const o = await create.mutateAsync(); toast.success(`${o.orderNumber} created as a draft`); router.push(`/orders/${o.id}?tab=variants`); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); } }}>Create draft order</Button>
          <Button variant="secondary" onClick={() => router.push("/orders")}>Cancel</Button>
        </div>
      </div>
    </>
  );
}
