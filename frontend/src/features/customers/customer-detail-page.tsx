"use client";

import { Archive, ArchiveRestore, ChevronDown, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, DetailSkeleton, ErrorState } from "@/components/feedback/states";
import { DetailHeader, InfoGrid, InfoItem } from "@/components/layout/detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { isApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/api/errors";

import { AddressesSection } from "./addresses-section";
import { ArchiveCustomerDialog, useRestoreCustomer } from "./customer-actions";
import { CustomerBrandsSection } from "./customer-brands-section";
import { ContactsSection } from "./contacts-section";
import { CustomerOperations, CustomerResponsibilities } from "@/features/responsibilities/customer-sections";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomer, useSetCustomerStatus } from "./hooks";
import { CUSTOMER_STATUSES } from "./types";
import { useI18n } from "@/i18n/provider";

export function CustomerDetailPage({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const { can } = useAuth();
  const canManage = can("customers.manage");
  const canOps = can("responsibilities.read");
  const q = useCustomer(id);
  const [archiving, setArchiving] = useState(false);
  const restore = useRestoreCustomer();
  const setStatus = useSetCustomerStatus();

  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && q.error.kind === "forbidden") return <AccessDeniedState />;
    if (isApiError(q.error) && (q.error.kind === "not_found" || (q.error.kind === "validation" && q.error.status === 400))) {
      return <ErrorState title={t("customers.customerNotFound")} error={q.error} className="py-20" />;
    }
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const c = q.data;
  if (!c) return null;
  const archived = c.status === "ARCHIVED";

  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: t("customers.customers"), href: "/customers" }, { label: c.customerNumber }]}
        reference={c.customerNumber}
        title={c.displayName}
        status={<StatusBadge status={c.status} />}
        meta={t("common.createdOn", { date: fmt.dateTime(c.createdAt) })}
        actions={
          canManage ? (
            <>
              {!archived ? (
                <>
                  <Button asChild variant="secondary"><Link href={`/customers/${c.id}/edit`}><Pencil />{" "}{t("common.edit")}</Link></Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="secondary">{t("common.status")}{" "}<ChevronDown /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>{t("customers.setStatus")}</DropdownMenuLabel>
                      {CUSTOMER_STATUSES.map((s) => (
                        <DropdownMenuItem key={s} disabled={s === c.status || setStatus.isPending} onSelect={() => setStatus.mutate({ id: c.id, status: s }, { onSuccess: () => toast.success(t("customers.statusSetToS", { s: fmt.code(s) })), onError: (e) => toast.error(errorMessage(e)) })}>{fmt.code(s)}</DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setArchiving(true)}><Archive />{" "}{t("customers.archive2")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button variant="secondary" loading={restore.pending} onClick={() => restore.restore(c)}><ArchiveRestore />{" "}{t("customers.restore")}</Button>
              )}
            </>
          ) : null
        }
      />

      {archived ? (
        <p role="status" className="mb-4 rounded-md bg-tone-neutral-bg px-3 py-2 text-sm text-tone-neutral-fg">{t("customers.archivedArchivedatItCannotBeEdited", { archivedAt: fmt.dateTime(c.archivedAt) })}</p>
      ) : null}

      <Tabs defaultValue="overview">
        {canOps ? <TabsList className="mb-4" aria-label={t("customers.customerSections")}><TabsTrigger value="overview">{t("common.overview")}</TabsTrigger><TabsTrigger value="operations">{t("customers.operations")}</TabsTrigger><TabsTrigger value="responsibilities">{t("customers.responsibilities")}</TabsTrigger></TabsList> : null}
      <TabsContent value="overview" className="space-y-4">
        <Card aria-labelledby="overview-title">
          <CardHeader><CardTitle><span id="overview-title">{t("common.overview")}</span></CardTitle></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label={t("customers.email")}>{c.email ? <a className="text-brand hover:underline" href={`mailto:${c.email}`}>{c.email}</a> : null}</InfoItem>
              <InfoItem label={t("common.phone")}>{c.phone}</InfoItem>
              <InfoItem label={t("customers.whatsapp")}>{c.whatsapp}</InfoItem>
              <InfoItem label={t("customers.country")}>{c.country}</InfoItem>
              <InfoItem label={t("customers.city")}>{c.city}</InfoItem>
              <InfoItem label={t("customers.instagram")}>{c.instagram ? `@${c.instagram}` : null}</InfoItem>
              <InfoItem label={t("common.source")}>{c.source}</InfoItem>
              <InfoItem label={t("common.created")}>{fmt.dateTime(c.createdAt)}</InfoItem>
              <InfoItem label={t("common.updated")}>{fmt.dateTime(c.updatedAt)}</InfoItem>
              <InfoItem label={t("common.notes")} className="sm:col-span-2 lg:col-span-3">{c.notes ? <span className="whitespace-pre-wrap">{c.notes}</span> : null}</InfoItem>
            </InfoGrid>
          </CardContent>
        </Card>

        <CustomerBrandsSection customerId={c.id} canManage={canManage} customerArchived={archived} />
        <div className="grid gap-4 xl:grid-cols-2">
          <ContactsSection customerId={c.id} canManage={canManage && !archived} />
          <AddressesSection customerId={c.id} canManage={canManage && !archived} />
        </div>
      </TabsContent>
      {canOps ? <TabsContent value="operations"><CustomerOperations customerId={c.id} /></TabsContent> : null}
      {canOps ? <TabsContent value="responsibilities"><CustomerResponsibilities customerId={c.id} customerName={c.displayName} /></TabsContent> : null}
      </Tabs>

      <ArchiveCustomerDialog customer={archiving ? c : null} onOpenChange={setArchiving} onArchived={() => router.refresh()} />
    </>
  );
}
