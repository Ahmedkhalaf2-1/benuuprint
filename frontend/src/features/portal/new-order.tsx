"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { OrderForm } from "./order-form";

/** `/account/orders/new?sample=<id>`: a bulk order always starts from one approved sample. */
export function NewOrder() {
  const sample = useSearchParams().get("sample");
  if (!sample) return <EmptyState title="Choose an approved sample" description="Bulk orders start from an approved sample. Open one of your approved samples and choose “Start bulk order”." action={<Button asChild><Link href="/account/samples?status=APPROVED">View approved samples</Link></Button>} className="py-20" />;
  return <OrderForm sampleId={sample} />;
}
