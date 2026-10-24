import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { OrdersList } from "@/features/portal/orders-list";

export const generateMetadata = () => localizedTitle("My orders");

export default function Page() {
  return <Suspense fallback={null}><OrdersList /></Suspense>;
}
