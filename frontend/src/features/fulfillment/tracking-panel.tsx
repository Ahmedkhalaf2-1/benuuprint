"use client";

import { useMutation } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccessDeniedState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage, isApiError } from "@/lib/api/errors";

import * as api from "./api";
import { useFulfillmentInvalidation, useTracking } from "./hooks";
import type { PublicTracking, TrackingToken } from "./types";
import { useI18n } from "@/i18n/provider";

/**
 * Customer tracking link management. The backend stores only a hash of the token: the raw token / link exists ONLY in the response
 * of create/regenerate, so it is shown once (in React state, never persisted) and cannot be shown again later.
 */
export function TrackingPanel({ orderId }: { orderId: string }) {
  const { fmt, t } = useI18n();
  const { can } = useAuth();
  const inv = useFulfillmentInvalidation();
  const q = useTracking(orderId);
  const [days, setDays] = useState("");
  const [token, setToken] = useState<TrackingToken | null>(null);
  const [confirm, setConfirm] = useState<"regenerate" | "revoke" | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const manage = can("public_tracking.manage");
  const create = useMutation({ mutationFn: (kind: "create" | "regenerate") => { const n = days.trim() ? Number(days) : undefined; return kind === "create" ? api.createTrackingToken(orderId, n) : api.regenerateTrackingToken(orderId, n); }, onSuccess: () => inv.tracking(orderId) });
  const revoke = useMutation({ mutationFn: () => api.revokeTrackingToken(orderId), onSuccess: () => inv.tracking(orderId) });

  if (q.isLoading) return <Skeleton className="h-32" />;
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title={t("fulfillment.trackingIsNotAvailableToYour")} className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const trk = q.data;
  if (!trk) return null;
  const bad = days.trim() !== "" && !/^[1-9]\d*$/.test(days.trim());
  const run = async (kind: "create" | "regenerate") => { setError(null); try { setToken(await create.mutateAsync(kind)); setConfirm(null); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); setConfirm(null); } };

  return (
    <div className="space-y-4" data-testid="tracking-panel">
      <Card aria-labelledby="tr-t">
        <CardHeader><CardTitle><span id="tr-t">{t("fulfillment.customerTrackingLink")}</span></CardTitle><span className={`text-xs font-medium ${trk.enabled ? "text-tone-success-fg" : "text-muted-foreground"}`}>{trk.enabled ? t("fulfillment.enabled2") : t("fulfillment.notEnabled")}</span></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {error ? <FormError {...error} /> : null}
          {trk.enabled ? <p className="text-muted-foreground">{t("fulfillment.created")}{" "}{trk.createdAt ? fmt.dateTime(trk.createdAt) : "—"} · {trk.expiresAt ? t("fulfillment.expiresExpiresat2", { expiresAt: fmt.dateTime(trk.expiresAt) }) : t("fulfillment.noExpiry2")} · {trk.lastUsedAt ? t("fulfillment.lastOpenedLastusedat", { lastUsedAt: fmt.dateTime(trk.lastUsedAt) }) : t("fulfillment.neverOpened")}</p> : <p className="text-muted-foreground">{t("fulfillment.customersCannotTrackThisOrderYet")}</p>}
          <p className="rounded-md bg-surface-muted px-3 py-2 text-xs" data-testid="token-note">{t("fulfillment.tokenNoteBefore")} <strong>{t("fulfillment.regenerate")}</strong> {t("fulfillment.tokenNoteAfter")}</p>
          {manage ? (
            <div className="flex flex-wrap items-end gap-2">
              <FormField id="tr-days" label={t("fulfillment.expiresAfterDaysOptional")} error={bad ? "Whole number of days" : undefined}><Input id="tr-days" className="w-40" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></FormField>
              {!trk.enabled ? <Button loading={create.isPending} disabled={bad} onClick={() => void run("create")}>{t("fulfillment.createTrackingLink")}</Button> : <><Button variant="secondary" disabled={bad} onClick={() => setConfirm("regenerate")}>{t("fulfillment.regenerateLink")}</Button><Button variant="secondary" className="text-danger" onClick={() => setConfirm("revoke")}>{t("fulfillment.revokeLink")}</Button></>}
            </div>
          ) : <p className="text-xs text-muted-foreground">{t("fulfillment.managingTrackingLinksNeedsThePublic")}</p>}
        </CardContent>
      </Card>
      <ConfirmDialog open={confirm === "regenerate"} onOpenChange={(o) => !o && setConfirm(null)} title={t("fulfillment.regenerateTrackingLink")} description={t("fulfillment.theCurrentLinkStopsWorkingImmediately")} confirmLabel={t("fulfillment.regenerate2")} loading={create.isPending} onConfirm={() => void run("regenerate")} />
      <ConfirmDialog open={confirm === "revoke"} onOpenChange={(o) => !o && setConfirm(null)} title={t("fulfillment.revokeTrackingLink")} description={t("fulfillment.customersWillNoLongerBeAble")} confirmLabel={t("fulfillment.revoke")} destructive loading={revoke.isPending} onConfirm={async () => { try { await revoke.mutateAsync(); toast.success(t("fulfillment.trackingLinkRevoked")); } catch (e) { setError({ message: errorMessage(e) }); } setConfirm(null); }} />
      {token ? <TokenDialog token={token} onClose={() => setToken(null)} /> : null}
    </div>
  );
}

