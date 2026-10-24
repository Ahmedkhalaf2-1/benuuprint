"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { humanizeCode } from "@/lib/utils/format";
import * as api from "./api";
import { useCustomerContacts, useCustomerInvalidation } from "./hooks";
import { CONTACT_FIELDS, contactSchema, emptyToNull, omitEmpty, type ContactFormValues } from "./schemas";
import { CONTACT_ROLES, type CustomerContact } from "./types";

export function ContactsSection({ customerId, canManage }: { customerId: string; canManage: boolean }) {
  const q = useCustomerContacts(customerId);
  const inv = useCustomerInvalidation();
  const [editing, setEditing] = useState<CustomerContact | "new" | null>(null);
  const [removing, setRemoving] = useState<CustomerContact | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => api.archiveContact(id), onSuccess: () => void inv.contacts(customerId) });

  return (
    <Card aria-labelledby="contacts-title">
      <CardHeader>
        <CardTitle><span id="contacts-title">Contacts</span></CardTitle>
        {canManage ? <Button size="sm" variant="secondary" onClick={() => setEditing("new")}><Plus /> Add contact</Button> : null}
      </CardHeader>
      {q.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" />
      ) : q.data && q.data.length === 0 ? (
        <EmptyState title="No contacts yet" description="Add the people to reach at this customer." className="py-8" action={canManage ? <Button size="sm" onClick={() => setEditing("new")}><Plus /> Add contact</Button> : undefined} />
      ) : (
        <ul className="divide-y">
          {q.data?.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {c.name}
                  {c.isPrimary ? <Badge variant="brand"><Star aria-hidden className="size-3" /> Primary</Badge> : null}
                  <Badge variant="outline">{humanizeCode(c.role)}</Badge>
                </p>
                {c.jobTitle ? <p className="text-xs text-muted-foreground">{c.jobTitle}</p> : null}
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                  {c.email ? <span className="inline-flex items-center gap-1"><Mail aria-hidden className="size-3.5" />{c.email}</span> : null}
                  {c.phone ? <span className="inline-flex items-center gap-1"><Phone aria-hidden className="size-3.5" />{c.phone}</span> : null}
                  {c.whatsapp ? <span>WhatsApp {c.whatsapp}</span> : null}
                </p>
                {c.notes ? <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p> : null}
              </div>
              {canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><IconButton size="sm" label={`Actions for ${c.name}`} icon={<MoreHorizontal />} /></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setEditing(c)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setRemoving(c)}>Archive</DropdownMenuItem>
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
        title={`Archive ${removing?.name ?? "contact"}?`}
        description="The contact is removed from this customer's list. Nothing is deleted."
        confirmLabel="Archive contact"
        destructive
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => { toast.success("Contact archived"); setRemoving(null); }, onError: (e) => { toast.error(errorMessage(e)); setRemoving(null); } })}
      />
    </Card>
  );
}

function ContactDialog({ customerId, contact, onClose }: { customerId: string; contact: CustomerContact | null; onClose: () => void }) {
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
      toast.success(contact ? "Contact updated" : "Contact added");
      onClose();
    } catch (e) {
      const m = applyApiErrors(e, setError, CONTACT_FIELDS);
      if (m.formMessage) setFormError({ message: m.formMessage, requestId: m.requestId });
    }
  });
  const err = (n: keyof ContactFormValues) => errors[n]?.message;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={contact ? "Edit contact" : "Add contact"} className="max-w-lg">
        <form onSubmit={onSubmit} noValidate className="space-y-3">
          {formError ? <FormError {...formError} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="c-name" label="Name" required error={err("name")} className="sm:col-span-2"><Input id="c-name" autoFocus aria-invalid={!!errors.name} {...register("name")} /></FormField>
            <FormField id="c-role" label="Role"><Select id="c-role" value={w_role} onValueChange={(v) => setValue("role", v as ContactFormValues["role"], { shouldDirty: true })} options={CONTACT_ROLES.map((r) => ({ value: r, label: humanizeCode(r) }))} /></FormField>
            <FormField id="c-jobTitle" label="Job title" error={err("jobTitle")}><Input id="c-jobTitle" {...register("jobTitle")} /></FormField>
            <FormField id="c-email" label="Email" error={err("email")}><Input id="c-email" type="email" aria-invalid={!!errors.email} {...register("email")} /></FormField>
            <FormField id="c-phone" label="Phone" error={err("phone")}><Input id="c-phone" type="tel" {...register("phone")} /></FormField>
            <FormField id="c-whatsapp" label="WhatsApp" error={err("whatsapp")}><Input id="c-whatsapp" type="tel" {...register("whatsapp")} /></FormField>
            <FormField id="c-notes" label="Notes" error={err("notes")} className="sm:col-span-2"><Textarea id="c-notes" rows={2} {...register("notes")} /></FormField>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c-primary" checked={w_isPrimary} onCheckedChange={(c) => setValue("isPrimary", c === true, { shouldDirty: true })} />
            <Label htmlFor="c-primary">Primary contact <span className="font-normal text-muted-foreground">(replaces the current primary)</span></Label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={save.isPending} disabled={!!contact && !isDirty}>{contact ? "Save" : "Add contact"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
