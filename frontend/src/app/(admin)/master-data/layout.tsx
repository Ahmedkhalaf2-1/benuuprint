import type { ReactNode } from "react";
import { MasterNav } from "@/features/master-data/master-nav";

export default function MasterDataLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MasterNav />
      {children}
    </>
  );
}
