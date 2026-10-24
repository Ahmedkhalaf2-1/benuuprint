"use client";

import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { accessoryOptions, componentOptions } from "@/features/master-data/adapters";
import { useConfiguratorOptions } from "@/features/master-data/hooks";
import { errorMessage } from "@/lib/api/errors";
import { humanizeCode } from "@/lib/utils/format";
import * as api from "./api";
import { useSampleInvalidation } from "./hooks";
import type { SampleAccessory, SampleComponent, SampleDetail } from "./types";

type Kind = "accessory" | "component";
type Item = SampleAccessory | SampleComponent;
const CUSTOM = "__custom";

/** Accessories and labels/packaging both choose a master-data row OR a free-text name (exactly one). Specification only. */
export function AccessoriesEditor({ sample, editable }: { sample: SampleDetail; editable: boolean }) {
  const inv = useSampleInvalidation();
  const [editing, setEditing] = useState<{ kind: Kind; item: Item | null } | null>(null);
  const [removing, setRemoving] = useState<{ kind: Kind; item: Item } | null>(null);
  const remove = useMutation({
    mutationFn: ({ kind, item }: { kind: Kind; item: Item }) => (kind === "accessory" ? api.deleteAccessory(item.id) : api.deleteComponent(item.id)),
    onSuccess: () => { void inv.detail(sample.id); },
  });
  const nameOf = (kind: Kind, i: Item) => (kind === "accessory" ? (i as SampleAccessory).accessory?.name : (i as SampleComponent).componentOption?.name) ?? i.customName ?? "—";

  const section = (kind: Kind, title: string, items: Item[], emptyTitle: string) => (
    <Card id={kind === "accessory" ? "sec-accessories" : "sec-components"} aria-labelledby={`${kind}-title`} className="scroll-mt-20">
      <CardHeader>
        <CardTitle><span id={`${kind}-title`}>{title}</span></CardTitle>
        {editable ? <Button size="sm" variant="secondary" onClick={() => setEditing({ kind, item: null })}><Plus /> Add</Button> : null}
      </CardHeader>
      {items.length === 0 ? <EmptyState title={emptyTitle} className="py-6" /> : (
        <ul className="divide-y" data-testid={`${kind}s`}>
          {items.map((i) => (
            <li key={i.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {nameOf(kind, i)}
                  {i.customName ? <Badge variant="outline">Custom</Badge> : null}
                  {kind === "component" && (i as SampleComponent).category ? <Badge variant="outline">{humanizeCode((i as SampleComponent).category!)}</Badge> : null}
                  {kind === "accessory" && (i as SampleAccessory).quantity != null ? <span className="font-normal text-muted-foreground">× {(i as SampleAccessory).quantity}</span> : null}
                </p>
                {i.notes ? <p className="text-xs text-muted-foreground">{i.notes}</p> : null}
              </div>
              {editable ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><IconButton size="sm" label={`Actions for ${nameOf(kind, i)}`} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setEditing({ kind, item: i })}>Edit</DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setRemoving({ kind, item: i })}>Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      {section("accessory", "Accessories", sample.accessories, "No accessories")}
      {section("component", "Labels & packaging", sample.components, "No labels or packaging components")}
      {editing ? <ItemDialog sampleId={sample.id} kind={editing.kind} item={editing.item} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing ? nameOf(removing.kind, removing.item) : "item"}?`}
        description="It is removed from the draft specification."
        confirmLabel="Remove"
        destructive
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing, { onSuccess: () => { toast.success("Removed"); setRemoving(null); }, onError: (e) => { toast.error(errorMessage(e)); setRemoving(null); } })}
      />
    </div>
  );
}

function ItemDialog({ sampleId, kind, item, onClose }: { sampleId: string; kind: Kind; item: Item | null; onClose: () => void }) {
  const inv = useSampleInvalidation();
  const config = useConfiguratorOptions();
  const opts = kind === "accessory" ? accessoryOptions(config.data) : componentOptions(config.data);
  const initialId = item ? (kind === "accessory" ? (item as SampleAccessory).accessory?.id : (item as SampleComponent).componentOption?.id) : undefined;
  const [choice, setChoice] = useState<string>(item ? (initialId ?? CUSTOM) : "");
  const [customName, setCustomName] = useState(item?.customName ?? "");
  const [quantity, setQuantity] = useState(item && kind === "accessory" && (item as SampleAccessory).quantity != null ? String((item as SampleAccessory).quantity) : "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const isCustom = choice === CUSTOM;
      const base = kind === "accessory"
        ? { ...(isCustom ? { customName: customName.trim() } : { accessoryId: choice }), quantity: quantity.trim() ? Number(quantity) : null, notes: notes.trim() || null }
        : { ...(isCustom ? { customName: customName.trim() } : { componentOptionId: choice }), notes: notes.trim() || null };
      if (!item) {
        const clean = Object.fromEntries(Object.entries(base).filter(([, v]) => v !== null));
        return kind === "accessory" ? api.createAccessory(sampleId, clean) : api.createComponent(sampleId, clean);
      }
      // switching between catalogue and custom is explicit on update (exactly one may be set)
      const patch = isCustom
        ? { ...base, ...(kind === "accessory" ? { accessoryId: null } : { componentOptionId: null }) }
        : { ...base, customName: null };
      return kind === "accessory" ? api.updateAccessory(item.id, patch as never) : api.updateComponent(item.id, patch as never);
    },
    onSuccess: () => { void inv.detail(sampleId); },
  });

  const submit = async () => {
    setError(null);
    if (!choice) return setFieldError("Choose an option or enter a custom name");
    if (choice === CUSTOM && customName.trim().length < 2) return setFieldError("Enter a name (at least 2 characters)");
    if (quantity.trim() && !(/^\d+$/.test(quantity.trim()) && Number(quantity) > 0)) return setFieldError("Quantity must be a whole number above 0");
    setFieldError(null);
    try {
      await save.mutateAsync();
      toast.success(item ? "Updated" : "Added");
      onClose();
    } catch (e) {
      setError({ message: errorMessage(e) });
    }
  };

  const title = `${item ? "Edit" : "Add"} ${kind === "accessory" ? "accessory" : "label / packaging item"}`;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={title}>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate className="space-y-3">
          {error ? <FormError {...error} /> : null}
          <FormField id="i-choice" label={kind === "accessory" ? "Accessory" : "Component"} required error={fieldError ?? undefined}>
            <Select id="i-choice" value={choice} onValueChange={setChoice} placeholder="Choose…" options={[...opts.map((o) => ({ value: o.value, label: o.label })), { value: CUSTOM, label: "Custom (free text)…" }]} />
          </FormField>
          {choice === CUSTOM ? <FormField id="i-custom" label="Custom name" required><Input id="i-custom" value={customName} onChange={(e) => setCustomName(e.target.value)} /></FormField> : null}
          {kind === "accessory" ? <FormField id="i-qty" label="Quantity"><Input id="i-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></FormField> : null}
          <FormField id="i-notes" label="Notes"><Textarea id="i-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{item ? "Save" : "Add"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
