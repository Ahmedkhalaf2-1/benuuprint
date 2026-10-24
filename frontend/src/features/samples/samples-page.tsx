"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Label } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-provider";
import { CustomerPicker } from "@/features/customers/customer-picker";
import { useCustomer } from "@/features/customers/hooks";
import { useConfiguratorOptions } from "@/features/master-data/hooks";
import { useListParams } from "@/hooks/use-list-params";

import { useSamples } from "./hooks";
import { productLabel } from "./labels";
import { PAYMENT_STATES, SAMPLE_STATUSES, type SampleListItem } from "./types";
import { useI18n } from "@/i18n/provider";

const ALL = "__all";
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "submitted", label: "Recently submitted" },
  { value: "sampleNumber", label: "Sample number" },
];
const APPROVAL_STATES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED"];
const dash = <span className="text-muted-foreground">—</span>;

/** Filters the backend can execute (verified against GET /admin/samples). Everything lives in the URL. */
const FILTER_KEYS = ["status", "customerId", "productTypeId", "fabricId", "paymentState", "approvalState", "unassigned", "assignedSalesUserId", "createdFrom", "createdTo", "submittedFrom", "submittedTo", "includeArchived"] as const;

export function SamplesPage() {
  const { t, fmt } = useI18n();
  const { can, user } = useAuth();
  const canManage = can("samples.manage");
  // GET /admin/samples has a single `sort` enum: sending a direction is a 400, so the hook omits it.
  const { params, update, toQuery } = useListParams({ sort: "newest", sortParam: "sort", directionParam: null, pageSize: 20 });
  const f = params.filters;
  const [drawer, setDrawer] = useState(false);
  const config = useConfiguratorOptions();
  const customer = useCustomer(f.customerId ?? "");

  const query = useMemo(() => ({ ...(toQuery as Record<string, string | number | undefined>), includeArchived: f.includeArchived === "true" || undefined }), [toQuery, f.includeArchived]);
  const q = useSamples(query);
  const activeCount = (params.search ? 1 : 0) + FILTER_KEYS.filter((k) => f[k]).length;
  const reset = () => update({ search: "", filters: Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])) });
  const setF = (k: (typeof FILTER_KEYS)[number], v: string | undefined) => update({ filters: { [k]: v === ALL || v === "" ? undefined : v } });
  const statuses = f.status ? f.status.split(",") : [];

  const columns = useMemo<ColumnDef<SampleListItem, unknown>[]>(
    () => [
      { header: t("common.sample"), accessorKey: "sampleNumber", cell: ({ row }) => <Link href={`/samples/${row.original.id}`} className="font-mono text-xs font-semibold hover:text-brand hover:underline">{row.original.sampleNumber}{row.original.revisionNumber > 1 ? ` · r${row.original.revisionNumber}` : ""}</Link> },
      { header: t("common.customer"), id: "customer", cell: ({ row }) => <Link href={`/customers/${row.original.customer.id}`} className="hover:text-brand hover:underline">{row.original.customer.displayName}</Link> },
      { header: t("common.brand2"), id: "brand", cell: ({ row }) => row.original.brand.name },
      { header: t("common.product"), id: "product", cell: ({ row }) => productLabel(row.original) ?? dash },
      { header: t("samples.fabric"), id: "fabric", cell: ({ row }) => row.original.fabric?.name ?? (row.original.customFabricName ? `${row.original.customFabricName} (custom)` : dash) },
      { header: t("common.status"), accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: t("samples.payment"), accessorKey: "paymentState", cell: ({ row }) => <StatusBadge status={row.original.paymentState} /> },
      { header: t("samples.sales"), id: "sales", cell: ({ row }) => row.original.assignedSales?.name ?? <span className="text-muted-foreground">{t("common.unassigned")}</span> },
      { header: t("samples.submitted"), accessorKey: "submittedAt", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.submittedAt ? fmt.date(row.original.submittedAt) : "—"}</span> },
      { header: t("common.updated"), accessorKey: "updatedAt", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{fmt.date(row.original.updatedAt)}</span> },
    ],
    [t, fmt],
  );

  const productOptions = [{ value: ALL, label: t("samples.allProducts") }, ...(config.data?.productTypes ?? []).map((p) => ({ value: p.id, label: p.name }))];
  const fabricOptions = [{ value: ALL, label: t("samples.allFabrics") }, ...(config.data?.fabrics ?? []).map((p) => ({ value: p.id, label: p.name }))];

  return (
    <>
      <PageHeader
        title={t("samples.samples")}
        description={t("samples.sampleRequestsFromDraftToApproval")}
        actions={canManage ? <Button asChild><Link href="/samples/new"><Plus />{" "}{t("samples.newSample")}</Link></Button> : null}
      />
      <DataTable
        caption={t("samples.samples")}
        columns={columns}
        result={q.data}
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(pageSize) => update({ pageSize })}
        rowKey={(s) => s.id}
        toolbar={
          <TableToolbar
            search={params.search}
            onSearchChange={(search) => update({ search })}
            searchPlaceholder={t("samples.searchNumberCustomerBrandEmailPhone")}
            filters={
              <div role="group" aria-label={t("common.filters")} className="flex flex-wrap items-center gap-2">
                <MultiSelect aria-label={t("common.status")} className="w-48" placeholder={t("common.allStatuses")} value={statuses} onValueChange={(v) => setF("status", v.join(",") || undefined)} options={SAMPLE_STATUSES.map((s) => ({ value: s, label: fmt.code(s) }))} />
                <Select aria-label={t("common.sortBy")} className="w-48" value={params.sort || "newest"} onValueChange={(sort) => update({ sort })} options={SORTS} />
                <Button variant="secondary" onClick={() => setDrawer(true)}><SlidersHorizontal />{" "}{t("samples.moreFilters")}{activeCount > 0 ? ` (${activeCount})` : ""}</Button>
                {activeCount > 0 ? <Button variant="ghost" size="sm" onClick={reset}><X />{" "}{t("common.clear")}</Button> : null}
              </div>
            }
          />
        }
        empty={
          activeCount === 0 ? (
            <EmptyState title={t("samples.noSamplesYet")} description={canManage ? t("samples.createTheFirstSampleRequest") : t("samples.noSamplesHaveBeenCreatedYet")} action={canManage ? <Button asChild size="sm"><Link href="/samples/new"><Plus />{" "}{t("samples.newSample")}</Link></Button> : undefined} />
          ) : (
            <EmptyState title={t("samples.noMatchingSamples")} description={t("common.nothingMatchesTheCurrentSearchAnd")} action={<Button variant="secondary" size="sm" onClick={reset}>{t("common.clearFilters")}</Button>} />
          )
        }
        rowActions={(s) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><IconButton size="sm" label={t("samples.actionsForSamplenumber", { sampleNumber: s.sampleNumber })} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild><Link href={`/samples/${s.id}`}>{t("common.view")}</Link></DropdownMenuItem>
              {canManage && s.status === "DRAFT" ? <DropdownMenuItem asChild><Link href={`/samples/${s.id}/edit`}>{t("samples.editDraft")}</Link></DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <Drawer open={drawer} onOpenChange={setDrawer} title={t("samples.filterSamples")} side="end">
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="f-customer">{t("common.customer")}</Label>
            <CustomerPicker id="f-customer" value={customer.data ? { id: customer.data.id, customerNumber: customer.data.customerNumber, displayName: customer.data.displayName } : null} onChange={(c) => setF("customerId", c.id)} />
            {f.customerId ? <Button variant="link" onClick={() => setF("customerId", undefined)}>{t("samples.removeCustomerFilter")}</Button> : null}
          </div>
          <div className="space-y-1.5"><Label htmlFor="f-product">{t("common.productType")}</Label><Select id="f-product" value={f.productTypeId ?? ALL} onValueChange={(v) => setF("productTypeId", v)} options={productOptions} /></div>
          <div className="space-y-1.5"><Label htmlFor="f-fabric">{t("samples.fabric")}</Label><Select id="f-fabric" value={f.fabricId ?? ALL} onValueChange={(v) => setF("fabricId", v)} options={fabricOptions} /></div>
          <div className="space-y-1.5"><Label htmlFor="f-pay">{t("samples.paymentState")}</Label><Select id="f-pay" value={f.paymentState ?? ALL} onValueChange={(v) => setF("paymentState", v)} options={[{ value: ALL, label: t("samples.any") }, ...PAYMENT_STATES.map((s) => ({ value: s, label: fmt.code(s) }))]} /></div>
          <div className="space-y-1.5"><Label htmlFor="f-appr">{t("samples.hasAnApprovalRequestThatIs")}</Label><Select id="f-appr" value={f.approvalState ?? ALL} onValueChange={(v) => setF("approvalState", v)} options={[{ value: ALL, label: t("samples.any") }, ...APPROVAL_STATES.map((s) => ({ value: s, label: fmt.code(s) }))]} /></div>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="f-unassigned">{t("samples.unassignedNoSalesOwner")}</Label><Switch id="f-unassigned" checked={f.unassigned === "true"} onCheckedChange={(c) => update({ filters: { unassigned: c ? "true" : undefined, assignedSalesUserId: c ? undefined : f.assignedSalesUserId } })} /></div>
          {user ? <div className="flex items-center justify-between gap-3"><Label htmlFor="f-mine">{t("common.assignedToMe")}</Label><Switch id="f-mine" checked={f.assignedSalesUserId === user.id} onCheckedChange={(c) => update({ filters: { assignedSalesUserId: c ? user.id : undefined, unassigned: c ? undefined : f.unassigned } })} /></div> : null}
          <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-1.5 text-[0.8125rem] font-medium">{t("common.created")}</legend>
            <div><Label htmlFor="f-cf" className="text-xs text-muted-foreground">{t("common.from")}</Label><DatePicker id="f-cf" value={f.createdFrom ?? ""} onChange={(e) => setF("createdFrom", e.target.value)} /></div>
            <div><Label htmlFor="f-ct" className="text-xs text-muted-foreground">{t("common.to")}</Label><DatePicker id="f-ct" value={f.createdTo ?? ""} onChange={(e) => setF("createdTo", e.target.value)} /></div>
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-1.5 text-[0.8125rem] font-medium">{t("samples.submitted")}</legend>
            <div><Label htmlFor="f-sf" className="text-xs text-muted-foreground">{t("common.from")}</Label><DatePicker id="f-sf" value={f.submittedFrom ?? ""} onChange={(e) => setF("submittedFrom", e.target.value)} /></div>
            <div><Label htmlFor="f-st" className="text-xs text-muted-foreground">{t("common.to")}</Label><DatePicker id="f-st" value={f.submittedTo ?? ""} onChange={(e) => setF("submittedTo", e.target.value)} /></div>
          </fieldset>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="f-arch">{t("common.includeArchived")}</Label><Switch id="f-arch" checked={f.includeArchived === "true"} onCheckedChange={(c) => setF("includeArchived", c ? "true" : undefined)} /></div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => setDrawer(false)}>{t("samples.showResults")}</Button><Button variant="secondary" onClick={reset}>{t("samples.clearAll")}</Button></div>
        </div>
      </Drawer>
    </>
  );
}
