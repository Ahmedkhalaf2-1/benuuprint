"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import * as api from "./api";
import { useSampleInvalidation, useStaffSearch } from "./hooks";
import type { SampleDetail } from "./types";

/**
 * Generic sales-owner picker used by samples and orders. The backend only accepts staff holding the required permission
 * and reports a clear error otherwise. The staff list needs users.read; without it only "assign to me" is offered.
 */
export function StaffAssignDialog({ title, description, currentId, onAssign, onClose }: { title: string; description: string; currentId?: string | null; onAssign: (userId: string | null) => Promise<unknown>; onClose: () => void }) {
  const { can, user } = useAuth();
  const canSearch = can("users.read");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<{ message: string } | null>(null);
  const staff = useStaffSearch(search, canSearch);
  const assign = useMutation({ mutationFn: onAssign });

  const run = async (userId: string | null, name: string) => {
    setError(null);
    try {
      await assign.mutateAsync(userId);
      toast.success(userId ? `Assigned to ${name}` : "Sales owner removed");
      onClose();
    } catch (e) {
      setError({ message: errorMessage(e) });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={title} description={description}>
        <div className="space-y-3">
          {error ? <FormError {...error} /> : null}
          {user ? <Button variant="secondary" className="w-full justify-start" loading={assign.isPending} onClick={() => run(user.id, "you")}>Assign to me ({user.name})</Button> : null}
          {canSearch ? (
            <>
              <SearchInput value={search} onValueChange={setSearch} placeholder="Search staff by name or email…" aria-label="Search staff" />
              <ul role="listbox" aria-label="Staff" className="max-h-56 overflow-y-auto">
                {staff.isLoading ? <li className="px-2 py-2 text-sm text-muted-foreground">Searching…</li> : staff.data?.data.length === 0 ? <li className="px-2 py-2 text-sm text-muted-foreground">No staff match.</li> : staff.data?.data.map((s) => (
                  <li key={s.id} role="option" aria-selected={currentId === s.id}>
                    <button type="button" onClick={() => run(s.id, s.name)} className="flex w-full flex-col rounded-sm px-2 py-1.5 text-start text-sm hover:bg-white/5">
                      <span className="font-medium">{s.name}</span><span className="text-xs text-muted-foreground">{s.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="text-xs text-muted-foreground">Searching other staff needs the users permission; you can assign to yourself.</p>}
          {currentId ? <Button variant="ghost" className="w-full" onClick={() => run(null, "")}>Remove sales owner</Button> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AssignSalesDialog({ sample, onClose }: { sample: SampleDetail; onClose: () => void }) {
  const inv = useSampleInvalidation();
  return (
    <StaffAssignDialog
      title="Assign sales owner"
      description={`${sample.sampleNumber} — currently ${sample.assignedSales ? sample.assignedSales.name : "unassigned"}.`}
      currentId={sample.assignedSales?.id}
      onAssign={async (userId) => { await api.assignSales(sample.id, userId); inv.afterAction(sample.id); }}
      onClose={onClose}
    />
  );
}
