import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { CustomersPage } from "@/features/customers/customers-page";

export const generateMetadata = () => localizedTitle("Customers");

export default function Page() {
  return <Suspense fallback={null}><CustomersPage /></Suspense>;
}
