"use client";

import { zodResolver } from "@/lib/forms/resolver";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useWarnUnsaved } from "@/hooks/use-warn-unsaved";
import { applyApiErrors } from "@/lib/forms/api-errors";

import { useCreateCustomer, useUpdateCustomer } from "./hooks";
import { CUSTOMER_FIELDS, customerSchema, emptyToNull, omitEmpty, type CustomerFormValues } from "./schemas";
import { CUSTOMER_STATUSES, type CustomerDetail } from "./types";
import { useI18n } from "@/i18n/provider";

const empty: CustomerFormValues = { displayName: "", email: "", phone: "", whatsapp: "", country: "", city: "", instagram: "", source: "", notes: "", status: "ACTIVE" };

function toValues(c: CustomerDetail): CustomerFormValues {
  return {
    displayName: c.displayName, email: c.email ?? "", phone: c.phone ?? "", whatsapp: c.whatsapp ?? "", country: c.country ?? "",
    city: c.city ?? "", instagram: c.instagram ?? "", source: c.source ?? "", notes: c.notes ?? "",
    status: c.status === "ARCHIVED" ? "ACTIVE" : c.status,
  };
}

/** Create (no `customer`) or edit. Status is only set on creation; later changes use the status action. */
export function CustomerForm({ customer }: { customer?: CustomerDetail }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const create = useCreateCustomer();
  const update = useUpdateCustomer(customer?.id ?? "");
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null);
  const { register, control, handleSubmit, setError, setValue, formState: { errors, isDirty, isSubmitting, isSubmitSuccessful } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? toValues(customer) : empty,
  });
  const w_status = useWatch({ control, name: "status" });
  useWarnUnsaved(isDirty && !isSubmitSuccessful);
  const pending = create.isPending || update.isPending || isSubmitting;

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      if (customer) {
        const { status: _status, ...rest } = v;
        void _status;
        await update.mutateAsync(emptyToNull(rest, ["displayName"]));
        toast.success(t("customers.customerUpdated"));
        router.push(`/customers/${customer.id}`);
      } else {
        const created = await create.mutateAsync(omitEmpty(v) as Parameters<typeof create.mutateAsync>[0]);
        toast.success(t("customers.customernumberCreated", { customerNumber: created.customerNumber }));
        router.push(`/customers/${created.id}`);
      }
    } catch (e) {
      const mapped = applyApiErrors(e, setError, CUSTOMER_FIELDS);
      if (mapped.formMessage) setFormError({ message: mapped.formMessage, requestId: mapped.requestId });
    }
  });

  const f = (name: keyof CustomerFormValues) => errors[name]?.message;
  const a11y = (name: keyof CustomerFormValues) => ({ "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? `${name}-error` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate aria-label={customer ? t("customers.editCustomer") : t("customers.newCustomer")} className="max-w-3xl space-y-4">
      {formError ? <FormError {...formError} /> : null}
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="displayName" label={t("common.name")} required error={f("displayName")} className="sm:col-span-2">
            <Input id="displayName" autoFocus {...a11y("displayName")} {...register("displayName")} />
          </FormField>
          <FormField id="email" label={t("customers.email")} error={f("email")}>
            <Input id="email" type="email" autoComplete="off" {...a11y("email")} {...register("email")} />
          </FormField>
          <FormField id="phone" label={t("common.phone")} error={f("phone")} hint={t("customers.spacesAndDashesAreNormalisedBy")}>
            <Input id="phone" type="tel" autoComplete="off" {...a11y("phone")} {...register("phone")} />
          </FormField>
          <FormField id="whatsapp" label={t("customers.whatsapp")} error={f("whatsapp")}>
            <Input id="whatsapp" type="tel" autoComplete="off" {...a11y("whatsapp")} {...register("whatsapp")} />
          </FormField>
          <FormField id="instagram" label={t("customers.instagram")} error={f("instagram")} hint={t("customers.handleWithout")}>
            <Input id="instagram" {...a11y("instagram")} {...register("instagram")} />
          </FormField>
          <FormField id="country" label={t("customers.country")} error={f("country")}><Input id="country" {...a11y("country")} {...register("country")} /></FormField>
          <FormField id="city" label={t("customers.city")} error={f("city")}><Input id="city" {...a11y("city")} {...register("city")} /></FormField>
          <FormField id="source" label={t("common.source")} error={f("source")} hint={t("customers.howTheCustomerFoundUsE")}>
            <Input id="source" {...a11y("source")} {...register("source")} />
          </FormField>
          {!customer ? (
            <FormField id="status" label={t("common.status")} error={f("status")}>
              <Select id="status" value={w_status} onValueChange={(v) => setValue("status", v as CustomerFormValues["status"], { shouldDirty: true })} options={CUSTOMER_STATUSES.map((s) => ({ value: s, label: fmt.code(s) }))} />
            </FormField>
          ) : null}
          <FormField id="notes" label={t("common.notes")} error={f("notes")} className="sm:col-span-2">
            <Textarea id="notes" rows={4} {...a11y("notes")} {...register("notes")} />
          </FormField>
        </CardContent>
      </Card>
      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending} disabled={pending || (!!customer && !isDirty)}>{customer ? t("customers.saveChanges") : t("customers.createCustomer")}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={pending}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}
