import type { Metadata } from "next";
import { NewSample } from "@/features/portal/new-sample";

export const metadata: Metadata = { title: "Request a sample" };

export default function Page() {
  return <NewSample />;
}
