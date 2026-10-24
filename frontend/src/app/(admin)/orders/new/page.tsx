import type { Metadata } from "next";
import { Suspense } from "react";
import { NewOrderPage } from "@/features/orders/new-order-page";

export const metadata: Metadata = { title: "New order" };

export default function Page() {
  return <Suspense fallback={null}><NewOrderPage /></Suspense>;
}
