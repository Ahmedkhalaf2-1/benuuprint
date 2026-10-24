import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/features/auth/require-permission";
import { CustomerForm } from "@/features/customers/customer-form";

export const metadata: Metadata = { title: "New customer" };

export default function Page() {
  return (
    <RequirePermission permission="customers.manage">
      <PageHeader title="New customer" breadcrumbs={[{ label: "Customers", href: "/customers" }, { label: "New" }]} />
      <CustomerForm />
    </RequirePermission>
  );
}
