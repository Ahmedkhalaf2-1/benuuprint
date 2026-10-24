import type { Metadata } from "next";
import { RequirePermission } from "@/features/auth/require-permission";
import { CustomerEditPage } from "@/features/customers/customer-edit-page";

export const metadata: Metadata = { title: "Edit customer" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RequirePermission permission="customers.manage"><CustomerEditPage id={(await params).id} /></RequirePermission>;
}
