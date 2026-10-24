"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Badge } from "@/components/ui/badge";
import { AccessDeniedState, DetailSkeleton, EmptyState, ErrorState } from "@/components/feedback/states";
import { DetailHeader, InfoGrid, InfoItem } from "@/components/layout/detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isApiError } from "@/lib/api/errors";
import { formatDateTime, humanizeCode } from "@/lib/utils/format";
import { useProductType, useProductTypeFabrics, useProductTypes } from "./hooks";
import { Compatibility } from "./compatibility";
import { ADMIN_MANAGED, ReferenceListPage } from "./reference-list-page";
import { rowStatus } from "./status";
import { PRODUCT_CATEGORIES, type ProductType } from "./types";

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
  return (
    <ReferenceListPage
      title="Product types"
      description="Garment types a sample or order can be made of."
      caption="Product types"
      columns={columns}
      useList={useProductTypes}
      emptyTitle="No product types configured"
      filters={[{ param: "category", label: "Categories", options: PRODUCT_CATEGORIES.map((c) => ({ value: c, label: humanizeCode(c) })) }]}
    />
  );
}

export function ProductTypeDetailPage({ id }: { id: string }) {
  const q = useProductType(id);
  const fabrics = useProductTypeFabrics(id);
  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && q.error.kind === "forbidden") return <AccessDeniedState />;
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title="Product type not found" error={q.error} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const p = q.data;
  if (!p) return null;
  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: "Master data", href: "/master-data" }, { label: "Product types", href: "/master-data/products" }, { label: p.code }]}
        reference={p.code}
        title={p.name}
        status={<StatusBadge status={rowStatus(p)} />}
        meta={ADMIN_MANAGED}
      />
      <div className="space-y-4">
        <Card aria-labelledby="pt-details">
          <CardHeader><CardTitle><span id="pt-details">Details</span></CardTitle></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label="Category">{p.category ? humanizeCode(p.category) : null}</InfoItem>
              <InfoItem label="Default sample fee"><span className="tabular-nums">{p.defaultSampleFee}</span></InfoItem>
              <InfoItem label="Sort order">{String(p.sortOrder)}</InfoItem>
              <InfoItem label="Created">{formatDateTime(p.createdAt)}</InfoItem>
              <InfoItem label="Updated">{formatDateTime(p.updatedAt)}</InfoItem>
              <InfoItem label="Description" className="sm:col-span-2 lg:col-span-3">{p.description}</InfoItem>
            </InfoGrid>
          </CardContent>
        </Card>
        <Card aria-labelledby="pt-fabrics">
          <CardHeader><CardTitle><span id="pt-fabrics">Compatible fabrics</span></CardTitle></CardHeader>
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
          ) : <EmptyState title="No fabric guidance configured" description="No fabric is marked recommended or restricted for this product. Guidance does not block other fabrics." className="py-8" />}
        </Card>
      </div>
    </>
  );
}
