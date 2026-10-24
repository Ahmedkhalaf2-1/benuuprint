"use client";

import { zodResolver } from "@/lib/forms/resolver";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/errors";
import { applyApiErrors } from "@/lib/forms/api-errors";

import * as api from "./api";
import { useCustomerAddresses, useCustomerInvalidation } from "./hooks";
import { ADDRESS_FIELDS, addressSchema, emptyToNull, omitEmpty, type AddressFormValues } from "./schemas";
import { ADDRESS_TYPES, type CustomerAddress } from "./types";
import { useI18n } from "@/i18n/provider";

export function AddressesSection({ customerId, canManage }: { customerId: string; canManage: boolean }) {
  const { t, fmt } = useI18n();
  const q = useCustomerAddresses(customerId);
  const inv = useCustomerInvalidation();
  const [editing, setEditing] = useState<CustomerAddress | "new" | null>(null);
  const [removing, setRemoving] = useState<CustomerAddress | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => api.archiveAddress(id), onSuccess: () => void inv.addresses(customerId) });

  return (
    <Card aria-labelledby="addresses-title">
      <CardHeader>
        <CardTitle><span id="addresses-title">{t("customers.addresses")}</span></CardTitle>
        {canManage ? <Button size="sm" variant="secondary" onClick={() => setEditing("new")}><Plus />{" "}{t("customers.addAddress")}</Button> : null}
      </CardHeader>
      {q.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" />
      ) : q.data && q.data.length === 0 ? (
        <EmptyState title={t("customers.noAddressesYet")} description={t("customers.billingShippingAndPickupAddressesAppear")} className="py-8" action={canManage ? <Button size="sm" onClick={() => setEditing("new")}><Plus />{" "}{t("customers.addAddress")}</Button> : undefined} />
      ) : (
        <ul className="divide-y">
          {q.data?.map((a) => (
            <li key={a.id} className="flex items-start gap-2 px-4 py-3">
              <div className="min-w-0 flex-1 text-sm">
                <p className="mb-1 flex flex-wrap items-center gap-2"><Badge variant="outline">{fmt.code(a.type)}</Badge>{a.isDefault ? <Badge variant="brand">{t("customers.default")}</Badge> : null}</p>
                <p>{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}</p>
                <p className="text-muted-foreground">{[a.area, a.city, a.state, a.postalCode].filter(Boolean).join(", ")}</p>
                <p className="text-muted-foreground">{a.country}</p>
                {a.notes ? <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p> : null}
              </div>
              {canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><IconButton size="sm" label={t("customers.actionsForTypeAddress", { type: fmt.code(a.type) })} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setEditing(a)}>{t("common.edit")}</DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setRemoving(a)}>{t("customers.archive")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editing ? <AddressDialog customerId={customerId} address={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t("customers.archiveThisAddress")}
        description={t("customers.theAddressIsRemovedFromThis")}
        confirmLabel={t("customers.archiveAddress")}
        destructive
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => { toast.success(t("customers.addressArchived")); setRemoving(null); }, onError: (e) => { toast.error(errorMessage(e)); setRemoving(null); } })}
      />
    </Card>
  );
}

function AddressDialog({ customerId, address, onClose }: { customerId: string; address: CustomerAddress | null; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const inv = useCustomerInvalidation();
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null);
  const save = useMutation({
    mutationFn: (v: AddressFormValues) => (address ? api.updateAddress(address.id, emptyToNull(v, ["type", "country", "city", "addressLine1", "isDefault"]) as api.AddressBody) : api.createAddress(customerId, omitEmpty(v) as api.AddressBody)),
    onSuccess: () => void inv.addresses(customerId),
  });
  const { register, control, handleSubmit, setError, setValue, formState: { errors, isDirty } } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { type: address?.type ?? "SHIPPING", country: address?.country ?? "", state: address?.state ?? "", city: address?.city ?? "", area: address?.area ?? "", addressLine1: address?.addressLine1 ?? "", addressLine2: address?.addressLine2 ?? "", postalCode: address?.postalCode ?? "", notes: address?.notes ?? "", isDefault: address?.isDefault ?? false },
  });
  const w_type = useWatch({ control, name: "type" });
  const w_isDefault = useWatch({ control, name: "isDefault" });
  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await save.mutateAsync(v);
      toast.success(address ? t("customers.addressUpdated") : t("customers.addressAdded"));
      onClose();
    } catch (e) {
      const m = applyApiErrors(e, setError, ADDRESS_FIELDS);
      if (m.formMessage) setFormError({ message: m.formMessage, requestId: m.requestId });
    }
  });
  const err = (n: keyof AddressFormValues) => errors[n]?.message;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={address ? t("customers.editAddress") : t("customers.addAddress")} className="max-w-lg">
        <form onSubmit={onSubmit} noValidate className="space-y-3">
          {formError ? <FormError {...formError} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="a-type" label={t("common.type")}><Select id="a-type" value={w_type} onValueChange={(v) => setValue("type", v as AddressFormValues["type"], { shouldDirty: true })} options={ADDRESS_TYPES.map((t) => ({ value: t, label: fmt.code(t) }))} /></FormField>
            <FormField id="a-country" label={t("customers.country")} required error={err("country")}><Input id="a-country" aria-invalid={!!errors.country} {...register("country")} /></FormField>
            <FormField id="a-state" label={t("customers.stateGovernorate")} error={err("state")}><Input id="a-state" {...register("state")} /></FormField>
            <FormField id="a-city" label={t("customers.city")} required error={err("city")}><Input id="a-city" aria-invalid={!!errors.city} {...register("city")} /></FormField>
            <FormField id="a-area" label={t("common.area")} error={err("area")}><Input id="a-area" {...register("area")} /></FormField>
            <FormField id="a-postalCode" label={t("customers.postalCode")} error={err("postalCode")}><Input id="a-postalCode" {...register("postalCode")} /></FormField>
            <FormField id="a-addressLine1" label={t("customers.addressLine1")} required error={err("addressLine1")} className="sm:col-span-2"><Input id="a-addressLine1" aria-invalid={!!errors.addressLine1} {...register("addressLine1")} /></FormField>
            <FormField id="a-addressLine2" label={t("customers.addressLine2")} error={err("addressLine2")} className="sm:col-span-2"><Input id="a-addressLine2" {...register("addressLine2")} /></FormField>
            <FormField id="a-notes" label={t("common.notes")} error={err("notes")} className="sm:col-span-2"><Textarea id="a-notes" rows={2} {...register("notes")} /></FormField>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="a-default" checked={w_isDefault} onCheckedChange={(c) => setValue("isDefault", c === true, { shouldDirty: true })} />
            <Label htmlFor="a-default">{t("customers.defaultForThisType")}{" "}<span className="font-normal text-muted-foreground">{t("customers.replacesTheCurrentDefault")}</span></Label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" loading={save.isPending} disabled={!!address && !isDirty}>{address ? t("customers.save") : t("customers.addAddress")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
