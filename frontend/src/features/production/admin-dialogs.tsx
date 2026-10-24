"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { useStaffSearch } from "@/features/samples/hooks";
import type { StaffUser } from "@/features/samples/types";
import type { StageDefinition } from "./types";

export const roleCodes = (u: StaffUser) => (u.roles ?? []).map((r) => (typeof r === "string" ? r : r.code ?? "")).filter(Boolean);

/** Only active staff whose role is eligible for the stage (per the stage definition). Users without role data are kept; the backend re-checks. */
export const filterEligible = (users: StaffUser[], eligible: string[]) => users.filter((u) => { const r = roleCodes(u); return eligible.length === 0 || r.length === 0 || r.some((c) => eligible.includes(c)); });

/** Mandatory-reason confirmation for hold / override / cancel / force-complete: nothing is sent without a reason. */
export function ReasonDialog({ title, description, confirmLabel, destructive, extra, minLength = 3, onSubmit, onClose }: {
  title: string; description: string; confirmLabel: string; destructive?: boolean; minLength?: number;
  extra?: React.ReactNode; onSubmit: (reason: string) => Promise<unknown>; onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const run = useMutation({ mutationFn: () => onSubmit(reason.trim()) });
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={title} description={description}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await run.mutateAsync(); onClose(); } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } }}>
          {error ? <FormError {...error} /> : null}
          {extra}
          <FormField id="reason" label="Reason" required hint="Recorded in the job timeline."><Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Back</Button><Button type="submit" variant={destructive ? "danger" : "primary"} loading={run.isPending} disabled={reason.trim().length < minLength}>{confirmLabel}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssignStageDialog({ stageName, eligibleRoleCodes, canSearch, assignedIds, onAssign, onClose }: {
  stageName: string; eligibleRoleCodes: string[]; canSearch: boolean; assignedIds: string[]; onAssign: (userId: string, isPrimary: boolean) => Promise<unknown>; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const staff = useStaffSearch(search, canSearch);
  const assign = useMutation({ mutationFn: ({ id }: { id: string }) => onAssign(id, assignedIds.length === 0) });
  const list = filterEligible(staff.data?.data ?? [], eligibleRoleCodes).filter((u) => !assignedIds.includes(u.id));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Assign ${stageName}`} description={eligibleRoleCodes.length ? `Eligible roles: ${eligibleRoleCodes.join(", ")}. Admin accounts cannot operate stages themselves.` : "Choose who will do this stage."}>
        <div className="space-y-3">
          {error ? <FormError {...error} /> : null}
          {canSearch ? (
            <>
              <SearchInput value={search} onValueChange={setSearch} placeholder="Search staff by name or email…" aria-label="Search staff" />
              <ul role="listbox" aria-label="Eligible staff" className="max-h-60 overflow-y-auto">
                {staff.isLoading ? <li className="px-2 py-2 text-sm text-muted-foreground">Searching…</li> : list.length === 0 ? <li className="px-2 py-2 text-sm text-muted-foreground">No eligible staff match.</li> : list.map((s) => (
                  <li key={s.id} role="option" aria-selected={false}>
                    <button type="button" disabled={assign.isPending} onClick={async () => { setError(null); try { await assign.mutateAsync({ id: s.id }); toast.success(`Assigned to ${s.name}`); onClose(); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); } }} className="flex w-full flex-col rounded-sm px-2 py-1.5 text-start text-sm hover:bg-white/5">
                      <span className="font-medium">{s.name}</span><span className="text-xs text-muted-foreground">{s.email} · {roleCodes(s).join(", ") || "—"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="text-sm text-muted-foreground">Listing staff needs the users permission, which your role does not have.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReworkDialog({ stageName, defs, bulk, onSubmit, onClose }: { stageName: string; defs: StageDefinition[]; bulk: boolean; onSubmit: (b: { reason: string; targetStageCode?: string; affectedQuantity?: number }) => Promise<unknown>; onClose: () => void }) {
  const [target, setTarget] = useState("");
  const [qty, setQty] = useState("");
  return (
    <ReasonDialog title="Send back for rework" description={`Creates a rework record from ${stageName}; completed work is kept as history and the target stage is re-run.`} confirmLabel="Create rework" destructive
      extra={<>
        <FormField id="rw-target" label="Re-run from stage" hint="Defaults to the stage this one depends on."><Select id="rw-target" value={target || "__default"} onValueChange={(v) => setTarget(v === "__default" ? "" : v)} options={[{ value: "__default", label: "Workflow default" }, ...defs.map((d) => ({ value: d.code, label: d.name }))]} /></FormField>
        {bulk ? <FormField id="rw-qty" label="Units affected" hint="Only these units are redone (leave empty for the whole job)."><Input id="rw-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></FormField> : null}
      </>}
      onSubmit={(reason) => onSubmit({ reason, ...(target ? { targetStageCode: target } : {}), ...(bulk && /^\d+$/.test(qty.trim()) && Number(qty) > 0 ? { affectedQuantity: Number(qty) } : {}) })} onClose={onClose} />
  );
}
