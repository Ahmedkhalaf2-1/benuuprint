"use client";

import { Pencil, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, DetailSkeleton, ErrorState } from "@/components/feedback/states";
import { DetailHeader, InfoGrid, InfoItem } from "@/components/layout/detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { isApiError } from "@/lib/api/errors";

import { CreateOrderDialog } from "@/features/orders/create-order-dialog";
import { AccessoriesEditor } from "./accessories-editor";
import { ActionDialog } from "./action-dialogs";
import { visibleActions, type ActionMeta } from "./actions";
import { ApprovalsPanel } from "./approvals-panel";
import { ArtworkPanel } from "./artwork-panel";
import { AssignSalesDialog } from "./assign-sales-dialog";
import { CommercialSection } from "@/features/commercial/commercial-section";
import { DecorationsEditor } from "./decorations-editor";
import { useSample, useStatusHistory } from "./hooks";
import { productLabel } from "./labels";
import { NotesPanel } from "./notes-panel";
import { ProblemsSummary } from "./problems-summary";
import { ProcessPanel } from "@/features/responsibilities/process-panel";
import { ProductionPanel } from "./production-panel";
import { SampleFiles } from "./sample-files";
import { SpecificationView } from "./specification-view";
import { StatusTimeline } from "./status-timeline";
import { TermsPanel } from "./terms-panel";
import { useI18n } from "@/i18n/provider";

const TABS = ["overview", "specification", "decorations", "artwork", "notes", "approvals", "commercial", "production"] as const;
type Tab = (typeof TABS)[number];

