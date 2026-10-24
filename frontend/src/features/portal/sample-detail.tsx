"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiError } from "@/lib/api/errors";

import { fitLabel, providerLabel, SIDE_LABELS, UNIT_LABELS } from "./labels";
import { useActivity, useCommercial, useMessages, useProduction, useSample } from "./hooks";
import { ApprovalCard, JourneyFiles, PaymentTab, ProductionTab, ProductionTracker, QuotationTab, primaryAction, type PortalTab } from "./journey";
import { CustomerStatus } from "./status";
import type { SampleDetail } from "./types";
import { useI18n } from "@/i18n/provider";

const TABS = ["overview", "specification", "quotation", "payment", "production", "files", "activity"] as const;
type Tab = PortalTab;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return <div className="grid gap-0.5 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm">{children}</dd></div>;
}

/** Plain-language spec: names, never ids. Only fields the customer projection returns. */
export function SpecificationView({ s }: { s: SampleDetail }) {
  const { t } = useI18n();
  const product = s.productName ?? s.customProductName;
  const colour = s.colorName ?? s.customColorName;
  const grouped = s.components.reduce<Record<string, typeof s.components>>((acc, c) => { (acc[c.category ?? "Other"] ??= []).push(c); return acc; }, {});
  return (
    <div className="space-y-4" data-testid="specification">
      <Card><CardHeader><CardTitle>{t("customer.yourProduct")}</CardTitle></CardHeader><CardContent><dl className="divide-y">
        <Row label={t("common.product")}>{product}</Row>
        <Row label={t("customer.aboutTheProduct")}>{s.customProductDescription}</Row>
        <Row label={t("customer.fabric")}>{s.fabricName ?? s.customFabricName}</Row>
        <Row label={t("customer.aboutTheFabric")}>{s.customFabricDescription}</Row>
        <Row label={t("customer.whoSuppliesTheFabric")}>{providerLabel(s.fabricProvider, t.text)}</Row>
        <Row label={t("common.colour")}>{colour ? <span className="inline-flex items-center gap-2">{s.customHex ? <span aria-hidden className="size-3.5 rounded-full border" style={{ background: s.customHex }} /> : null}{colour}{s.customPantone ? t("customer.pantoneCustompantone2", { customPantone: s.customPantone }) : ""}{s.customHex ? ` · ${s.customHex}` : ""}</span> : null}</Row>
        <Row label={t("customer.fabricWeight")}>{s.gsm ? `${s.gsm} g/m²` : null}</Row>
        <Row label={t("customer.fabricNotes")}>{s.fabricNotes}</Row>
      </dl></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("customer.sizeAndFit")}</CardTitle></CardHeader><CardContent><dl className="divide-y">
        <Row label={t("customer.sampleSize")}>{s.size?.name}</Row>
        <Row label={t("customer.howItShouldFit")}>{fitLabel(s.fitMethod, t.text)}</Row>
        <Row label={t("customer.pattern")}>{s.pattern?.name}</Row>
        <Row label={t("customer.fitNotes")}>{s.fitNotes}</Row>
      </dl></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("customer.decoration")}</CardTitle></CardHeader><CardContent>
        {s.decorations.length === 0 ? <p className="text-sm text-muted-foreground">{t("customer.noPrintOrEmbroidery")}</p> : <ul className="space-y-3" data-testid="decorations">{s.decorations.map((d) => (
          <li key={d.id} className="text-sm"><p className="font-medium">{d.printMethod.name} · {d.placement} <span className="font-normal text-muted-foreground">({t.text(SIDE_LABELS[d.side] ?? d.side)})</span></p>
            <p className="text-muted-foreground">{[d.width && d.height ? `${d.width} × ${d.height} ${d.unit ? t.text(UNIT_LABELS[d.unit] ?? d.unit) : ""}` : null, d.colorCount ? `${d.colorCount} colours` : null, d.artwork ? `Artwork: ${d.artwork.name}` : d.artworkRequired ? "Artwork needed" : null].filter(Boolean).join(" · ")}</p>
            {d.notes ? <p>{d.notes}</p> : null}</li>))}</ul>}
        {s.printNotes ? <p className="mt-3 text-sm"><span className="text-muted-foreground">{t("customer.printNotes")}{" "}</span>{s.printNotes}</p> : null}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{t("customer.accessoriesLabelsAndPackaging")}</CardTitle></CardHeader><CardContent className="space-y-3">
        {s.accessories.length === 0 && s.components.length === 0 ? <p className="text-sm text-muted-foreground">{t("customer.noneAdded")}</p> : null}
        {s.accessories.length ? <div><p className="mb-1 text-sm font-medium">{t("customer.accessories")}</p><ul className="space-y-1 text-sm" data-testid="accessories">{s.accessories.map((a) => <li key={a.id}>{a.accessory?.name ?? a.customName}{a.quantity ? ` × ${a.quantity}` : ""}{a.notes ? <span className="text-muted-foreground"> — {a.notes}</span> : null}</li>)}</ul></div> : null}
        {Object.entries(grouped).map(([cat, items]) => <div key={cat}><p className="mb-1 text-sm font-medium">{cat}</p><ul className="space-y-1 text-sm" data-testid="components">{items.map((c) => <li key={c.id}>{c.componentOption?.name ?? c.customName}{c.notes ? <span className="text-muted-foreground"> — {c.notes}</span> : null}</li>)}</ul></div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{t("customer.instructions")}</CardTitle></CardHeader><CardContent><dl className="divide-y">
        <Row label={t("customer.yourNotes")}>{s.notes}</Row><Row label={t("common.specialInstructions")}>{s.specialInstructions}</Row>
        {!s.notes && !s.specialInstructions ? <p className="py-2 text-sm text-muted-foreground">{t("customer.noExtraInstructions")}</p> : null}
      </dl></CardContent></Card>
    </div>
  );
}

