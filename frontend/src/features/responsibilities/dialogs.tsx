"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { useAuth } from "@/features/auth/auth-provider";
import { filterEligible, roleCodes } from "@/features/production/admin-dialogs";
import { useStaffSearch } from "@/features/samples/hooks";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import { humanizeCode } from "@/lib/utils/format";
import * as api from "./api";
import { useResponsibilityInvalidation } from "./hooks";
import type { ApplyMode } from "./types";

const errState = (e: unknown) => ({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined });

/**
 * Pick the person who owns an area. The list is the existing staff source (the one job assignment uses), narrowed to the roles
 * the area accepts; the backend re-validates eligibility on write. Workload is not shown: the staff list does not return it.
 */
export function WorkerPickerDialog({ title, stageLabel, eligibleRoleCodes, currentUserId, scopeText, saveLabel = "Save", onSave, onClose }: {
  title: string; stageLabel: string; eligibleRoleCodes: string[]; currentUserId?: string | null; scopeText: (name: string) => string;
  saveLabel?: string; onSave: (userId: string) => Promise<unknown>; onClose: (savedUserId?: string) => void;
}) {
  const { can } = useAuth();
  const canSearch = can("users.read");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const staff = useStaffSearch(search, canSearch);
  const list = filterEligible(staff.data?.data ?? [], eligibleRoleCodes);
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title={title} description={eligibleRoleCodes.length ? `Eligible roles: ${eligibleRoleCodes.map(humanizeCode).join(", ")}.` : `Who should own ${stageLabel}?`} className="max-h-[90vh] overflow-y-auto">
        <div className="space-y-3">
          {error ? <FormError {...error} /> : null}
          {canSearch ? (
            <>
              <SearchInput value={search} onValueChange={setSearch} placeholder="Search staff by name or email…" aria-label="Search staff" />
              <ul role="radiogroup" aria-label="Eligible staff" className="max-h-60 overflow-y-auto rounded-md border">
                {staff.isLoading ? <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li> : list.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">No eligible staff match.</li> : list.map((s) => {
                  const on = picked?.id === s.id;
                  return (
                    <li key={s.id}>
                      <button type="button" role="radio" aria-checked={on} onClick={() => setPicked({ id: s.id, name: s.name })} className={cn("flex w-full flex-col px-3 py-2 text-start text-sm hover:bg-white/5", on && "bg-brand-soft/40 shadow-[inset_2px_0_0_var(--brand)]")}>
                        <span className="font-medium">{s.name}{s.id === currentUserId ? <span className="ms-2 text-xs font-normal text-muted-foreground">current</span> : null}</span>
                        <span className="text-xs text-muted-foreground">{roleCodes(s).map(humanizeCode).join(", ") || s.email}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : <p className="text-sm text-muted-foreground">Listing staff needs the users permission, which your role does not have.</p>}
          {picked ? <p role="status" data-testid="scope-text" className="rounded-md bg-surface-sunken px-3 py-2 text-sm">{scopeText(picked.name)}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onClose()} disabled={busy}>Cancel</Button>
            <Button type="button" disabled={!picked || picked.id === currentUserId} loading={busy} onClick={async () => {
              if (!picked) return; setBusy(true); setError(null);
              try { await onSave(picked.id); onClose(picked.id); } catch (e) { setError(errState(e)); } finally { setBusy(false); }
            }}>{saveLabel}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MODES: Array<{ mode: ApplyMode; title: string; text: string }> = [
  { mode: "UNASSIGNED_ONLY", title: "Assign unassigned only", text: "Fills open stages nobody owns. Existing assignments stay as they are. Recommended." },
  { mode: "REPLACE", title: "Replace eligible existing assignments", text: "Also replaces the owner of stages that have not started (waiting, ready or blocked). Replaced assignments stay in the history." },
];

/** Applies the current rule to work that already exists. The backend offers no preview, so the result is shown after it runs. */
export function ApplyActiveDialog({ stageKey, stageLabel, customer, intro, onClose }: { stageKey: string; stageLabel: string; customer?: { id: string; name: string }; intro?: string; onClose: () => void }) {
  const { can } = useAuth();
  const invalidate = useResponsibilityInvalidation();
  const [mode, setMode] = useState<ApplyMode>("UNASSIGNED_ONLY");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [result, setResult] = useState<{ done: true; counts: Array<[string, number]> } | null>(null);
  const allowed = can("responsibilities.manage") && can("jobs.assign");
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title={`Apply ${stageLabel} responsibility to active work`} description={customer ? `Only ${customer.name}'s active work.` : "Active work for every customer. Customer overrides still win."} className="max-h-[90vh] overflow-y-auto">
        {result ? (
          <div className="space-y-3" data-testid="apply-result" role="status">
            <p className="font-medium">Applied.</p>
            {result.counts.length ? <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">{result.counts.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{humanizeCode(k.replace(/([a-z])([A-Z])/g, "$1_$2"))}</dt><dd className="tabular-nums">{v}</dd></div>)}</dl> : null}
            <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
          </div>
        ) : (
          <div className="space-y-3">
            {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
            {error ? <FormError {...error} /> : null}
            <ul role="radiogroup" aria-label="How to apply" className="space-y-2">
              {MODES.map((m) => (
                <li key={m.mode}>
                  <button type="button" role="radio" aria-checked={mode === m.mode} onClick={() => setMode(m.mode)} className={cn("w-full rounded-md border p-3 text-start", mode === m.mode ? "border-brand bg-brand-soft/40" : "hover:border-border-strong")}>
                    <span className="block text-sm font-semibold">{m.title}</span><span className="block text-xs text-muted-foreground">{m.text}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Started or completed work will not be changed.</p>
            {mode === "REPLACE" ? (
              <div className="flex items-start gap-2 rounded-md border border-tone-warning-dot/50 bg-tone-warning-bg p-3 text-sm text-tone-warning-fg">
                <Checkbox id="confirm-replace" checked={confirmReplace} onCheckedChange={(c) => setConfirmReplace(c === true)} className="mt-0.5" />
                <Label htmlFor="confirm-replace" className="font-normal leading-snug">I understand this replaces current owners on work that has not started.</Label>
              </div>
            ) : null}
            {!allowed ? <p className="text-xs text-danger">Applying needs both the responsibilities and the job assignment permissions.</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={busy}>Not now</Button>
              <Button disabled={!allowed || (mode === "REPLACE" && !confirmReplace)} loading={busy} variant={mode === "REPLACE" ? "danger" : "primary"} onClick={async () => {
                setBusy(true); setError(null);
                try {
                  const r = customer ? await api.applyCustomer(customer.id, stageKey, mode) : await api.applyGlobal(stageKey, mode);
                  invalidate(); toast.success("Applied to active work");
                  setResult({ done: true, counts: flatCounts(r) });
                } catch (e) { setError(errState(e)); } finally { setBusy(false); }
              }}>{mode === "REPLACE" ? "Replace assignments" : "Apply"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Numeric entries of the backend's result (nested ones like skipped.started are flattened). Nothing is added or computed. */
export function flatCounts(r: unknown, prefix = ""): Array<[string, number]> {
  if (!r || typeof r !== "object" || Array.isArray(r)) return [];
  return Object.entries(r as Record<string, unknown>).flatMap(([k, v]) => (typeof v === "number" ? [[prefix + k, v] as [string, number]] : flatCounts(v, `${prefix}${k} `)));
}