/** One-time reveal of the raw link, with a preview of exactly what the public endpoint returns. */
function TokenDialog({ token, onClose }: { token: TrackingToken; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const link = token.url ?? token.path;
  const [preview, setPreview] = useState<PublicTracking | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t("fulfillment.trackingLinkCreated")} description={t("fulfillment.copyItNowItIsShown")} className="max-w-lg">
        <div className="space-y-3 text-sm" data-testid="token-dialog">
          <div className="flex gap-2"><Input readOnly aria-label={t("fulfillment.trackingLink")} value={link} onFocus={(e) => e.currentTarget.select()} /><Button variant="secondary" aria-label={t("fulfillment.copyTrackingLink")} onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success(t("fulfillment.linkCopied")); } catch { toast.error(t("fulfillment.couldNotCopySelectTheLink")); } }}><Copy />{" "}{t("fulfillment.copy")}</Button></div>
          {!token.url ? <p className="text-xs text-muted-foreground">{t("fulfillment.thePublicAppUrlIsNot")}</p> : null}
          <p className="text-xs text-muted-foreground">{token.expiresAt ? t("fulfillment.expiresExpiresat", { expiresAt: fmt.dateTime(token.expiresAt) }) : t("fulfillment.noExpiry")}</p>
          <div className="space-y-2 border-t pt-3">
            <Button size="sm" variant="secondary" loading={busy} onClick={async () => { setBusy(true); setErr(null); try { setPreview(await api.fetchPublicTracking(token.token)); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); } }}>{t("fulfillment.publicTrackingPreview")}</Button>
            {err ? <p role="alert" className="text-xs text-danger">{err}</p> : null}
            {preview ? (
              <div className="rounded-md border p-3" data-testid="public-preview">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("fulfillment.publicTrackingPreviewWhatTheCustomer")}</p>
                <p className="font-medium">{preview.orderNumber} · {humanizeStatus(preview.status)}</p>
                <p className="text-xs text-muted-foreground">{preview.currentStage ? t("fulfillment.nowCurrentstage", { currentStage: preview.currentStage }) : ""}{t("fulfillment.progresspercentThroughProductionDeliveredqua", { progressPercent: preview.progressPercent, deliveredQuantity: fmt.number(preview.deliveredQuantity), totalQuantity: fmt.number(preview.totalQuantity), remainingDeliveryQuantity: fmt.number(preview.remainingDeliveryQuantity) })}</p>
                <ul className="mt-1 space-y-0.5 text-xs">{preview.shipments.map((s) => <li key={s.shipmentNumber}>{t("fulfillment.shipmentnumberStatusQuantityUnits", { shipmentNumber: s.shipmentNumber, status: humanizeStatus(s.status), quantity: s.quantity })}</li>)}</ul>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end"><Button onClick={onClose}>{t("fulfillment.done")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
const humanizeStatus = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
