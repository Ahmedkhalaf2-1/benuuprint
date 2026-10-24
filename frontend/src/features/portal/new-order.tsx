"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { OrderForm } from "./order-form";
import { useI18n } from "@/i18n/provider";

/** `/account/orders/new?sample=<id>`: a bulk order always starts from one approved sample. */
export function NewOrder() {
  const { t } = useI18n();
  const sample = useSearchParams().get("sample");
  if (!sample) return <EmptyState title={t("customer.chooseAnApprovedSample")} description={t("customer.bulkOrdersStartFromAnApproved")} action={<Button asChild><Link href="/account/samples?status=APPROVED">{t("customer.viewApprovedSamples")}</Link></Button>} className="py-20" />;
  return <OrderForm sampleId={sample} />;
}
