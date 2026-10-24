"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Badge } from "@/components/ui/badge";
import { AccessDeniedState, DetailSkeleton, EmptyState, ErrorState } from "@/components/feedback/states";
import { DetailHeader, InfoGrid, InfoItem } from "@/components/layout/detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isApiError } from "@/lib/api/errors";
import { humanizeCode } from "@/lib/utils/format";
import { useProductType, useProductTypeFabrics, useProductTypes } from "./hooks";
import { Compatibility } from "./compatibility";
import { ADMIN_MANAGED, ReferenceListPage } from "./reference-list-page";
import { rowStatus } from "./status";
import { PRODUCT_CATEGORIES, type ProductType } from "./types";
import { useI18n } from "@/i18n/provider";

const dash = <span className="text-muted-foreground">—</span>;

const columns: ColumnDef<ProductType, unknown>[] = [
  { header: "Code", accessorKey: "code", meta: { sortKey: "code" }, cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.code}</span> },
  { header: "Name", accessorKey: "name", meta: { sortKey: "name" }, cell: ({ row }) => <Link href={`/master-data/products/${row.original.id}`} className="font-medium hover:text-brand hover:underline">{row.original.name}</Link> },
  { header: "Category", accessorKey: "category", cell: ({ row }) => (row.original.category ? <Badge variant="outline">{humanizeCode(row.original.category)}</Badge> : dash) },
  { header: "Description", accessorKey: "description", cell: ({ row }) => <span className="block max-w-xs truncate text-muted-foreground">{row.original.description ?? "—"}</span> },
  { header: "Default sample fee", accessorKey: "defaultSampleFee", cell: ({ row }) => (row.original.defaultSampleFee ? <span className="tabular-nums">{row.original.defaultSampleFee}</span> : dash) },
  { header: "Status", id: "status", cell: ({ row }) => <StatusBadge status={rowStatus(row.original)} /> },
];

export function ProductTypesPage() {
  const { t, fmt } = useI18n();
  return (
    <ReferenceListPage
      title={t("masterData.productTypes")}
      description={t("masterData.garmentTypesASampleOrOrder")}
      caption={t("masterData.productTypes")}
      columns={columns}
      useList={useProductTypes}
      emptyTitle={t("masterData.noProductTypesConfigured")}
      filters={[{ param: "category", label: t("masterData.categories"), options: PRODUCT_CATEGORIES.map((c) => ({ value: c, label: fmt.code(c) })) }]}
    />
  );
}

export function ProductTypeDetailPage({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const q = useProductType(id);
  const fabrics = useProductTypeFabrics(id);
  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && q.error.kind === "forbidden") return <AccessDeniedState />;
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title={t("masterData.productTypeNotFound")} error={q.error} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const p = q.data;
  if (!p) return null;
  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: t("masterData.masterData"), href: "/master-data" }, { label: t("masterData.productTypes"), href: "/master-data/products" }, { label: p.code }]}
        reference={p.code}
        title={p.name}
        status={<StatusBadge status={rowStatus(p)} />}
        meta={ADMIN_MANAGED}
      />
      <div className="space-y-4">
        <Card aria-labelledby="pt-details">
          <CardHeader><CardTitle><span id="pt-details">{t("common.details")}</span></CardTitle></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label={t("masterData.category")}>{p.category ? fmt.code(p.category) : null}</InfoItem>
              <InfoItem label={t("masterData.defaultSampleFee")}><span className="tabular-nums">{p.defaultSampleFee}</span></InfoItem>
              <InfoItem label={t("masterData.sortOrder")}>{String(p.sortOrder)}</InfoItem>
              <InfoItem label={t("common.created")}>{fmt.dateTime(p.createdAt)}</InfoItem>
              <InfoItem label={t("common.updated")}>{fmt.dateTime(p.updatedAt)}</InfoItem>
              <InfoItem label={t("common.description")} className="sm:col-span-2 lg:col-span-3">{p.description}</InfoItem>
            </InfoGrid>
          </CardContent>
        </Card>
        <Card aria-labelledby="pt-fabrics">
          <CardHeader><CardTitle><span id="pt-fabrics">{t("masterData.compatibleFabrics")}</span></CardTitle></CardHeader>
          {fabrics.isLoading ? <CardContent><DetailSkeleton /></CardContent> : fabrics.error ? <ErrorState error={fabrics.error} onRetry={() => fabrics.refetch()} className="py-6" /> : fabrics.data && fabrics.data.length > 0 ? (
            <ul className="divide-y">
              {fabrics.data.map((f) => (
                <li key={f.fabricId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                  <Link href={`/master-data/fabrics/${f.fabricId}`} className="font-medium hover:text-brand hover:underline">{f.fabricName}</Link>
                  <span className="font-mono text-xs text-muted-foreground">{f.fabricCode}</span>
                  <Compatibility isRecommended={f.isRecommended} isAllowed={f.isAllowed} />
                  {f.notes ? <span className="text-xs text-muted-foreground">{f.notes}</span> : null}
                </li>
              ))}
            </ul>
          ) : <EmptyState title={t("masterData.noFabricGuidanceConfigured")} description={t("masterData.noFabricIsMarkedRecommendedOr")} className="py-8" />}
        </Card>
      </div>
    </>
  );
}
