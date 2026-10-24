import type { Metadata } from "next";
import { PatternDetailPage } from "@/features/master-data/patterns";

export const metadata: Metadata = { title: "Pattern" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PatternDetailPage id={(await params).id} />;
}
