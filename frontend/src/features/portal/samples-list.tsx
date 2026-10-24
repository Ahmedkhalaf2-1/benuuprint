"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/data-display/pagination";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { humanizeCode } from "@/lib/utils/format";
import { SampleRow } from "./dashboard";
import { useBrands, useSampleList } from "./hooks";
import { CUSTOMER_STATUSES } from "./types";

const ALL = "__all";

/** My samples: the signed-in customer's own requests (GET /customer/samples), filtered/sorted/paged by the server, state in the URL. */
export function SamplesList() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Number(sp.get("pageSize")) || 10;
  const status = sp.get("status") ?? undefined;
  const brandId = sp.get("brandId") ?? undefined;
  const search = sp.get("search") ?? "";
  const sort = sp.get("sort") ?? "updated";
  const brands = useBrands();
  const q = useSampleList({ page, pageSize, status, brandId, search: search || undefined, sort });
  const set = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === undefined || v === "") p.delete(k); else p.set(k, v); }
    if (!("page" in patch)) p.delete("page");
    router.replace(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false });
  };
  const filtered = !!(status || brandId || search);
  const noBrand = brands.isSuccess && (brands.data?.length ?? 0) === 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">My samples</h1><p className="mt-1 text-muted-foreground">Every request you have made, newest activity first.</p></div>{noBrand ? null : <Button asChild><Link href="/account/samples/new">Request a sample</Link></Button>}</div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onValueChange={(v) => set({ search: v })} placeholder="Search by number, brand or product…" aria-label="Search samples" />
        <Select aria-label="Status" className="w-52" value={status ?? ALL} onValueChange={(v) => set({ status: v === ALL ? undefined : v })} options={[{ value: ALL, label: "All statuses" }, ...CUSTOMER_STATUSES.map((s) => ({ value: s, label: humanizeCode(s) }))]} />
        {(brands.data?.length ?? 0) > 1 ? <Select aria-label="Brand" className="w-44" value={brandId ?? ALL} onValueChange={(v) => set({ brandId: v === ALL ? undefined : v })} options={[{ value: ALL, label: "All brands" }, ...(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))]} /> : null}
        {filtered ? <Button variant="ghost" size="sm" onClick={() => set({ status: undefined, brandId: undefined, search: undefined })}>Clear filters</Button> : null}
      </div>
      {q.isLoading ? <PageSkeleton /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data && q.data.data.length > 0 ? (
        <Card><ul className="divide-y" data-testid="samples-list">{q.data.data.map((s) => <SampleRow key={s.id} s={s} />)}</ul><Pagination meta={q.data.meta} onPageChange={(p) => set({ page: String(p) })} onPageSizeChange={(n) => set({ pageSize: String(n), page: "1" })} /></Card>
      ) : <EmptyState title={filtered ? "No matching samples" : "No samples yet"} description={filtered ? "Nothing matches your filters." : noBrand ? "Create your brand first, then start your first sample request." : "Request your first sample — tell us what you want to make."} action={filtered ? undefined : noBrand ? <Button asChild><Link href="/account">Create brand</Link></Button> : <Button asChild><Link href="/account/samples/new">Request your first sample</Link></Button>} />}
    </div>
  );
}
