"use client";

import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/errors";

import * as api from "./api";
import { useSampleInvalidation, useSampleNotes } from "./hooks";
import type { SampleNote } from "./types";
import { useI18n } from "@/i18n/provider";

/** Admin-only notes. INTERNAL is the default; CUSTOMER_VISIBLE notes are stored but not exposed anywhere yet. */
export function NotesPanel({ sampleId, canWrite, currentUserId }: { sampleId: string; canWrite: boolean; currentUserId?: string }) {
  const { t, fmt } = useI18n();
  const q = useSampleNotes(sampleId);
  const inv = useSampleInvalidation();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"INTERNAL" | "CUSTOMER_VISIBLE">("INTERNAL");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<SampleNote | null>(null);
  const add = useMutation({ mutationFn: () => api.createNote(sampleId, { content: content.trim(), visibility }), onSuccess: () => { void inv.notes(sampleId); } });
  const remove = useMutation({ mutationFn: (n: SampleNote) => api.deleteNote(sampleId, n.id), onSuccess: () => { void inv.notes(sampleId); } });

  return (
    <Card aria-labelledby="notes-title">
      <CardHeader><CardTitle><span id="notes-title">{t("common.notes")}</span></CardTitle><span className="text-xs text-muted-foreground">{t("samples.adminOnly")}</span></CardHeader>
      {canWrite ? (
        <CardContent className="border-b">
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await add.mutateAsync(); setContent(""); setVisibility("INTERNAL"); toast.success(t("samples.noteAdded")); } catch (err) { setError(errorMessage(err)); } }}>
            {error ? <FormError message={error} /> : null}
            <FormField id="note-content" label={t("samples.addANote")}><Textarea id="note-content" rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={4000} /></FormField>
            <div className="flex flex-wrap items-end gap-3">
              <FormField id="note-vis" label={t("samples.visibility")} className="w-56" hint={visibility === "CUSTOMER_VISIBLE" ? t("samples.storedForLaterNotShownTo") : t("samples.visibleToStaffOnly")}>
                <Select id="note-vis" value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)} options={[{ value: "INTERNAL", label: t("samples.internalStaffOnly") }, { value: "CUSTOMER_VISIBLE", label: t("samples.customerVisibleLater") }]} />
              </FormField>
              <Button type="submit" loading={add.isPending} disabled={content.trim().length === 0}>{t("samples.addNote")}</Button>
            </div>
          </form>
        </CardContent>
      ) : null}
      {q.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" /> : q.data && q.data.length === 0 ? <EmptyState title={t("samples.noNotesYet")} className="py-8" /> : (
        <ul className="divide-y" data-testid="notes">
          {q.data?.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">{n.authorName}</span> · {fmt.dateTime(n.createdAt)} <Badge variant={n.visibility === "INTERNAL" ? "outline" : "brand"}>{n.visibility === "INTERNAL" ? t("samples.internal") : t("samples.customerVisible")}</Badge></p>
                <p className="mt-1 whitespace-pre-wrap">{n.content}</p>
              </div>
              {canWrite && n.authorUserId === currentUserId ? <IconButton size="sm" label={t("samples.deleteNote")} icon={<Trash2 />} onClick={() => setRemoving(n)} /> : null}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title={t("samples.deleteThisNote")} description={t("samples.notesAreRemovedPermanently")} confirmLabel={t("samples.deleteNote")} destructive loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing, { onSuccess: () => { toast.success(t("samples.noteDeleted")); setRemoving(null); }, onError: (e) => { toast.error(errorMessage(e)); setRemoving(null); } })} />
    </Card>
  );
}