function ActivityView({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const act = useActivity(id);
  const msgs = useMessages(id);
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>{t("common.progress")}</CardTitle></CardHeader><CardContent>
        {act.isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : act.error ? <ErrorState error={act.error} onRetry={() => act.refetch()} className="py-4" /> : act.data && act.data.length ? (
          <ol className="space-y-4 border-s ps-5" data-testid="timeline">{[...act.data].reverse().map((e, i) => (
            <li key={`${e.at}-${i}`} className="relative"><span aria-hidden className="absolute -start-[1.65rem] top-1.5 size-2.5 rounded-full bg-brand" /><p className="text-sm font-medium">{e.title}</p>{e.message ? <p className="text-sm text-muted-foreground">{e.message}</p> : null}<p className="text-xs text-muted-foreground">{fmt.dateTime(e.at)}</p></li>))}</ol>
        ) : <p className="text-sm text-muted-foreground">{t("customer.nothingYet")}</p>}
      </CardContent></Card>
      {msgs.data && msgs.data.length ? (
        <Card><CardHeader><CardTitle>{t("customer.messagesFromTheTeam")}</CardTitle></CardHeader><CardContent><ul className="space-y-3" data-testid="messages">{msgs.data.map((m) => <li key={m.id} className="rounded-md bg-surface-muted px-3 py-2 text-sm"><p className="whitespace-pre-wrap">{m.content}</p><p className="mt-1 text-xs text-muted-foreground">{m.from} · {fmt.dateTime(m.at)}</p></li>)}</ul></CardContent></Card>
      ) : null}
    </div>
  );
}

