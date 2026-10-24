"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CustomerPicker, type PickedCustomer } from "@/features/customers/customer-picker";
import { emptyToNull, omitEmpty } from "@/features/customers/schemas";
import { useWarnUnsaved } from "@/hooks/use-warn-unsaved";
import { applyApiErrors } from "@/lib/forms/api-errors";
import { humanizeCode } from "@/lib/utils/format";
import { useCreateBrand, useUpdateBrand } from "./hooks";
import { BRAND_FIELDS, brandSchema, type BrandFormValues } from "./schemas";
import { BRAND_EDITABLE_STATUSES, type BrandDetail } from "./types";

const empty: BrandFormValues = { name: "", instagram: "", website: "", description: "", primaryColor: "", secondaryColor: "", status: "ACTIVE" };

function toValues(b: BrandDetail): BrandFormValues {
  return {
    name: b.name, instagram: b.instagram ?? "", website: b.website ?? "", description: b.description ?? "",
    primaryColor: b.primaryColor ?? "", secondaryColor: b.secondaryColor ?? "", status: b.status === "ARCHIVED" ? "ACTIVE" : b.status,
  };
}

function ColorInput({ id, error, register, value }: { id: string; error?: string; register: ReturnType<typeof useForm<BrandFormValues>>["register"]; value: string }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="size-9 shrink-0 rounded-md border" style={valid ? { backgroundColor: value } : undefined} />
      <Input id={id} placeholder="#1A2B3C" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...register(id as "primaryColor" | "secondaryColor")} />
    </div>
  );
}

/** Create (needs a customer) or edit (customer is fixed: UpdateBrandDto cannot move a brand). */
export function BrandForm({ brand, initialCustomer }: { brand?: BrandDetail; initialCustomer?: PickedCustomer | null }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<PickedCustomer | null>(brand?.customer ?? initialCustomer ?? null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null);
  const create = useCreateBrand(customer?.id ?? "");
  const update = useUpdateBrand(brand?.id ?? "", brand?.customerId ?? "");
  const { register, control, handleSubmit, setError, setValue, formState: { errors, isDirty, isSubmitSuccessful } } = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: brand ? toValues(brand) : empty,
  });
  const w_primaryColor = useWatch({ control, name: "primaryColor" });
  const w_secondaryColor = useWatch({ control, name: "secondaryColor" });
  const w_status = useWatch({ control, name: "status" });
  useWarnUnsaved((isDirty || (!brand && !!customer && !initialCustomer)) && !isSubmitSuccessful);
  const pending = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    if (!customer) { setCustomerError("Choose the customer this brand belongs to"); return; }
    try {
      if (brand) {
        const saved = await update.mutateAsync(emptyToNull(v, ["name", "status"]));
        toast.success("Brand updated");
        router.push(`/brands/${saved.id}`);
      } else {
        const created = await create.mutateAsync(omitEmpty(v) as Parameters<typeof create.mutateAsync>[0]);
        toast.success(`${created.brandNumber} created`);
        router.push(`/brands/${created.id}`);
      }
    } catch (e) {
      // 409 = this customer already has a live brand with that name (case-insensitive) -> show it on the name field.
      const m = applyApiErrors(e, setError, BRAND_FIELDS, { conflictField: "name" });
      if (m.formMessage) setFormError({ message: m.formMessage, requestId: m.requestId });
    }
  });

  const err = (n: keyof BrandFormValues) => errors[n]?.message;
  const archivedCustomerHint = brand?.status === "ARCHIVED";

  return (
    <form onSubmit={onSubmit} noValidate aria-label={brand ? "Edit brand" : "New brand"} className="max-w-3xl space-y-4">
      {formError ? <FormError {...formError} /> : null}
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="customer" label="Customer" required error={customerError ?? undefined} className="sm:col-span-2" hint={brand ? "A brand cannot be moved to another customer." : undefined}>
            {brand ? (
              <p className="flex h-9 items-center text-sm">
                <Link href={`/customers/${brand.customer.id}`} className="hover:text-brand hover:underline">{brand.customer.customerNumber} · {brand.customer.displayName}</Link>
              </p>
            ) : (
              <CustomerPicker id="customer" value={customer} onChange={(c) => { setCustomer(c); setCustomerError(null); }} invalid={!!customerError} describedBy={customerError ? "customer-error" : undefined} />
            )}
          </FormField>
          <FormField id="name" label="Brand name" required error={err("name")} className="sm:col-span-2" hint="Unique per customer, ignoring upper/lower case.">
            <Input id="name" autoFocus aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : "name-hint"} {...register("name")} />
          </FormField>
          <FormField id="instagram" label="Instagram" error={err("instagram")} hint="Handle without @"><Input id="instagram" {...register("instagram")} /></FormField>
          <FormField id="website" label="Website" error={err("website")}><Input id="website" type="url" placeholder="https://" aria-invalid={!!errors.website} {...register("website")} /></FormField>
          <FormField id="primaryColor" label="Primary colour" error={err("primaryColor")}><ColorInput id="primaryColor" register={register} value={w_primaryColor} error={err("primaryColor")} /></FormField>
          <FormField id="secondaryColor" label="Secondary colour" error={err("secondaryColor")}><ColorInput id="secondaryColor" register={register} value={w_secondaryColor} error={err("secondaryColor")} /></FormField>
          <FormField id="status" label="Status" error={err("status")} hint={archivedCustomerHint ? "Setting a status restores this archived brand." : undefined}>
            <Select id="status" value={w_status} onValueChange={(v) => setValue("status", v as BrandFormValues["status"], { shouldDirty: true })} options={BRAND_EDITABLE_STATUSES.map((s) => ({ value: s, label: humanizeCode(s) }))} />
          </FormField>
          <FormField id="description" label="Description" error={err("description")} className="sm:col-span-2"><Textarea id="description" rows={3} {...register("description")} /></FormField>
        </CardContent>
      </Card>
      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending} disabled={pending || (!!brand && !isDirty)}>{brand ? "Save changes" : "Create brand"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}
