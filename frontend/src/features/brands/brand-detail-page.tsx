"use client";

import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, DetailSkeleton, ErrorState } from "@/components/feedback/states";
import { DetailHeader, InfoGrid, InfoItem } from "@/components/layout/detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { isApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/utils/format";
import { ArchiveBrandDialog, useRestoreBrandAction } from "./brand-actions";
import { useBrand } from "./hooks";

function Swatch({ color }: { color: string | null }) {
  if (!color) return null;
  return <span className="inline-flex items-center gap-2"><span aria-hidden className="size-4 rounded-sm border" style={{ backgroundColor: color }} />{color}</span>;
}

export function BrandDetailPage({ id }: { id: string }) {
  const { can } = useAuth();
  const canManage = can("customers.manage");
  const q = useBrand(id);
  const [archiving, setArchiving] = useState(false);
  const restore = useRestoreBrandAction();

  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && q.error.kind === "forbidden") return <AccessDeniedState />;
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title="Brand not found" error={q.error} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const b = q.data;
  if (!b) return null;
  const archived = b.status === "ARCHIVED";

  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: "Brands", href: `/brands?customerId=${b.customerId}` }, { label: b.brandNumber }]}
        reference={b.brandNumber}
        title={b.name}
        status={<StatusBadge status={b.status} />}
        meta={<>Customer <Link href={`/customers/${b.customer.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{b.customer.displayName}</Link></>}
        actions={canManage ? (archived ? (
          <Button variant="secondary" loading={restore.pending} onClick={() => restore.restore({ id: b.id, name: b.name, customerId: b.customerId })}><ArchiveRestore /> Restore</Button>
        ) : (
          <>
            <Button asChild variant="secondary"><Link href={`/brands/${b.id}/edit`}><Pencil /> Edit</Link></Button>
            <Button variant="secondary" onClick={() => setArchiving(true)}><Archive /> Archive</Button>
          </>
        )) : null}
      />
      {archived ? <p role="status" className="mb-4 rounded-md bg-tone-neutral-bg px-3 py-2 text-sm text-tone-neutral-fg">Archived {formatDateTime(b.archivedAt)}. Restoring re-checks that the name is still unique for this customer.</p> : null}
      <div className="space-y-4">
        <Card aria-labelledby="brand-overview">
          <CardHeader><CardTitle><span id="brand-overview">Details</span></CardTitle></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label="Instagram">{b.instagram ? `@${b.instagram}` : null}</InfoItem>
              <InfoItem label="Website">{b.website ? <a className="break-all text-brand hover:underline" href={b.website} target="_blank" rel="noreferrer noopener">{b.website}</a> : null}</InfoItem>
              <InfoItem label="Created">{formatDateTime(b.createdAt)}</InfoItem>
              <InfoItem label="Primary colour"><Swatch color={b.primaryColor} /></InfoItem>
              <InfoItem label="Secondary colour"><Swatch color={b.secondaryColor} /></InfoItem>
              <InfoItem label="Updated">{formatDateTime(b.updatedAt)}</InfoItem>
              <InfoItem label="Description" className="sm:col-span-2 lg:col-span-3">{b.description ? <span className="whitespace-pre-wrap">{b.description}</span> : null}</InfoItem>
            </InfoGrid>
          </CardContent>
        </Card>
        <Card aria-labelledby="brand-customer">
          <CardHeader><CardTitle><span id="brand-customer">Customer</span></CardTitle><Button asChild size="sm" variant="secondary"><Link href={`/customers/${b.customer.id}`}>Open customer</Link></Button></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label="Number"><span className="font-mono">{b.customer.customerNumber}</span></InfoItem>
              <InfoItem label="Name">{b.customer.displayName}</InfoItem>
            </InfoGrid>
          </CardContent>
        </Card>
      </div>
      <ArchiveBrandDialog brand={archiving ? { id: b.id, name: b.name, customerId: b.customerId } : null} onOpenChange={setArchiving} />
    </>
  );
}
