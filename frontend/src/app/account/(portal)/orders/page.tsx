import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersList } from "@/features/portal/orders-list";

export const metadata: Metadata = { title: "My orders" };

export default function Page() {
  return <Suspense fallback={null}><OrdersList /></Suspense>;
}
