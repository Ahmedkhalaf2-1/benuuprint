"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, ErrorState } from "@/components/feedback/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { isApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/utils/format";
import { isPositive } from "@/lib/utils/money";
import { useCommercialSummary } from "./hooks";
import { PaymentsPanel } from "./payments-panel";
import { QuotationPanel } from "./quotation-panel";
import type { CommercialTarget } from "./types";

function Figure({ label, value, strong, tone }: { label: string; value: string | null; strong?: boolean; tone?: "danger" | "warning" }) {
  return (
    <div className="rounded-md border bg-surface p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 tabular-nums ${strong ? "text-xl font-semibold" : "text-base font-medium"} ${tone === "danger" ? "text-danger" : tone === "warning" ? "text-tone-warning-fg" : ""}`}>{value ?? "—"}</dd>
    </div>
  );
}

/**
 * Commercial section for a sample OR an order: backend summary + quotation versions + payments. Every number comes from
 * the server; pending (unverified) payments are shown separately and never as "Paid".
 * `canStart` / `startHint` tell the quotation panel whether a quotation can be started now (owner-specific rule).
 */
export function CommercialSection({ target, canStart, startHint }: { target: CommercialTarget; canStart: boolean; startHint: string }) {
  const { can } = useAuth();
  const q = useCommercialSummary(target);
  const [tab, setTab] = useState("summary");
  const quotationsAllowed = can("quotations.read");
  const paymentsAllowed = can("payments.read");
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title="Commercial details are not available to your role" description="Quotation and payment details are restricted." className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data;
  if (!c) return null;
  const money = (v: string | null | undefined) => (v === null || v === undefined ? null : c.currency ? formatMoney(v, c.currency) : v);
  const accepted = c.quotation?.status === "ACCEPTED";
  const gate = c.releaseGate;

  return (
    <div data-testid="commercial-section">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4" aria-label="Commercial sections">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          {quotationsAllowed ? <TabsTrigger value="quotation">Quotation</TabsTrigger> : null}
          {paymentsAllowed ? <TabsTrigger value="payments">Payments</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="summary">
          <Card aria-labelledby="com-title" data-testid="commercial-summary">
            <CardHeader>
              <CardTitle><span id="com-title">Commercial summary</span></CardTitle>
              <span className="flex items-center gap-2"><StatusBadge status={c.paymentState} />{c.quotation ? <StatusBadge status={c.quotation.status} /> : null}</span>
            </CardHeader>
            <CardContent className="space-y-4">
              {c.reapprovalRequired ? <p role="alert" className="rounded-md bg-tone-danger-bg px-3 py-2 text-sm font-medium text-tone-danger-fg">Commercial reapproval required</p> : null}
              {c.quotation ? <p className="text-sm"><span className="font-mono text-xs font-semibold">{c.quotation.quotationNumber}</span> {c.quotation.versionNumber != null ? ` · version ${c.quotation.versionNumber}` : ""}{c.quotation.status === "ACCEPTED" ? " · accepted" : ""}</p> : <p className="text-sm text-muted-foreground">No quotation yet.</p>}
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Figure label={accepted ? "Accepted total" : "Quoted total"} value={money(accepted ? c.acceptedTotal : c.quotedTotal)} strong />
                <Figure label="Verified paid" value={money(c.verifiedPaid)} strong />
                <Figure label="Remaining" value={money(c.remaining)} strong />
                {c.overpaid !== undefined && isPositive(c.overpaid) ? <Figure label="Overpaid" value={money(c.overpaid)} tone="warning" strong /> : <Figure label="Pending (unverified)" value={money(c.pendingPayments)} />}
              </dl>
              {c.overpaid !== undefined && isPositive(c.overpaid) ? <p className="text-xs text-muted-foreground">Pending (unverified, not counted as paid): {money(c.pendingPayments)}</p> : null}
              {gate ? (
                <p data-testid="release-gate" className={`rounded-md px-3 py-2 text-sm ${gate.satisfied ? "bg-tone-success-bg text-tone-success-fg" : "bg-tone-warning-bg text-tone-warning-fg"}`}>
                  <span className="font-medium">{gate.satisfied ? "Commercial conditions for production are met." : "Production cannot be released yet."}</span>
                  {gate.reasons.length ? ` ${gate.reasons.join(" ")}` : ""}
                  <span className="block text-xs opacity-80">Required: {gate.requireAcceptedQuotation ? "accepted quotation, " : ""}{gate.requiredPaidPercent}% verified{gate.requiredPaidAmount ? ` (${money(gate.requiredPaidAmount)})` : ""}.</span>
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">{c.counts.verified} verified · {c.counts.pending} pending · {c.counts.rejected} rejected · {c.counts.cancelled} cancelled payments</p>
            </CardContent>
          </Card>
        </TabsContent>

        {quotationsAllowed ? <TabsContent value="quotation"><QuotationPanel target={target} canStart={canStart} startHint={startHint} /></TabsContent> : null}
        {paymentsAllowed ? <TabsContent value="payments"><PaymentsPanel target={target} currency={c.currency} hasAcceptedQuotation={accepted} /></TabsContent> : null}
      </Tabs>
    </div>
  );
}
