"use client";

import { zodResolver } from "@/lib/forms/resolver";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { EmptyState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useConfiguratorOptions } from "@/features/master-data/hooks";
import { errorMessage } from "@/lib/api/errors";
import { applyApiErrors } from "@/lib/forms/api-errors";
import * as api from "./api";
import { useBrandArtworks, useSampleArtworks, useSampleInvalidation } from "./hooks";
import { PURPOSE_LABELS, SIDE_LABELS } from "./labels";
import { DECORATION_SIDES, DECORATION_UNITS, type SampleDecoration, type SampleDetail } from "./types";
import { useI18n } from "@/i18n/provider";

const num = (name: string, int = false) =>
  z.string().trim().refine((v) => v === "" || (int ? /^\d+$/.test(v) : /^\d+(\.\d{1,2})?$/.test(v)) && Number(v) > 0, int ? "Enter a whole number above 0" : "Enter a number above 0 (up to 2 decimals)").describe(name);

const schema = z.object({
  printMethodId: z.string().min(1, "Choose a print method"),
  placement: z.string().trim().min(1, "Describe where it goes (e.g. Chest)").max(120),
  side: z.enum(DECORATION_SIDES),
  width: num("width"), height: num("height"),
  unit: z.string(),
  colorCount: num("colorCount", true),
  notes: z.string().trim().max(1000),
  artworkRequired: z.boolean(),
  artworkId: z.string(),
}).refine((v) => !((v.width || v.height) && !v.unit), { path: ["unit"], message: "Choose a unit when width or height is set" });
type Values = z.infer<typeof schema>;
const FIELDS = ["printMethodId", "placement", "side", "width", "height", "unit", "colorCount", "notes", "artworkRequired", "artworkId"];

const n = (v: string) => (v.trim() === "" ? null : Number(v));

