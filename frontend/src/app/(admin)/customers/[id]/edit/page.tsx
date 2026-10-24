import { localizedTitle } from "@/i18n/server";
import { RequirePermission } from "@/features/auth/require-permission";
import { CustomerEditPage } from "@/features/customers/customer-edit-page";

export const generateMetadata = () => localizedTitle("Edit customer");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RequirePermission permission="customers.manage"><CustomerEditPage id={(await params).id} /></RequirePermission>;
}
