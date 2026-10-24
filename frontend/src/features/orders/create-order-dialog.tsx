"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { humanizeCode } from "@/lib/utils/format";
import * as api from "./api";
import { useOrderInvalidation } from "./hooks";
import { PRIORITIES } from "./types";

/** Starts a DRAFT bulk order from an APPROVED sample (its APPROVED_REFERENCE is pinned). Items/variants are entered on the order. */
export function CreateOrderDialog({ sample, onClose }: { sample: { id: string; sampleNumber: string }; onClose: () => void }) {
  const router = useRouter();
  const inv = useOrderInvalidation();
  const [priority, setPriority] = useState("NORMAL");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => api.createOrderFromSample(sample.id, { priority, ...(date ? { targetDeliveryDate: new Date(date).toISOString() } : {}), ...(notes.trim() ? { internalNotes: notes.trim() } : {}) }), onSuccess: () => inv.lists() });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={`Create bulk order from ${sample.sampleNumber}`} description="Creates a draft order that uses this sample's approved reference (never the pre-production specification). You enter quantities and variants on the order.">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { const o = await run.mutateAsync(); toast.success(`${o.orderNumber} created as a draft`); onClose(); router.push(`/orders/${o.id}?tab=variants`); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="co-prio" label="Priority"><Select id="co-prio" value={priority} onValueChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: humanizeCode(p) }))} /></FormField>
            <FormField id="co-date" label="Target delivery date"><DatePicker id="co-date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
          </div>
          <FormField id="co-notes" label="Internal notes"><Input id="co-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={run.isPending}>Create bulk order</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
