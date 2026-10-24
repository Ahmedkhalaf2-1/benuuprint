import type { Metadata } from "next";
import { RequirePermission } from "@/features/auth/require-permission";
import { EditSamplePage } from "@/features/samples/sample-editor-pages";

export const metadata: Metadata = { title: "Edit sample" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RequirePermission permission="samples.manage"><EditSamplePage id={(await params).id} /></RequirePermission>;
}
