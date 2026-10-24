"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorState, PageSkeleton } from "@/components/feedback/states";
import { ChoiceGroup } from "@/components/forms/choice-group";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { errorMessage, isApiError } from "@/lib/api/errors";
import * as api from "./api";
import { BrandForm } from "./brands";
import { useBrands, useSampleInvalidation } from "./hooks";
import { useI18n } from "@/i18n/provider";

/** Step 0: pick the brand → the draft is created right away (`POST /customer/samples {brandId}`) and the guided form continues on the draft. */
export function NewSample() {
  const { t } = useI18n();
  const router = useRouter();
  const preferred = useSearchParams().get("brandId");
  const brands = useBrands();
  const invalidate = useSampleInvalidation();
  const [brandId, setBrandId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  if (brands.isLoading) return <PageSkeleton />;
  if (brands.error) return <ErrorState error={brands.error} onRetry={() => brands.refetch()} />;
  const list = brands.data ?? [];
  if (list.length === 0) return (
    <div className="mx-auto max-w-xl space-y-6" data-testid="no-brand">
      <div><h1 className="text-2xl font-semibold tracking-tight">{t("customer.createYourBrand")}</h1><p className="mt-1 text-muted-foreground">{t("customer.beforeRequestingASampleAddThe")}</p></div>
      <BrandForm onDone={(b) => setBrandId(b.id)} />
    </div>
  );
  const chosen = brandId || (preferred && list.some((b) => b.id === preferred) ? preferred : list.length === 1 ? list[0]!.id : "");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">{t("customer.requestASample")}</h1><p className="mt-1 text-muted-foreground">{t("customer.tellUsWhatYouWantTo")}</p></div>
      {error ? <FormError {...error} /> : null}
      <ChoiceGroup name="brand" aria-label={t("common.brand2")} value={chosen} onValueChange={setBrandId} columns={1} options={list.map((b) => ({ value: b.id, label: b.name, description: b.brandNumber }))} />
      <Button size="lg" disabled={!chosen} loading={busy} onClick={async () => {
        setBusy(true); setError(null);
        try { const s = await api.createSample({ brandId: chosen }); invalidate(s.id); router.replace(`/account/samples/${s.id}/edit?step=product`); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); setBusy(false); }
      }}>{t("customer.startMyRequest")}</Button>
    </div>
  );
}
