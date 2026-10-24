"use client";

import { getActive } from "@/i18n/active";
import { tx } from "@/lib/utils/format";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ColorSwatch } from "@/components/data-display/color-swatch";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, DetailSkeleton, EmptyState, ErrorState } from "@/components/feedback/states";
import { DetailHeader, InfoGrid, InfoItem } from "@/components/layout/detail";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { isApiError } from "@/lib/api/errors";

import { Compatibility } from "./compatibility";
import { useFabric, useFabricColors, useFabrics } from "./hooks";
import { ADMIN_MANAGED, ReferenceListPage } from "./reference-list-page";
import { rowStatus } from "./status";
import type { Fabric } from "./types";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";

const dash = <span className="text-muted-foreground">—</span>;

export function gsmText(f: Pick<Fabric, "minGsm" | "maxGsm" | "defaultGsm">): string | null {
  const { minGsm: min, maxGsm: max, defaultGsm: d } = f;
  const range = min != null && max != null ? `${min}–${max}` : min != null ? getActive().t("masterData.rangeFrom", { n: min }) : max != null ? getActive().t("masterData.rangeUpTo", { n: max }) : null;
  if (range && d != null) return getActive().t("masterData.rangeWithDefault", { range, d });
  return range ?? (d != null ? `${d}` : null);
}

const columns: ColumnDef<Fabric, unknown>[] = [
  { header: "Reference", accessorKey: "referenceNumber", cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.referenceNumber}</span> },
  { header: "Code", accessorKey: "code", meta: { sortKey: "code" }, cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
  { header: "Name", accessorKey: "name", meta: { sortKey: "name" }, cell: ({ row }) => <Link href={`/master-data/fabrics/${row.original.id}`} className="font-medium hover:text-brand hover:underline">{row.original.name}</Link> },
  { header: "Composition", accessorKey: "composition", cell: ({ row }) => row.original.composition ?? dash },
  { header: "GSM", id: "gsm", cell: ({ row }) => gsmText(row.original) ?? dash },
  {
    header: "Colours", id: "colors",
    cell: ({ row }) => {
      const c = row.original.colors;
      if (c.length === 0) return <span className="text-muted-foreground">{tx("None")}</span>;
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="flex -space-x-1">{c.slice(0, 5).map((x) => <ColorSwatch key={x.id} name={x.name} hex={x.hex} size="sm" showLabel={false} className="ring-2 ring-surface" />)}</span>
          <span className="text-xs text-muted-foreground">{c.length}</span>
        </span>
      );
    },
  },
  { header: "Products", id: "products", cell: ({ row }) => (row.original.productTypes.length ? `${row.original.productTypes.length} ${tx("with guidance")}` : <span className="text-muted-foreground">{tx("No guidance")}</span>) },
  { header: "Status", id: "status", cell: ({ row }) => <StatusBadge status={rowStatus(row.original)} /> },
];

export function FabricsPage() {
  const { t } = useI18n();
  return (
    <ReferenceListPage
      title={t("masterData.fabrics")}
      description={t("masterData.fabricsWithTheirColoursAndProduct")}
      caption={t("masterData.fabrics")}
      columns={columns}
      useList={useFabrics}
      emptyTitle={t("masterData.noFabricsConfigured")}
    />
  );
}

export function FabricDetailPage({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const q = useFabric(id);
  const [showArchived, setShowArchived] = useState(false);
  const colors = useFabricColors(id, showArchived);
  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && q.error.kind === "forbidden") return <AccessDeniedState />;
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title={t("masterData.fabricNotFound")} error={q.error} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const f = q.data;
  if (!f) return null;
  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: t("masterData.masterData"), href: "/master-data" }, { label: t("masterData.fabrics"), href: "/master-data/fabrics" }, { label: f.referenceNumber }]}
        reference={f.referenceNumber}
        title={f.name}
        status={<StatusBadge status={rowStatus(f)} />}
        meta={ADMIN_MANAGED}
      />
      <div className="space-y-4">
        <Card aria-labelledby="fab-props">
          <CardHeader><CardTitle><span id="fab-props">{t("masterData.properties")}</span></CardTitle></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label={t("masterData.code")}><span className="font-mono">{f.code}</span></InfoItem>
              <InfoItem label={t("masterData.composition")}>{f.composition}</InfoItem>
              <InfoItem label="GSM">{gsmText(f)}</InfoItem>
              <InfoItem label={t("masterData.unit")}>{f.unit}</InfoItem>
              <InfoItem label={t("common.created")}>{fmt.dateTime(f.createdAt)}</InfoItem>
              <InfoItem label={t("common.updated")}>{fmt.dateTime(f.updatedAt)}</InfoItem>
              <InfoItem label={t("common.description")} className="sm:col-span-2 lg:col-span-3">{f.description}</InfoItem>
              <InfoItem label={t("common.notes")} className="sm:col-span-2 lg:col-span-3">{f.notes ? <span className="whitespace-pre-wrap">{f.notes}</span> : null}</InfoItem>
            </InfoGrid>
          </CardContent>
        </Card>

        <Card aria-labelledby="fab-colors">
          <CardHeader>
            <CardTitle><span id="fab-colors">{t("masterData.colours")}</span></CardTitle>
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={showArchived} onCheckedChange={setShowArchived} aria-label={t("masterData.showArchivedColours")} />{" "}{t("masterData.showArchived")}</label>
          </CardHeader>
          {colors.isLoading ? <CardContent><DetailSkeleton /></CardContent> : colors.error ? <ErrorState error={colors.error} onRetry={() => colors.refetch()} className="py-6" /> : colors.data && colors.data.length > 0 ? (
            <ul className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3" data-testid="fabric-colors">
              {colors.data.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 bg-surface px-4 py-3">
                  <ColorSwatch name={c.name} hex={c.hex} pantone={c.pantone} code={c.internalCode} size="lg" muted={!c.isAvailable || !!c.archivedAt} />
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {c.archivedAt ? <StatusBadge status="ARCHIVED" /> : !c.isActive ? <StatusBadge status="INACTIVE" /> : null}
                    {!c.isAvailable && !c.archivedAt ? <Badge variant="outline">{t("masterData.unavailable")}</Badge> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : <EmptyState title={t("masterData.noColoursConfigured")} description={ADMIN_MANAGED} className="py-8" />}
        </Card>

        <Card aria-labelledby="fab-compat">
          <CardHeader><CardTitle><span id="fab-compat">{t("masterData.productCompatibility")}</span></CardTitle></CardHeader>
          {f.productTypes.length > 0 ? (
            <>
              <ul className="divide-y">
                {f.productTypes.map((p) => (
                  <li key={p.productTypeId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                    <Link href={`/master-data/products/${p.productTypeId}`} className="font-medium hover:text-brand hover:underline">{p.name}</Link>
                    <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                    <Compatibility isRecommended={p.isRecommended} isAllowed={p.isAllowed} />
                    {p.notes ? <span className="text-xs text-muted-foreground">{p.notes}</span> : null}
                  </li>
                ))}
              </ul>
              <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">{t("masterData.productTypesNotListedHaveNo")}</p>
            </>
          ) : <EmptyState title={t("masterData.noProductGuidance")} description={t("masterData.noProductTypeIsMarkedRecommended")} className="py-8" />}
        </Card>
      </div>
    </>
  );
}
