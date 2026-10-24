"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/data-display/pagination";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { formatDate, humanizeCode } from "@/lib/utils/format";
import { useBrands, useOrderList } from "./hooks";
import { CustomerStatus, orderRowCta } from "./status";
import { ORDER_STATUSES, type OrderListItem } from "./types";

const ALL = "__all";
const SORTS = [{ value: "updated", label: "Recently updated" }, { value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "orderNumber", label: "Order number" }, { value: "targetDate", label: "Target date" }];

export function OrderRow({ o }: { o: OrderListItem }) {
  return (
    <li>
      <Link href={o.status === "DRAFT" ? `/account/orders/${o.id}/edit` : `/account/orders/${o.id}`} className="block px-4 py-3.5 hover:bg-surface-muted" data-testid="order-row" data-status={o.status}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs font-semibold">{o.orderNumber}</span>
          <span className="min-w-0 flex-1 font-medium">{o.productName ?? "Bulk order"}<span className="ms-2 font-normal text-muted-foreground">{o.brand.name}</span></span>
          <span className="text-sm tabular-nums text-muted-foreground">{o.totalQuantity} units</span>
          <CustomerStatus status={o.status} label={o.statusLabel} />
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{o.nextStep}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground"><span className="me-2 font-medium text-brand" data-testid="row-cta">{orderRowCta(o.status)} →</span>{o.targetDeliveryDate ? `Target ${formatDate(o.targetDeliveryDate)} · ` : ""}Updated {formatDate(o.updatedAt)}</span>
      </Link>
    </li>
  );
}

/** My orders: server-filtered, sorted and paged; state lives in the URL. */
export function OrdersList() {
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
  const q = useOrderList({ page, pageSize, status, brandId, search: search || undefined, sort });
  const set = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === undefined || v === "") p.delete(k); else p.set(k, v); }
    if (!("page" in patch)) p.delete("page");
    router.replace(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false });
  };
  const filtered = !!(status || brandId || search);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">My orders</h1><p className="mt-1 text-muted-foreground">Bulk orders start from an approved sample.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onValueChange={(v) => set({ search: v })} placeholder="Search by number, brand or product…" aria-label="Search orders" />
        <Select aria-label="Status" className="w-52" value={status ?? ALL} onValueChange={(v) => set({ status: v === ALL ? undefined : v })} options={[{ value: ALL, label: "All statuses" }, ...(status?.includes(",") ? [{ value: status, label: "Selected statuses" }] : []), ...ORDER_STATUSES.map((s) => ({ value: s, label: humanizeCode(s) }))]} />
        {(brands.data?.length ?? 0) > 1 ? <Select aria-label="Brand" className="w-44" value={brandId ?? ALL} onValueChange={(v) => set({ brandId: v === ALL ? undefined : v })} options={[{ value: ALL, label: "All brands" }, ...(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))]} /> : null}
        <Select aria-label="Sort" className="w-48" value={sort} onValueChange={(v) => set({ sort: v })} options={SORTS} />
        {filtered ? <Button variant="ghost" size="sm" onClick={() => set({ status: undefined, brandId: undefined, search: undefined })}>Clear filters</Button> : null}
      </div>
      {q.isLoading ? <PageSkeleton /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data && q.data.data.length > 0 ? (
        <Card><ul className="divide-y" data-testid="orders-list">{q.data.data.map((o) => <OrderRow key={o.id} o={o} />)}</ul><Pagination meta={q.data.meta} onPageChange={(p) => set({ page: String(p) })} onPageSizeChange={(n) => set({ pageSize: String(n), page: "1" })} /></Card>
      ) : <EmptyState title={filtered ? "No matching orders" : "No orders yet"} description={filtered ? "Nothing matches your filters." : "Once a sample is approved you can start a bulk order from it."} action={filtered ? undefined : <Button asChild><Link href="/account/samples?status=APPROVED">View approved samples</Link></Button>} />}
    </div>
  );
}
