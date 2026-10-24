import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { RequirePermission } from "@/features/auth/require-permission";
import { BrandNewPage } from "@/features/brands/brand-new-page";

export const generateMetadata = () => localizedTitle("New brand");

export default function Page() {
  return <RequirePermission permission="customers.manage"><Suspense fallback={null}><BrandNewPage /></Suspense></RequirePermission>;
}
