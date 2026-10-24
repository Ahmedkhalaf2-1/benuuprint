"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Download, FileCheck2, FileWarning, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, DetailSkeleton, EmptyState, ErrorState } from "@/components/feedback/states";
import { DetailHeader, InfoGrid, InfoItem } from "@/components/layout/detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { formatDate, tx } from "@/lib/utils/format";
import * as api from "./api";
import { useProductTypes, usePattern, usePatterns, usePatternVersionAssets } from "./hooks";
import { ADMIN_MANAGED, ReferenceListPage } from "./reference-list-page";
import type { Asset, Pattern, PatternVersion } from "./types";
import { useI18n } from "@/i18n/provider";

const dash = <span className="text-muted-foreground">—</span>;

const columns: ColumnDef<Pattern, unknown>[] = [
  { header: "Reference", accessorKey: "referenceNumber", cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.referenceNumber}</span> },
  { header: "Code", accessorKey: "code", cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
  { header: "Name", accessorKey: "name", cell: ({ row }) => <Link href={`/master-data/patterns/${row.original.id}`} className="font-medium hover:text-brand hover:underline">{row.original.name}</Link> },
  { header: "Product type", id: "productType", cell: ({ row }) => row.original.productType.name },
  { header: "Fit", accessorKey: "fitType", cell: ({ row }) => row.original.fitType ?? dash },
  { header: "Approved version", id: "current", cell: ({ row }) => (row.original.currentVersionNumber != null ? `v${row.original.currentVersionNumber}` : <span className="text-muted-foreground">{tx("None approved")}</span>) },
  { header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { header: "Updated", accessorKey: "updatedAt", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.updatedAt)}</span> },
];

export function PatternsPage() {
  const { t } = useI18n();
  const types = useProductTypes({ pageSize: 100, sortBy: "name", sortOrder: "asc" });
  return (
    <ReferenceListPage
      title={t("masterData.patterns")}
      description={t("masterData.reusablePatternIdentitiesAndTheirVersioned")}
      caption={t("masterData.patterns")}
      columns={columns}
      useList={usePatterns}
      activeFilter={false}
      sortable={false}
      searchPlaceholder={t("masterData.searchReferenceCodeOrName")}
      emptyTitle={t("masterData.noPatternsAvailable")}
      filters={[
        { param: "status", label: t("masterData.statuses"), options: ["DRAFT", "ACTIVE", "ARCHIVED"].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() })) },
        { param: "productTypeId", label: t("masterData.productTypes"), options: (types.data?.data ?? []).map((t) => ({ value: t.id, label: t.name })) },
      ]}
    />
  );
}

