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
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import * as api from "./api";
import { useFulfillmentInvalidation, useTracking } from "./hooks";
import type { PublicTracking, TrackingToken } from "./types";

/**
 * Customer tracking link management. The backend stores only a hash of the token: the raw token / link exists ONLY in the response
 * of create/regenerate, so it is shown once (in React state, never persisted) and cannot be shown again later.
 */
export function TrackingPanel({ orderId }: { orderId: string }) {
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
  if (q.error) return isApiError(q.error) && q.error.kind === "forbidden" ? <AccessDeniedState title="Tracking is not available to your role" className="py-10" /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const t = q.data;
  if (!t) return null;
  const bad = days.trim() !== "" && !/^[1-9]\d*$/.test(days.trim());
  const run = async (kind: "create" | "regenerate") => { setError(null); try { setToken(await create.mutateAsync(kind)); setConfirm(null); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); setConfirm(null); } };

  return (
    <div className="space-y-4" data-testid="tracking-panel">
      <Card aria-labelledby="tr-t">
        <CardHeader><CardTitle><span id="tr-t">Customer tracking link</span></CardTitle><span className={`text-xs font-medium ${t.enabled ? "text-tone-success-fg" : "text-muted-foreground"}`}>{t.enabled ? "Enabled" : "Not enabled"}</span></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {error ? <FormError {...error} /> : null}
          {t.enabled ? <p className="text-muted-foreground">Created {t.createdAt ? formatDateTime(t.createdAt) : "—"} · {t.expiresAt ? `expires ${formatDateTime(t.expiresAt)}` : "no expiry"} · {t.lastUsedAt ? `last opened ${formatDateTime(t.lastUsedAt)}` : "never opened"}</p> : <p className="text-muted-foreground">Customers cannot track this order yet.</p>}
          <p className="rounded-md bg-surface-muted px-3 py-2 text-xs" data-testid="token-note">For security only a hash of the link is stored. An existing link cannot be shown again — <strong>regenerate</strong> to get a new one (the old link stops working immediately).</p>
          {manage ? (
            <div className="flex flex-wrap items-end gap-2">
              <FormField id="tr-days" label="Expires after (days, optional)" error={bad ? "Whole number of days" : undefined}><Input id="tr-days" className="w-40" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></FormField>
              {!t.enabled ? <Button loading={create.isPending} disabled={bad} onClick={() => void run("create")}>Create tracking link</Button> : <><Button variant="secondary" disabled={bad} onClick={() => setConfirm("regenerate")}>Regenerate link</Button><Button variant="secondary" className="text-danger" onClick={() => setConfirm("revoke")}>Revoke link</Button></>}
            </div>
          ) : <p className="text-xs text-muted-foreground">Managing tracking links needs the public-tracking permission.</p>}
        </CardContent>
      </Card>
      <ConfirmDialog open={confirm === "regenerate"} onOpenChange={(o) => !o && setConfirm(null)} title="Regenerate tracking link?" description="The current link stops working immediately; share the new one with the customer." confirmLabel="Regenerate" loading={create.isPending} onConfirm={() => void run("regenerate")} />
      <ConfirmDialog open={confirm === "revoke"} onOpenChange={(o) => !o && setConfirm(null)} title="Revoke tracking link?" description="Customers will no longer be able to track this order with the current link." confirmLabel="Revoke" destructive loading={revoke.isPending} onConfirm={async () => { try { await revoke.mutateAsync(); toast.success("Tracking link revoked"); } catch (e) { setError({ message: errorMessage(e) }); } setConfirm(null); }} />
      {token ? <TokenDialog token={token} onClose={() => setToken(null)} /> : null}
    </div>
  );
}

/** One-time reveal of the raw link, with a preview of exactly what the public endpoint returns. */
function TokenDialog({ token, onClose }: { token: TrackingToken; onClose: () => void }) {
  const link = token.url ?? token.path;
  const [preview, setPreview] = useState<PublicTracking | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Tracking link created" description="Copy it now. It is shown only once and cannot be recovered later." className="max-w-lg">
        <div className="space-y-3 text-sm" data-testid="token-dialog">
          <div className="flex gap-2"><Input readOnly aria-label="Tracking link" value={link} onFocus={(e) => e.currentTarget.select()} /><Button variant="secondary" aria-label="Copy tracking link" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Link copied"); } catch { toast.error("Could not copy — select the link and copy it manually."); } }}><Copy /> Copy</Button></div>
          {!token.url ? <p className="text-xs text-muted-foreground">The public app URL is not configured on the server, so only the path is shown. Prefix it with the public website address.</p> : null}
          <p className="text-xs text-muted-foreground">{token.expiresAt ? `Expires ${formatDateTime(token.expiresAt)}` : "No expiry"}</p>
          <div className="space-y-2 border-t pt-3">
            <Button size="sm" variant="secondary" loading={busy} onClick={async () => { setBusy(true); setErr(null); try { setPreview(await api.fetchPublicTracking(token.token)); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); } }}>Public tracking preview</Button>
            {err ? <p role="alert" className="text-xs text-danger">{err}</p> : null}
            {preview ? (
              <div className="rounded-md border p-3" data-testid="public-preview">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Public tracking preview — what the customer can see</p>
                <p className="font-medium">{preview.orderNumber} · {humanizeStatus(preview.status)}</p>
                <p className="text-xs text-muted-foreground">{preview.currentStage ? `Now: ${preview.currentStage} · ` : ""}{preview.progressPercent}% through production · {formatNumber(preview.deliveredQuantity)} of {formatNumber(preview.totalQuantity)} delivered ({formatNumber(preview.remainingDeliveryQuantity)} remaining)</p>
                <ul className="mt-1 space-y-0.5 text-xs">{preview.shipments.map((s) => <li key={s.shipmentNumber}>{s.shipmentNumber}: {humanizeStatus(s.status)} · {s.quantity} units</li>)}</ul>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
const humanizeStatus = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