export function SampleDetailPage({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = useSample(id);
  const commercial = useCommercial(id);
  const production = useProduction(id);
  const requestedTab: Tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "overview";
  // Tabs appear only when the backend says there is something to show (a quotation, a payment state, production, or an approval to make).
  const hasQuotation = !!commercial.data?.quotation || !!q.data?.allowedActions?.some((a) => a === "ACCEPT_QUOTATION" || a === "REJECT_QUOTATION");
  const hasPayment = !!commercial.data && commercial.data.payment.status !== "NOT_REQUIRED_YET";
  const hasProduction = (!!production.data && production.data.phase !== "NOT_STARTED") || !!q.data?.allowedActions?.some((a) => a === "APPROVE_SAMPLE" || a === "REQUEST_CHANGES");
  const visible: Record<Tab, boolean> = { overview: true, specification: true, quotation: hasQuotation, payment: hasPayment, production: hasProduction, files: true, activity: true };
  const tab: Tab = visible[requestedTab] ? requestedTab : "overview";
  const setTab = (t: string) => { const p = new URLSearchParams(sp.toString()); p.delete("submitted"); if (t === "overview") p.delete("tab"); else p.set("tab", t); router.replace(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false }); };
  if (q.isLoading) return <PageSkeleton />;
  if (q.error) {
    // 404 for a missing OR foreign id: the same message, nothing about whether it exists.
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <EmptyState title={t("customer.sampleNotFound")} description={t("customer.weCouldnTFindThatSample")} action={<Button asChild variant="secondary"><Link href="/account/samples">{t("customer.backToMySamples")}</Link></Button>} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const s = q.data;
  if (!s) return null;
  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href="/account/samples" className="text-muted-foreground hover:text-foreground hover:underline">{t("customer.mySamples")}</Link></p>
      {sp.get("submitted") === "1" ? <p role="status" data-testid="submitted-banner" className="flex items-center gap-2 rounded-lg bg-tone-success-bg px-4 py-3 text-sm font-medium text-tone-success-fg"><CheckCircle2 aria-hidden className="size-5" />{" "}{t("customer.requestSubmittedOurTeamWillReview")}</p> : null}
      <header className="space-y-3 border-b border-border/70 pb-6">
        <div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-brand">{s.sampleNumber}</span><CustomerStatus status={s.status} label={s.statusLabel} /></div>
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.03em]">{s.productName ?? t("customer.sampleRequest")} <span className="text-lg font-normal text-muted-foreground">· {s.brand.name}</span></h1>
        <p className="rounded-lg border border-brand/35 bg-brand-soft/40 px-4 py-3 text-sm shadow-[inset_2px_0_0_var(--brand)]" data-testid="next-step"><span className="font-medium">{t("customer.whatHappensNext")}{" "}</span>{t.text(s.nextStep)}</p>
        {(() => { const a = primaryAction(s); if (!a) return null; return a.kind === "edit" ? <Button asChild size="lg"><Link href={`/account/samples/${s.id}/edit`}>{t.text(a.label)}</Link></Button> : <Button size="lg" data-testid="primary-cta" onClick={() => setTab(a.tab!)}>{t.text(a.label)}</Button>; })()}
        {s.status === "APPROVED" ? <div className="space-y-1"><Button asChild size="lg" data-testid="start-bulk-order"><Link href={`/account/orders/new?sample=${s.id}`}>{t("customer.startBulkOrder")}</Link></Button><p className="text-sm text-muted-foreground">{t("customer.orderThisProductInBulkUsing")}</p></div> : null}
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label={t("customer.sampleSections")} className="mb-4 flex-wrap"><TabsTrigger value="overview">{t("common.overview")}</TabsTrigger><TabsTrigger value="specification">{t("customer.specification")}</TabsTrigger>{hasQuotation ? <TabsTrigger value="quotation">{t("customer.quotation")}</TabsTrigger> : null}{hasPayment ? <TabsTrigger value="payment">{t("common.payment")}</TabsTrigger> : null}{hasProduction ? <TabsTrigger value="production">{t("common.production")}</TabsTrigger> : null}<TabsTrigger value="files">{t("common.files")}</TabsTrigger><TabsTrigger value="activity">{t("customer.activity")}</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-4"><ApprovalCard sample={s} />{production.data && production.data.phase === "IN_PROGRESS" ? <Card data-testid="production-card"><CardHeader><CardTitle>{t("customer.sampleProduction")}</CardTitle></CardHeader><CardContent className="space-y-3"><ProductionTracker production={production.data} compact /><p className="text-sm"><span className="font-medium">{t("customer.nextStep2")}{" "}</span>{t.text(s.nextStep)}</p></CardContent></Card> : null}<Card><CardContent className="pt-4"><dl className="divide-y">
          <Row label={t("customer.sampleNumber")}>{s.sampleNumber}</Row><Row label={t("common.brand2")}>{s.brand.name}</Row><Row label={t("common.product")}>{s.productName}</Row><Row label={t("common.status")}>{s.statusLabel}</Row>
          <Row label={t("customer.submitted")}>{s.submittedAt ? fmt.dateTime(s.submittedAt) : t("customer.notSubmittedYet")}</Row><Row label={t("common.created")}>{fmt.dateTime(s.createdAt)}</Row><Row label={t("customer.lastUpdated")}>{fmt.dateTime(s.updatedAt)}</Row>
        </dl></CardContent></Card></TabsContent>
        <TabsContent value="specification"><SpecificationView s={s} /></TabsContent>
        {hasQuotation ? <TabsContent value="quotation"><QuotationTab sample={s} /></TabsContent> : null}
        {hasPayment ? <TabsContent value="payment"><PaymentTab sample={s} /></TabsContent> : null}
        {hasProduction ? <TabsContent value="production"><ProductionTab sample={s} /></TabsContent> : null}
        <TabsContent value="files"><JourneyFiles sample={s} /></TabsContent>
        <TabsContent value="activity"><ActivityView id={s.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
