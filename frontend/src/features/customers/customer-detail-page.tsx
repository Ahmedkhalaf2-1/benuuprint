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
import { formatDateTime, humanizeCode } from "@/lib/utils/format";
import { AddressesSection } from "./addresses-section";
import { ArchiveCustomerDialog, useRestoreCustomer } from "./customer-actions";
import { CustomerBrandsSection } from "./customer-brands-section";
import { ContactsSection } from "./contacts-section";
import { CustomerOperations, CustomerResponsibilities } from "@/features/responsibilities/customer-sections";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomer, useSetCustomerStatus } from "./hooks";
import { CUSTOMER_STATUSES } from "./types";

export function CustomerDetailPage({ id }: { id: string }) {
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
      return <ErrorState title="Customer not found" error={q.error} className="py-20" />;
    }
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const c = q.data;
  if (!c) return null;
  const archived = c.status === "ARCHIVED";

  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: "Customers", href: "/customers" }, { label: c.customerNumber }]}
        reference={c.customerNumber}
        title={c.displayName}
        status={<StatusBadge status={c.status} />}
        meta={`Created ${formatDateTime(c.createdAt)}`}
        actions={
          canManage ? (
            <>
              {!archived ? (
                <>
                  <Button asChild variant="secondary"><Link href={`/customers/${c.id}/edit`}><Pencil /> Edit</Link></Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="secondary">Status <ChevronDown /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Set status</DropdownMenuLabel>
                      {CUSTOMER_STATUSES.map((s) => (
                        <DropdownMenuItem key={s} disabled={s === c.status || setStatus.isPending} onSelect={() => setStatus.mutate({ id: c.id, status: s }, { onSuccess: () => toast.success(`Status set to ${humanizeCode(s)}`), onError: (e) => toast.error(errorMessage(e)) })}>{humanizeCode(s)}</DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setArchiving(true)}><Archive /> Archive…</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button variant="secondary" loading={restore.pending} onClick={() => restore.restore(c)}><ArchiveRestore /> Restore</Button>
              )}
            </>
          ) : null
        }
      />

      {archived ? (
        <p role="status" className="mb-4 rounded-md bg-tone-neutral-bg px-3 py-2 text-sm text-tone-neutral-fg">
          Archived {formatDateTime(c.archivedAt)}. It cannot be edited or receive new brands until restored; its brands must be restored individually afterwards.
        </p>
      ) : null}

      <Tabs defaultValue="overview">
        {canOps ? <TabsList className="mb-4" aria-label="Customer sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="operations">Operations</TabsTrigger><TabsTrigger value="responsibilities">Responsibilities</TabsTrigger></TabsList> : null}
      <TabsContent value="overview" className="space-y-4">
        <Card aria-labelledby="overview-title">
          <CardHeader><CardTitle><span id="overview-title">Overview</span></CardTitle></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label="Email">{c.email ? <a className="text-brand hover:underline" href={`mailto:${c.email}`}>{c.email}</a> : null}</InfoItem>
              <InfoItem label="Phone">{c.phone}</InfoItem>
              <InfoItem label="WhatsApp">{c.whatsapp}</InfoItem>
              <InfoItem label="Country">{c.country}</InfoItem>
              <InfoItem label="City">{c.city}</InfoItem>
              <InfoItem label="Instagram">{c.instagram ? `@${c.instagram}` : null}</InfoItem>
              <InfoItem label="Source">{c.source}</InfoItem>
              <InfoItem label="Created">{formatDateTime(c.createdAt)}</InfoItem>
              <InfoItem label="Updated">{formatDateTime(c.updatedAt)}</InfoItem>
              <InfoItem label="Notes" className="sm:col-span-2 lg:col-span-3">{c.notes ? <span className="whitespace-pre-wrap">{c.notes}</span> : null}</InfoItem>
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
