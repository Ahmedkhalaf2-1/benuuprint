import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/features/auth/require-permission";
import { NewSamplePage } from "@/features/samples/sample-editor-pages";

export const metadata: Metadata = { title: "New sample" };

export default function Page() {
  return <RequirePermission permission="samples.manage"><Suspense fallback={null}><NewSamplePage /></Suspense></RequirePermission>;
}
