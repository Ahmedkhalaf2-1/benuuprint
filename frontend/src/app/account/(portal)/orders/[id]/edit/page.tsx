import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderForm } from "@/features/portal/order-form";

export const metadata: Metadata = { title: "Edit order" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><OrderForm orderId={(await params).id} /></Suspense>;
}
