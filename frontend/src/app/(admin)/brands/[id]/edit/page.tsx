import { localizedTitle } from "@/i18n/server";
import { RequirePermission } from "@/features/auth/require-permission";
import { BrandEditPage } from "@/features/brands/brand-edit-page";

export const generateMetadata = () => localizedTitle("Edit brand");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RequirePermission permission="customers.manage"><BrandEditPage id={(await params).id} /></RequirePermission>;
}
