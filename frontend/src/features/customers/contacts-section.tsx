"use client";

import { zodResolver } from "@/lib/forms/resolver";
import { Mail, MoreHorizontal, Phone, Plus, Star } from "lucide-react";
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
import { useMutation } from "@tanstack/react-query";

import * as api from "./api";
import { useCustomerContacts, useCustomerInvalidation } from "./hooks";
import { CONTACT_FIELDS, contactSchema, emptyToNull, omitEmpty, type ContactFormValues } from "./schemas";
import { CONTACT_ROLES, type CustomerContact } from "./types";
import { useI18n } from "@/i18n/provider";

export function ContactsSection({ customerId, canManage }: { customerId: string; canManage: boolean }) {
  const { t, fmt } = useI18n();
  const q = useCustomerContacts(customerId);
  const inv = useCustomerInvalidation();
  const [editing, setEditing] = useState<CustomerContact | "new" | null>(null);
  const [removing, setRemoving] = useState<CustomerContact | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => api.archiveContact(id), onSuccess: () => void inv.contacts(customerId) });

  return (
    <Card aria-labelledby="contacts-title">
      <CardHeader>
        <CardTitle><span id="contacts-title">{t("customers.contacts")}</span></CardTitle>
        {canManage ? <Button size="sm" variant="secondary" onClick={() => setEditing("new")}><Plus />{" "}{t("customers.addContact")}</Button> : null}
      </CardHeader>
      {q.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" />
      ) : q.data && q.data.length === 0 ? (
        <EmptyState title={t("customers.noContactsYet")} description={t("customers.addThePeopleToReachAt")} className="py-8" action={canManage ? <Button size="sm" onClick={() => setEditing("new")}><Plus />{" "}{t("customers.addContact")}</Button> : undefined} />
      ) : (
        <ul className="divide-y">
          {q.data?.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {c.name}
                  {c.isPrimary ? <Badge variant="brand"><Star aria-hidden className="size-3" />{" "}{t("customers.primary")}</Badge> : null}
                  <Badge variant="outline">{fmt.code(c.role)}</Badge>
                </p>
                {c.jobTitle ? <p className="text-xs text-muted-foreground">{c.jobTitle}</p> : null}
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                  {c.email ? <span className="inline-flex items-center gap-1"><Mail aria-hidden className="size-3.5" />{c.email}</span> : null}
                  {c.phone ? <span className="inline-flex items-center gap-1"><Phone aria-hidden className="size-3.5" />{c.phone}</span> : null}
                  {c.whatsapp ? <span>{t("customers.whatsappWhatsapp", { whatsapp: c.whatsapp })}</span> : null}
                </p>
                {c.notes ? <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p> : null}
              </div>
              {canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><IconButton size="sm" label={t("customers.actionsForName", { name: c.name })} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setEditing(c)}>{t("common.edit")}</DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setRemoving(c)}>{t("customers.archive")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editing ? <ContactDialog customerId={customerId} contact={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t("customers.archiveV1", { v1: removing?.name ?? "contact" })}
        description={t("customers.theContactIsRemovedFromThis")}
        confirmLabel={t("customers.archiveContact")}
        destructive
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => { toast.success(t("customers.contactArchived")); setRemoving(null); }, onError: (e) => { toast.error(errorMessage(e)); setRemoving(null); } })}
      />
    </Card>
  );
}

function ContactDialog({ customerId, contact, onClose }: { customerId: string; contact: CustomerContact | null; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const inv = useCustomerInvalidation();
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null);
  const save = useMutation({
    mutationFn: (v: ContactFormValues) => (contact ? api.updateContact(contact.id, emptyToNull(v, ["name", "role", "isPrimary"]) as api.ContactBody) : api.createContact(customerId, omitEmpty(v) as api.ContactBody)),
    onSuccess: () => void inv.contacts(customerId),
  });
  const { register, control, handleSubmit, setError, setValue, formState: { errors, isDirty } } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: contact?.name ?? "", role: contact?.role ?? "OTHER", jobTitle: contact?.jobTitle ?? "", email: contact?.email ?? "", phone: contact?.phone ?? "", whatsapp: contact?.whatsapp ?? "", notes: contact?.notes ?? "", isPrimary: contact?.isPrimary ?? false },
  });
  const w_role = useWatch({ control, name: "role" });
  const w_isPrimary = useWatch({ control, name: "isPrimary" });
  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await save.mutateAsync(v);
      toast.success(contact ? t("customers.contactUpdated") : t("customers.contactAdded"));
      onClose();
    } catch (e) {
      const m = applyApiErrors(e, setError, CONTACT_FIELDS);
      if (m.formMessage) setFormError({ message: m.formMessage, requestId: m.requestId });
    }
  });
  const err = (n: keyof ContactFormValues) => errors[n]?.message;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={contact ? t("customers.editContact") : t("customers.addContact")} className="max-w-lg">
        <form onSubmit={onSubmit} noValidate className="space-y-3">
          {formError ? <FormError {...formError} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="c-name" label={t("common.name")} required error={err("name")} className="sm:col-span-2"><Input id="c-name" autoFocus aria-invalid={!!errors.name} {...register("name")} /></FormField>
            <FormField id="c-role" label={t("customers.role")}><Select id="c-role" value={w_role} onValueChange={(v) => setValue("role", v as ContactFormValues["role"], { shouldDirty: true })} options={CONTACT_ROLES.map((r) => ({ value: r, label: fmt.code(r) }))} /></FormField>
            <FormField id="c-jobTitle" label={t("customers.jobTitle")} error={err("jobTitle")}><Input id="c-jobTitle" {...register("jobTitle")} /></FormField>
            <FormField id="c-email" label={t("customers.email")} error={err("email")}><Input id="c-email" type="email" aria-invalid={!!errors.email} {...register("email")} /></FormField>
            <FormField id="c-phone" label={t("common.phone")} error={err("phone")}><Input id="c-phone" type="tel" {...register("phone")} /></FormField>
            <FormField id="c-whatsapp" label={t("customers.whatsapp")} error={err("whatsapp")}><Input id="c-whatsapp" type="tel" {...register("whatsapp")} /></FormField>
            <FormField id="c-notes" label={t("common.notes")} error={err("notes")} className="sm:col-span-2"><Textarea id="c-notes" rows={2} {...register("notes")} /></FormField>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c-primary" checked={w_isPrimary} onCheckedChange={(c) => setValue("isPrimary", c === true, { shouldDirty: true })} />
            <Label htmlFor="c-primary">{t("customers.primaryContact")}{" "}<span className="font-normal text-muted-foreground">{t("customers.replacesTheCurrentPrimary")}</span></Label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" loading={save.isPending} disabled={!!contact && !isDirty}>{contact ? t("customers.save") : t("customers.addContact")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
