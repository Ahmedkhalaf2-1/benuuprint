"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ArchiveBrandDialog, useRestoreBrandAction } from "@/features/brands/brand-actions";
import { useCustomerBrands } from "@/features/brands/hooks";
import type { Brand } from "@/features/brands/types";
import { useI18n } from "@/i18n/provider";

/** Brands of one customer, from GET /admin/customers/:id/brands (archived hidden unless toggled). */
export function CustomerBrandsSection({ customerId, canManage, customerArchived }: { customerId: string; canManage: boolean; customerArchived: boolean }) {
  const { t } = useI18n();
  const [showArchived, setShowArchived] = useState(false);
  const q = useCustomerBrands(customerId, { pageSize: 100, includeArchived: showArchived || undefined });
  const [toArchive, setToArchive] = useState<Brand | null>(null);
  const restore = useRestoreBrandAction();
  const canAdd = canManage && !customerArchived;

  return (
    <Card aria-labelledby="brands-title">
      <CardHeader>
        <CardTitle><span id="brands-title">{t("customers.brands")}</span></CardTitle>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} aria-label={t("customers.showArchivedBrands")} />{t("customers.showArchived")}</label>
          {canAdd ? <Button asChild size="sm" variant="secondary"><Link href={`/brands/new?customerId=${customerId}`}><Plus />{" "}{t("customers.addBrand")}</Link></Button> : null}
        </div>
      </CardHeader>
      {q.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" />
      ) : q.data && q.data.data.length === 0 ? (
        <EmptyState title={t("customers.noBrandsForThisCustomer")} description={customerArchived ? t("customers.restoreTheCustomerToAddBrands") : t("customers.brandsGroupACustomerSProducts")} className="py-8" action={canAdd ? <Button asChild size="sm"><Link href={`/brands/new?customerId=${customerId}`}><Plus />{" "}{t("customers.addBrand")}</Link></Button> : undefined} />
      ) : (
        <ul className="divide-y">
          {q.data?.data.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-24 shrink-0 font-mono text-xs font-semibold">{b.brandNumber}</span>
              <Link href={`/brands/${b.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-brand hover:underline">{b.name}</Link>
              <StatusBadge status={b.status} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild><IconButton size="sm" label={t("customers.actionsForName", { name: b.name })} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild><Link href={`/brands/${b.id}`}>{t("customers.viewBrand")}</Link></DropdownMenuItem>
                  {canManage && b.status !== "ARCHIVED" ? <DropdownMenuItem asChild><Link href={`/brands/${b.id}/edit`}>{t("customers.editBrand")}</Link></DropdownMenuItem> : null}
                  {canManage && b.status !== "ARCHIVED" ? <DropdownMenuItem destructive onSelect={() => setToArchive(b)}>{t("customers.archiveBrand")}</DropdownMenuItem> : null}
                  {canManage && b.status === "ARCHIVED" ? <DropdownMenuItem disabled={restore.pending || customerArchived} onSelect={() => restore.restore(b)}>{t("customers.restoreBrand")}</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
      <ArchiveBrandDialog brand={toArchive} onOpenChange={(o) => !o && setToArchive(null)} />
    </Card>
  );
}
