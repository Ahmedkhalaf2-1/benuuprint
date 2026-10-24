import type { Metadata } from "next";
import { Suspense } from "react";
import { NewOrder } from "@/features/portal/new-order";

export const metadata: Metadata = { title: "Start a bulk order" };

export default function Page() {
  return <Suspense fallback={null}><NewOrder /></Suspense>;
}