/* ---------- private files: metadata via the asset list API, bytes via a short-lived signed URL requested on click ---------- */
function formatSize(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DownloadButton({ asset }: { asset: Asset }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={busy}
      aria-label={t("masterData.downloadOriginalname", { originalName: asset.originalName })}
      onClick={async () => {
        setBusy(true);
        try {
          const { url } = await api.getDownloadUrl(asset.id);
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
          toast.error(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download />{" "}{t("masterData.download")}</Button>
  );
}

export function VersionFiles({ version }: { version: PatternVersion }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const canSee = can("assets.read");
  const q = usePatternVersionAssets(version.id, canSee);
  if (!canSee) return <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock aria-hidden className="size-3.5" />{" "}{t("masterData.filesAreVisibleToRolesWith")}</p>;
  if (q.isLoading) return <p className="text-xs text-muted-foreground">{t("masterData.loadingFiles")}</p>;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-3" />;
  const files = (q.data?.data ?? []).filter((a) => !a.archivedAt);
  const pattern = files.filter((a) => a.type === "PATTERN");
  return (
    <div className="space-y-2">
      {version.status === "APPROVED" ? (
        pattern.length > 0 ? (
          <p data-testid="file-ok" className="inline-flex items-center gap-1.5 text-xs font-medium text-tone-success-fg"><FileCheck2 aria-hidden className="size-4" />{" "}{t("masterData.patternFileAttached")}</p>
        ) : (
          <p data-testid="file-missing" role="alert" className="inline-flex items-center gap-1.5 text-xs font-medium text-tone-warning-fg"><FileWarning aria-hidden className="size-4" />{" "}{t("masterData.approvedButNoPatternFileIs")}</p>
        )
      ) : null}
      {files.length === 0 ? <p className="text-xs text-muted-foreground">{t("masterData.noFilesAttached")}</p> : (
        <ul className="divide-y rounded-md border">
          {files.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{a.originalName}</span>
              <span className="text-xs text-muted-foreground">{a.type} · {formatSize(a.sizeBytes)}</span>
              <DownloadButton asset={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PatternDetailPage({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const q = usePattern(id);
  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && q.error.kind === "forbidden") return <AccessDeniedState />;
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title={t("masterData.patternNotFound")} error={q.error} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const p = q.data;
  if (!p) return null;
  const versions = [...p.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: t("masterData.masterData"), href: "/master-data" }, { label: t("masterData.patterns"), href: "/master-data/patterns" }, { label: p.referenceNumber }]}
        reference={p.referenceNumber}
        title={p.name}
        status={<StatusBadge status={p.status} />}
        meta={ADMIN_MANAGED}
      />
      <div className="space-y-4">
        <Card aria-labelledby="pat-id">
          <CardHeader><CardTitle><span id="pat-id">{t("masterData.identity")}</span></CardTitle></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label={t("masterData.code")}><span className="font-mono">{p.code}</span></InfoItem>
              <InfoItem label={t("common.productType")}><Link href={`/master-data/products/${p.productType.id}`} className="hover:text-brand hover:underline">{p.productType.name}</Link></InfoItem>
              <InfoItem label={t("masterData.fit")}>{p.fitType}</InfoItem>
              <InfoItem label={t("masterData.approvedVersion")}>{p.currentVersionNumber != null ? `v${p.currentVersionNumber}` : t("masterData.noneApprovedYet")}</InfoItem>
              <InfoItem label={t("common.created")}>{fmt.dateTime(p.createdAt)}</InfoItem>
              <InfoItem label={t("common.updated")}>{fmt.dateTime(p.updatedAt)}</InfoItem>
              <InfoItem label={t("common.description")} className="sm:col-span-2 lg:col-span-3">{p.description}</InfoItem>
              <InfoItem label={t("common.notes")} className="sm:col-span-2 lg:col-span-3">{p.notes ? <span className="whitespace-pre-wrap">{p.notes}</span> : null}</InfoItem>
            </InfoGrid>
          </CardContent>
        </Card>
        <Card aria-labelledby="pat-versions">
          <CardHeader><CardTitle><span id="pat-versions">{t("masterData.versionHistory")}</span></CardTitle><span className="text-xs text-muted-foreground">{t("masterData.lengthVersion", { length: versions.length })}{versions.length === 1 ? "" : "s"}</span></CardHeader>
          {versions.length === 0 ? <EmptyState title={t("masterData.noVersions")} description={ADMIN_MANAGED} className="py-8" /> : (
            <ol className="divide-y" data-testid="versions">
              {versions.map((v) => (
                <li key={v.id} data-testid="version" data-status={v.status} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold">{t("masterData.versionVersionnumber", { versionNumber: v.versionNumber })}</span>
                    <StatusBadge status={v.status} />
                    {v.id === p.currentVersionId ? <span className="rounded-sm bg-brand-soft px-1.5 text-xs font-medium text-brand-hover">{t("masterData.current")}</span> : null}
                    <span className="text-xs text-muted-foreground">{t("masterData.createdCreatedat", { createdAt: fmt.date(v.createdAt) })}{v.approvedAt ? t("masterData.approvedApprovedat", { approvedAt: fmt.date(v.approvedAt) }) : ""}</span>
                  </div>
                  {v.notes ? <p className="text-sm text-muted-foreground">{v.notes}</p> : null}
                  <VersionFiles version={v} />
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