/** "No print" is simply zero decoration rows (backend representation). */
export function DecorationsEditor({ sample, editable }: { sample: SampleDetail; editable: boolean }) {
  const { t } = useI18n();
  const inv = useSampleInvalidation();
  const [editing, setEditing] = useState<SampleDecoration | "new" | null>(null);
  const [removing, setRemoving] = useState<SampleDecoration | null>(null);
  const artworks = useSampleArtworks(sample.id);
  const brandArtworks = useBrandArtworks(sample.brand.id);
  const allArtworks = [...(artworks.data ?? []), ...(brandArtworks.data ?? [])];
  const artworkName = (id: string | null) => (id ? allArtworks.find((a) => a.id === id)?.name ?? "Linked artwork" : null);
  const remove = useMutation({ mutationFn: (id: string) => api.deleteDecoration(id), onSuccess: () => { void inv.detail(sample.id); } });

  return (
    <Card id="sec-decoration" aria-labelledby="deco-title" className="scroll-mt-20">
      <CardHeader>
        <CardTitle><span id="deco-title">{t("samples.decorationPrint")}</span></CardTitle>
        {editable ? <Button size="sm" variant="secondary" onClick={() => setEditing("new")}><Plus />{" "}{t("samples.addDecoration")}</Button> : null}
      </CardHeader>
      {sample.decorations.length === 0 ? (
        <EmptyState title={t("samples.noDecorationThisSampleIsMade")} description={editable ? t("samples.addADecorationIfItNeeds") : undefined} className="py-8" />
      ) : (
        <ul className="divide-y" data-testid="decorations">
          {sample.decorations.map((d) => (
            <li key={d.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium">{d.printMethod.name}<span className="font-normal text-muted-foreground">· {d.placement} · {SIDE_LABELS[d.side] ?? d.side}</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[d.width || d.height ? `${d.width ?? "?"} × ${d.height ?? "?"} ${d.unit ?? ""}`.trim() : null, d.colorCount ? t.plural("samples", "colourCount", d.colorCount) : null].filter(Boolean).join(" · ") || t("samples.noSizeColourCount")}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {d.artworkRequired ? <Badge variant="outline">{t("samples.artworkRequired")}</Badge> : null}
                  {d.artworkId ? <span className="text-muted-foreground">{t("samples.artwork2")}{" "}<span className="font-medium text-foreground">{artworkName(d.artworkId)}</span></span> : d.artworkRequired ? <span className="font-medium text-tone-warning-fg">{t("samples.noArtworkLinkedYet")}</span> : null}
                </p>
                {d.notes ? <p className="mt-1 text-xs text-muted-foreground">{d.notes}</p> : null}
              </div>
              {editable ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><IconButton size="sm" label={t("samples.actionsForNameOnPlacement", { name: d.printMethod.name, placement: d.placement })} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setEditing(d)}>{t("common.edit")}</DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setRemoving(d)}>{t("samples.remove")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editing ? <DecorationDialog sample={sample} decoration={editing === "new" ? null : editing} artworks={allArtworks} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t("samples.removeThisDecoration")}
        description={t("samples.itIsRemovedFromTheDraft")}
        confirmLabel={t("samples.removeDecoration")}
        destructive
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => { toast.success(t("samples.decorationRemoved")); setRemoving(null); }, onError: (e) => { toast.error(errorMessage(e)); setRemoving(null); } })}
      />
    </Card>
  );
}

function DecorationDialog({ sample, decoration, artworks, onClose }: { sample: SampleDetail; decoration: SampleDecoration | null; artworks: Array<{ id: string; name: string; purpose: string }>; onClose: () => void }) {
  const { t } = useI18n();
  const inv = useSampleInvalidation();
  const config = useConfiguratorOptions();
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null);
  const { register, control, handleSubmit, setError, setValue, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      printMethodId: decoration?.printMethod.id ?? "", placement: decoration?.placement ?? "", side: (decoration?.side as Values["side"]) ?? "FRONT",
      width: decoration?.width ? String(Number(decoration.width)) : "", height: decoration?.height ? String(Number(decoration.height)) : "", unit: decoration?.unit ?? "CM",
      colorCount: decoration?.colorCount != null ? String(decoration.colorCount) : "", notes: decoration?.notes ?? "", artworkRequired: decoration?.artworkRequired ?? false, artworkId: decoration?.artworkId ?? "",
    },
  });
  const w = useWatch({ control });
  const method = config.data?.printMethods.find((m) => m.id === w.printMethodId);
  const save = useMutation({
    mutationFn: (v: Values) => {
      const body: api.DecorationBody = {
        printMethodId: v.printMethodId, placement: v.placement.trim(), side: v.side, width: n(v.width), height: n(v.height),
        unit: v.width || v.height ? v.unit : null, colorCount: n(v.colorCount), notes: v.notes.trim() || null, artworkRequired: v.artworkRequired, artworkId: v.artworkId || null,
      };
      if (decoration) return api.updateDecoration(decoration.id, body);
      // create: omit nulls
      return api.createDecoration(sample.id, Object.fromEntries(Object.entries(body).filter(([, x]) => x !== null)) as api.DecorationBody);
    },
    onSuccess: () => { void inv.detail(sample.id); },
  });
  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await save.mutateAsync(v);
      toast.success(decoration ? t("samples.decorationUpdated") : t("samples.decorationAdded"));
      onClose();
    } catch (e) {
      const m = applyApiErrors(e, setError, FIELDS);
      if (m.formMessage) setFormError({ message: m.formMessage, requestId: m.requestId });
    }
  });
  const err = (k: keyof Values) => errors[k]?.message as string | undefined;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={decoration ? t("samples.editDecoration") : t("samples.addDecoration")} className="max-w-xl">
        <form onSubmit={onSubmit} noValidate className="space-y-3">
          {formError ? <FormError {...formError} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="d-method" label={t("samples.printMethod")} required error={err("printMethodId")} hint={method ? [method.supportsFullColor ? t("samples.supportsFullColour") : null, method.maxColors ? t("samples.maxColoursN", { n: method.maxColors }) : null, method.minQuantity ? t("samples.minQuantityN", { n: method.minQuantity }) : null].filter(Boolean).join(" · ") || undefined : undefined}>
              <Select id="d-method" value={w.printMethodId ?? ""} onValueChange={(v) => setValue("printMethodId", v, { shouldDirty: true })} options={(config.data?.printMethods ?? []).map((m) => ({ value: m.id, label: m.name }))} placeholder={t("common.choose")} />
            </FormField>
            <FormField id="d-side" label={t("samples.side")}><Select id="d-side" value={w.side ?? "FRONT"} onValueChange={(v) => setValue("side", v as Values["side"], { shouldDirty: true })} options={DECORATION_SIDES.map((s) => ({ value: s, label: SIDE_LABELS[s] ?? s }))} /></FormField>
            <FormField id="d-placement" label={t("samples.placement")} required error={err("placement")} className="sm:col-span-2" hint={t("samples.eGChestUpperBackLeft")}><Input id="d-placement" aria-invalid={!!errors.placement} {...register("placement")} /></FormField>
            <FormField id="d-width" label={t("samples.width")} error={err("width")}><Input id="d-width" inputMode="decimal" {...register("width")} /></FormField>
            <FormField id="d-height" label={t("samples.height")} error={err("height")}><Input id="d-height" inputMode="decimal" {...register("height")} /></FormField>
            <FormField id="d-unit" label={t("samples.unit")} error={err("unit")}><Select id="d-unit" value={w.unit ?? "CM"} onValueChange={(v) => setValue("unit", v, { shouldDirty: true })} options={DECORATION_UNITS.map((u) => ({ value: u, label: u.toLowerCase() }))} /></FormField>
            <FormField id="d-colors" label={t("samples.colourCount")} error={err("colorCount")}><Input id="d-colors" inputMode="numeric" {...register("colorCount")} /></FormField>
            <FormField id="d-notes" label={t("common.notes")} error={err("notes")} className="sm:col-span-2"><Textarea id="d-notes" rows={2} {...register("notes")} /></FormField>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div><Label htmlFor="d-req">{t("samples.artworkRequired")}</Label><p className="text-xs text-muted-foreground">{t("samples.submissionNeedsAnArtworkWithA")}</p></div>
            <Switch id="d-req" checked={!!w.artworkRequired} onCheckedChange={(c) => setValue("artworkRequired", c, { shouldDirty: true })} />
          </div>
          <FormField id="d-art" label={t("samples.linkedArtwork")} error={err("artworkId")} hint={artworks.length === 0 ? t("samples.createArtworkInArtworkFilesFirst") : undefined}>
            <Select id="d-art" value={w.artworkId || "__none"} onValueChange={(v) => setValue("artworkId", v === "__none" ? "" : v, { shouldDirty: true })} options={[{ value: "__none", label: t("samples.noArtworkLinked") }, ...artworks.map((a) => ({ value: a.id, label: `${a.name} · ${PURPOSE_LABELS[a.purpose] ?? a.purpose}` }))]} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" loading={save.isPending} disabled={!!decoration && !isDirty}>{decoration ? t("samples.save") : t("samples.addDecoration")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
