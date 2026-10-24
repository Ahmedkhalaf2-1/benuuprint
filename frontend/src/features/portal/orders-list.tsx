"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/data-display/pagination";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";

import { useBrands, useOrderList } from "./hooks";
import { CustomerStatus, orderRowCta } from "./status";
import { ORDER_STATUSES, type OrderListItem } from "./types";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";
const SORTS = [{ value: "updated", label: "Recently updated" }, { value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "orderNumber", label: "Order number" }, { value: "targetDate", label: "Target date" }];

export function OrderRow({ o }: { o: OrderListItem }) {
  const { t, fmt } = useI18n();
  return (
    <li>
      <Link href={o.status === "DRAFT" ? `/account/orders/${o.id}/edit` : `/account/orders/${o.id}`} className="block px-4 py-3.5 hover:bg-surface-muted" data-testid="order-row" data-status={o.status}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs font-semibold">{o.orderNumber}</span>
          <span className="min-w-0 flex-1 font-medium">{o.productName ?? t("customer.bulkOrder")}<span className="ms-2 font-normal text-muted-foreground">{o.brand.name}</span></span>
          <span className="text-sm tabular-nums text-muted-foreground">{t("customer.totalquantityUnits", { totalQuantity: o.totalQuantity })}</span>
          <CustomerStatus status={o.status} label={o.statusLabel} />
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{t.text(o.nextStep)}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground"><span className="me-2 font-medium text-brand" data-testid="row-cta">{t.text(orderRowCta(o.status))} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span></span>{o.targetDeliveryDate ? t("customer.targetTargetdeliverydate", { targetDeliveryDate: fmt.date(o.targetDeliveryDate) }) : ""}{t("customer.updatedUpdatedat", { updatedAt: fmt.date(o.updatedAt) })}</span>
      </Link>
    </li>
  );
}

/** My orders: server-filtered, sorted and paged; state lives in the URL. */
export function OrdersList() {
  const { t, fmt } = useI18n();
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
      <div><h1 className="text-2xl font-semibold tracking-tight">{t("customer.myOrders2")}</h1><p className="mt-1 text-muted-foreground">{t("customer.bulkOrdersStartFromAnApproved2")}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onValueChange={(v) => set({ search: v })} placeholder={t("customer.searchByNumberBrandOrProduct")} aria-label={t("customer.searchOrders")} />
        <Select aria-label={t("common.status")} className="w-52" value={status ?? ALL} onValueChange={(v) => set({ status: v === ALL ? undefined : v })} options={[{ value: ALL, label: t("common.allStatuses") }, ...(status?.includes(",") ? [{ value: status, label: t("customer.selectedStatuses") }] : []), ...ORDER_STATUSES.map((s) => ({ value: s, label: fmt.code(s) }))]} />
        {(brands.data?.length ?? 0) > 1 ? <Select aria-label={t("common.brand2")} className="w-44" value={brandId ?? ALL} onValueChange={(v) => set({ brandId: v === ALL ? undefined : v })} options={[{ value: ALL, label: t("customer.allBrands") }, ...(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))]} /> : null}
        <Select aria-label={t("customer.sort")} className="w-48" value={sort} onValueChange={(v) => set({ sort: v })} options={SORTS.map((o) => ({ ...o, label: t.text(o.label) }))} />
        {filtered ? <Button variant="ghost" size="sm" onClick={() => set({ status: undefined, brandId: undefined, search: undefined })}>{t("common.clearFilters")}</Button> : null}
      </div>
      {q.isLoading ? <PageSkeleton /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data && q.data.data.length > 0 ? (
        <Card><ul className="divide-y" data-testid="orders-list">{q.data.data.map((o) => <OrderRow key={o.id} o={o} />)}</ul><Pagination meta={q.data.meta} onPageChange={(p) => set({ page: String(p) })} onPageSizeChange={(n) => set({ pageSize: String(n), page: "1" })} /></Card>
      ) : <EmptyState title={filtered ? t("customer.noMatchingOrders") : t("customer.noOrdersYet")} description={filtered ? t("customer.nothingMatchesYourFilters") : t("customer.onceASampleIsApprovedYou")} action={filtered ? undefined : <Button asChild><Link href="/account/samples?status=APPROVED">{t("customer.viewApprovedSamples")}</Link></Button>} />}
    </div>
  );
}
