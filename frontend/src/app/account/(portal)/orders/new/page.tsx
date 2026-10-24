import { localizedTitle } from "@/i18n/server";
import { Suspense } from "react";
import { NewOrder } from "@/features/portal/new-order";

export const generateMetadata = () => localizedTitle("Start a bulk order");

export default function Page() {
  return <Suspense fallback={null}><NewOrder /></Suspense>;
}