export function SampleDetailPage({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const { can, canAny, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = useSample(id);
  const history = useStatusHistory(id);
  const [action, setAction] = useState<ActionMeta | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [problems, setProblems] = useState<string[] | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const showCommercial = canAny("quotations.read", "payments.read");
  const tabs = useMemo(() => TABS.filter((t) => t !== "commercial" || showCommercial), [showCommercial]);
  const requested = sp.get("tab") as Tab | null;
  const tab: Tab = requested && tabs.includes(requested) ? requested : "overview";
  const setTab = (t: string) => router.replace(t === "overview" ? pathname : `${pathname}?tab=${t}`, { scroll: false });

  if (q.isLoading) return <DetailSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && q.error.kind === "forbidden") return <AccessDeniedState />;
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <ErrorState title={t("samples.sampleNotFound")} error={q.error} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const s = q.data;
  if (!s) return null;

  const canManage = can("samples.manage");
  const isDraft = s.status === "DRAFT";
  const holdEntry = s.status === "ON_HOLD" ? [...(history.data ?? [])].reverse().find((h) => h.action === "hold") : undefined;
  const actions = visibleActions(s.allowedActions);
  const title = productLabel(s) ?? "Sample";

  return (
    <>
      <DetailHeader
        breadcrumbs={[{ label: t("samples.samples"), href: "/samples" }, { label: s.sampleNumber }]}
        reference={`${s.sampleNumber}${s.revisionNumber > 1 ? t("common.revisionSuffix", { n: s.revisionNumber }) : ""}`}
        title={title}
        status={<><StatusBadge status={s.status} /><StatusBadge status={s.paymentState} /></>}
        meta={
          <span className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span>{t("common.customer")}{" "}<Link href={`/customers/${s.customer.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{s.customer.displayName}</Link></span>
            <span>{t("common.brand2")}{" "}<Link href={`/brands/${s.brand.id}`} className="font-medium text-foreground hover:text-brand hover:underline">{s.brand.name}</Link></span>
            <span>{t("samples.sales")}{" "}{s.assignedSales ? <span className="font-medium text-foreground">{s.assignedSales.name}</span> : t("samples.unassigned")}</span>
          </span>
        }
        actions={
          <>
            {canManage && isDraft ? <Button asChild variant="secondary"><Link href={`/samples/${s.id}/edit`}><Pencil />{" "}{t("samples.editDraft")}</Link></Button> : null}
            {can("orders.manage") && (s.status === "APPROVED" || s.status === "COMPLETED") ? <Button onClick={() => setCreatingOrder(true)}>{t("samples.createBulkOrder")}</Button> : null}
            {can("samples.assign") ? <Button variant="secondary" onClick={() => setAssigning(true)}><UserPlus />{" "}{t("samples.assignSales")}</Button> : null}
            {actions.map((a) => <Button key={a.action} variant={a.tone === "primary" ? "primary" : "secondary"} className={a.tone === "danger" ? "text-danger" : undefined} onClick={() => setAction(a)}>{t.text(a.label)}</Button>)}
          </>
        }
      />

      {problems ? <ProblemsSummary messages={problems} editHref={`/samples/${s.id}/edit`} /> : null}
      {holdEntry ? <p role="status" className="mb-4 rounded-md bg-tone-warning-bg px-3 py-2 text-sm text-tone-warning-fg"><span className="font-medium">{t("common.onHold")}</span>{" "}{t("samples.sinceCreatedat", { createdAt: fmt.dateTime(holdEntry.createdAt) })}{holdEntry.reason ? `: ${holdEntry.reason}` : ""}</p> : null}
      <Card className="mb-4"><CardContent className="py-4"><StatusTimeline status={s.status} holdPreviousStatus={s.holdPreviousStatus} /></CardContent></Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4" aria-label={t("samples.sampleSections")}>
          {tabs.map((tb) => <TabsTrigger key={tb} value={tb}>{tb === "artwork" ? t.text("Artwork & files") : fmt.code(tb)}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card aria-labelledby="ov-title">
            <CardHeader><CardTitle><span id="ov-title">{t("common.overview")}</span></CardTitle></CardHeader>
            <CardContent>
              <InfoGrid>
                <InfoItem label={t("common.sample")}><span className="font-mono">{s.sampleNumber}</span></InfoItem>
                <InfoItem label={t("common.status")}><StatusBadge status={s.status} /></InfoItem>
                <InfoItem label={t("samples.payment")}><StatusBadge status={s.paymentState} /></InfoItem>
                <InfoItem label={t("common.created")}>{fmt.dateTime(s.createdAt)}</InfoItem>
                <InfoItem label={t("samples.submitted")}>{s.submittedAt ? fmt.dateTime(s.submittedAt) : null}</InfoItem>
                <InfoItem label={t("samples.reviewed")}>{s.reviewedAt ? fmt.dateTime(s.reviewedAt) : null}</InfoItem>
                <InfoItem label={t("samples.approved")}>{s.approvedAt ? fmt.dateTime(s.approvedAt) : null}</InfoItem>
                <InfoItem label={t("samples.completed")}>{s.completedAt ? fmt.dateTime(s.completedAt) : null}</InfoItem>
                <InfoItem label={t("common.updated")}>{fmt.dateTime(s.updatedAt)}</InfoItem>
              </InfoGrid>
            </CardContent>
          </Card>
          <Card aria-labelledby="hist-title">
            <CardHeader><CardTitle><span id="hist-title">{t("samples.statusHistory")}</span></CardTitle></CardHeader>
            {history.data && history.data.length > 0 ? (
              <ol className="divide-y" data-testid="history">
                {[...history.data].reverse().map((h) => (
                  <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
                    <span className="font-medium">{fmt.code(h.toStatus)}</span>
                    <span className="text-xs text-muted-foreground">{fmt.code(h.action)} · {h.source === "SYSTEM" ? t("samples.automatic") : t("samples.staff2")} · {fmt.dateTime(h.createdAt)}</span>
                    {h.reason ? <span className="basis-full text-xs">{h.reason}</span> : null}
                  </li>
                ))}
              </ol>
            ) : <CardContent className="text-sm text-muted-foreground">{history.isLoading ? t("samples.loading") : t("samples.noHistory")}</CardContent>}
          </Card>
        </TabsContent>

        <TabsContent value="specification" className="space-y-4">
          <SpecificationView s={s} />
          <AccessoriesEditor sample={s} editable={false} />
          <TermsPanel sample={s} canRecord={canManage && isDraft} />
        </TabsContent>

        <TabsContent value="decorations"><DecorationsEditor sample={s} editable={false} /></TabsContent>

        <TabsContent value="artwork" className="space-y-4">
          <ArtworkPanel sample={s} canEdit={canManage && can("assets.manage")} canRequestApproval={can("approvals.manage")} />
          <SampleFiles sample={s} editable={false} canUpload={false} />
        </TabsContent>

        <TabsContent value="notes"><NotesPanel sampleId={s.id} canWrite={canManage} currentUserId={user?.id} /></TabsContent>
        <TabsContent value="approvals"><ApprovalsPanel sample={s} canManage={can("approvals.manage")} /></TabsContent>
        {showCommercial ? <TabsContent value="commercial"><CommercialSection target={{ kind: "sample", id: s.id }} canStart={s.status === "UNDER_REVIEW"} startHint={t("samples.aQuotationCanBeCreatedWhile")} /></TabsContent> : null}
        <TabsContent value="production" className="space-y-4"><ProcessPanel kind="samples" id={s.id} /><ProductionPanel sample={s} canSeeJobs={can("jobs.read_all")} /></TabsContent>
      </Tabs>

      {action ? <ActionDialog sample={s} meta={action} onClose={() => setAction(null)} onProblems={(m) => setProblems(m)} /> : null}
      {creatingOrder ? <CreateOrderDialog sample={s} onClose={() => setCreatingOrder(false)} /> : null}
      {assigning ? <AssignSalesDialog sample={s} onClose={() => setAssigning(false)} /> : null}
    </>
  );
}
