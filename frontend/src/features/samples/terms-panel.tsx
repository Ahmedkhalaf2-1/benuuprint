"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfiguratorOptions } from "@/features/master-data/hooks";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/utils/format";
import { APPROVAL_MODE_LABELS, label } from "./labels";
import * as api from "./api";
import { useActiveTerms, useSampleInvalidation } from "./hooks";
import type { SampleDetail, Terms } from "./types";

/**
 * Active sample terms + acceptance. There is no customer login yet, so every acceptance is RECORDED BY STAFF on the
 * customer's behalf with a source note: the wording says so and never implies the customer accepted in the app.
 */
export function TermsPanel({ sample, canRecord }: { sample: SampleDetail; canRecord: boolean }) {
  const inv = useSampleInvalidation();
  const admin = useActiveTerms();
  const config = useConfiguratorOptions();
  // /admin/terms needs a terms permission some roles lack: fall back to the terms the configurator returns.
  const terms: Terms | null | undefined = admin.data ?? (admin.error ? (config.data?.terms as Terms | null | undefined) : undefined);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const record = useMutation({ mutationFn: () => api.recordTerms(sample.id, { sourceNote: note.trim(), termsVersionId: terms?.id }), onSuccess: () => { void inv.detail(sample.id); } });

  const loading = admin.isLoading || (!!admin.error && config.isLoading);
  const acceptedActive = !!terms && sample.termsAcceptances.some((a) => a.termsVersionId === terms.id);

  return (
    <Card id="sec-terms" aria-labelledby="terms-title" className="scroll-mt-20">
      <CardHeader><CardTitle><span id="terms-title">Sample terms</span></CardTitle>{acceptedActive ? <span className="inline-flex items-center gap-1 text-xs font-medium text-tone-success-fg"><CheckCircle2 aria-hidden className="size-4" /> Accepted</span> : null}</CardHeader>
      <CardContent className="space-y-4">
        {loading ? <Skeleton className="h-24" /> : admin.error && !terms && !isApiError(admin.error) ? <ErrorState error={admin.error} /> : !terms ? <p className="text-sm text-muted-foreground">No active sample terms are configured.</p> : (
          <>
            <div>
              <p className="text-sm font-semibold">{terms.title} <span className="font-normal text-muted-foreground">· version {terms.version}{terms.effectiveAt ? ` · effective ${formatDateTime(terms.effectiveAt)}` : ""}</span></p>
              <div tabIndex={0} role="region" aria-label="Terms text" className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border bg-surface-muted p-3 text-sm">{terms.content}</div>
            </div>
            {sample.termsAcceptances.length > 0 ? (
              <ul className="space-y-1.5" data-testid="terms-acceptances">
                {sample.termsAcceptances.map((a) => (
                  <li key={a.id} className="rounded-md border px-3 py-2 text-sm">
                    <span className="font-medium">{a.title} v{a.version}</span> — {label(APPROVAL_MODE_LABELS, a.mode) || a.mode}
                    <span className="block text-xs text-muted-foreground">{formatDateTime(a.acceptedAt)}{a.sourceNote ? ` · Source: ${a.sourceNote}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No acceptance recorded yet. The active terms must be accepted before the sample can be submitted.</p>}
            {!acceptedActive && sample.termsAcceptances.length > 0 ? <p role="status" className="text-sm text-tone-warning-fg">The recorded acceptance is for an older version; version {terms.version} is now active.</p> : null}
            {canRecord && !acceptedActive ? (
              <form
                className="space-y-3 rounded-md border bg-surface-muted p-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  try { await record.mutateAsync(); toast.success(`Acceptance of version ${terms.version} recorded`); setNote(""); setConfirm(false); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); }
                }}
              >
                <p className="text-sm font-medium">Record acceptance of {terms.title} v{terms.version}</p>
                <p className="text-xs text-muted-foreground">Recorded by staff on the customer&apos;s behalf. The customer is not signing in to accept.</p>
                {error ? <FormError {...error} /> : null}
                <FormField id="terms-source" label="How was it accepted?" required hint="e.g. “Confirmed by WhatsApp on 21 Oct, 14:05”"><Textarea id="terms-source" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
                <div className="flex items-start gap-2"><Checkbox id="terms-confirm" checked={confirm} onCheckedChange={(c) => setConfirm(c === true)} className="mt-0.5" /><Label htmlFor="terms-confirm" className="font-normal">The customer accepted {terms.title} version {terms.version}.</Label></div>
                <Button type="submit" loading={record.isPending} disabled={!confirm || note.trim().length < 3}>Record acceptance of v{terms.version}</Button>
              </form>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
