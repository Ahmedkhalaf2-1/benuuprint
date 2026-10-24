import type { Metadata } from "next";
import { RequirePermission } from "@/features/auth/require-permission";
import { BrandEditPage } from "@/features/brands/brand-edit-page";

export const metadata: Metadata = { title: "Edit brand" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RequirePermission permission="customers.manage"><BrandEditPage id={(await params).id} /></RequirePermission>;
}
