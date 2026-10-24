import type { Metadata } from "next";
import { Suspense } from "react";
import { MyWorkPage } from "@/features/production/my-work-page";

export const metadata: Metadata = { title: "My work" };

export default function Page() {
  return <Suspense fallback={null}><MyWorkPage /></Suspense>;
}
