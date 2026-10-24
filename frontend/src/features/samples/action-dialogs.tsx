"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/input";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { useSampleInvalidation } from "./hooks";
import * as api from "./api";
import type { ActionMeta } from "./actions";
import type { SampleDetail } from "./types";

/** Problems returned by a failed submit: "<section>: <message>" lines, shown together. */
export function submissionProblems(e: unknown): string[] | null {
  return isApiError(e) && e.kind === "validation" && e.messages.length > 0 ? e.messages : null;
}

/** Confirmation (+ reason when the backend requires one) for any lifecycle action route. */
export function ActionDialog({
  sample,
  meta,
  onClose,
  onProblems,
  onDone,
}: {
  sample: Pick<SampleDetail, "id" | "sampleNumber">;
  meta: ActionMeta;
  onClose: () => void;
  /** Receives backend validation messages (submit) so the page can show the summary. */
  onProblems?: (messages: string[]) => void;
  /** Called after the action succeeded (e.g. leave the edit page after submit). */
  onDone?: (updated: SampleDetail) => void;
}) {
  const router = useRouter();
  const inv = useSampleInvalidation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const reasonTrim = reason.trim();
  const needReason = meta.reason === "required" && reasonTrim.length === 0;

  const run = useMutation({
    mutationFn: () => api.sampleAction(sample.id, meta.route, meta.reason === "none" ? undefined : { reason: reasonTrim || undefined }),
    onSuccess: (updated) => {
      inv.afterAction(sample.id);
      toast.success(`${sample.sampleNumber}: ${meta.label.toLowerCase()} done`);
      onClose();
      onDone?.(updated);
      // `revise` returns the NEW revision (a new draft): go there.
      if (meta.action === "revise" && updated.id !== sample.id) router.push(`/samples/${updated.id}`);
    },
    onError: (e) => {
      const problems = meta.action === "submit" ? submissionProblems(e) : null;
      if (problems) {
        onProblems?.(problems);
        onClose();
        return;
      }
      setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined });
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`${meta.label} — ${sample.sampleNumber}`} description={meta.description}>
        <div className="space-y-3">
          {error ? <FormError {...error} /> : null}
          {meta.reason !== "none" ? (
            <div className="space-y-1.5">
              <Label htmlFor="action-reason">Reason{meta.reason === "required" ? <span aria-hidden className="ms-0.5 text-danger">*</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
              <Textarea id="action-reason" autoFocus rows={3} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} aria-required={meta.reason === "required"} />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={run.isPending}>Back</Button>
            <Button variant={meta.tone === "danger" ? "danger" : "primary"} loading={run.isPending} disabled={needReason} onClick={() => run.mutate()}>{meta.confirmLabel}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
