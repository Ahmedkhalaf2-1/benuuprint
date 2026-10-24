"use client";

import { Download, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { StageUploader } from "@/features/production/stage-parts";
import { api } from "@/lib/api/client";
import { resolveDownloadUrl } from "@/lib/api/assets";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { humanizeCode } from "@/lib/utils/format";
import * as fapi from "./api";
import { FormError } from "@/components/forms/field";
import type { AddressSnapshot } from "./types";

const ADDRESS_KEYS = ["recipientName", "country", "state", "city", "area", "addressLine1", "addressLine2", "postalCode", "notes"] as const;

/** The destination exactly as it was when the shipment was created. Read only: a different destination means a new shipment. */
export function AddressBlock({ snapshot }: { snapshot: AddressSnapshot }) {
  const a = (snapshot ?? {}) as Record<string, unknown>;
  const lines = ADDRESS_KEYS.map((k) => [k, a[k]] as const).filter(([, v]) => typeof v === "string" && v);
  return (
    <section aria-label="Delivery address" data-testid="address-snapshot" className="rounded-md border bg-surface-muted/50 p-3 text-sm">
      <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Lock aria-hidden className="size-3" /> Delivery address at shipment creation</p>
      {lines.length === 0 ? <p className="text-muted-foreground">No address recorded.</p> : <address className="not-italic">{lines.map(([k, v]) => <span key={k} className="block">{k === "notes" ? <span className="text-xs text-muted-foreground">Note: {String(v)}</span> : String(v)}</span>)}</address>}
    </section>
  );
}

/** Private proof: the signed URL is requested on click only and resolved against the API origin. */
export function ProofButton({ id, staff }: { id: string; staff: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="secondary" loading={busy} onClick={async () => {
      setBusy(true);
      try { const r = await api.get<{ url: string }>(fapi.proofUrlPath(id, staff)); window.open(resolveDownloadUrl(r.url), "_blank", "noopener,noreferrer"); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
    }}><Download /> View delivery proof</Button>
  );
}

export function ProofSection({ id, staff, hasProof, canUpload, onChanged }: { id: string; staff: boolean; hasProof: boolean; canUpload: boolean; onChanged: () => void }) {
  return (
    <section aria-label="Delivery proof" className="space-y-2" data-testid="proof-section">
      <h4 className="text-sm font-semibold">Delivery proof <span className="text-xs font-normal text-muted-foreground">(private)</span></h4>
      {hasProof ? <ProofButton id={id} staff={staff} /> : <p className="text-sm text-muted-foreground">No proof uploaded.</p>}
      {canUpload ? <StageUploader hint="Photo of the delivered goods or a signed receipt (PNG, JPEG, WebP or PDF). Stored privately." onUpload={async (f) => { await fapi.uploadProof(id, f, staff); onChanged(); }} /> : null}
    </section>
  );
}

/** Deliver: optional receiver note. A proof file can be uploaded first (it is attached to the shipment). */
export function DeliverDialog({ hasProof, onUploadProof, onSubmit, onClose }: { hasProof: boolean; onUploadProof: (f: File) => Promise<unknown>; onSubmit: (notes: string) => Promise<unknown>; onClose: () => void }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState(hasProof);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title="Confirm delivery" description="Records the shipment as delivered. Add a photo or signed receipt as proof if you have one.">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); setBusy(true); try { await onSubmit(notes.trim()); toast.success("Delivery confirmed"); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } finally { setBusy(false); } }}>
          {error ? <FormError {...error} /> : null}
          <StageUploader hint={proof ? "Proof attached. You can add another." : "Delivery photo or signed receipt (private)."} onUpload={async (f) => { await onUploadProof(f); setProof(true); }} />
          <FormField id="dl-notes" label="Received by / remarks"><Textarea id="dl-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Back</Button><Button type="submit" loading={busy}>Confirm delivered</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const METHOD_LABELS: Record<string, string> = { OWN_DELIVERY: "Own delivery", COURIER: "Courier", CUSTOMER_PICKUP: "Customer pickup" };
export const methodLabel = (m: string) => METHOD_LABELS[m] ?? humanizeCode(m);
