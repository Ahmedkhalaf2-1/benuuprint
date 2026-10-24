"use client";

import { zodResolver } from "@/lib/forms/resolver";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ErrorState, PageSkeleton } from "@/components/feedback/states";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import * as api from "./api";
import { useCustomerAuth } from "./auth/customer-auth-provider";
import { passwordSchema } from "./auth/forms";
import { BrandsCard } from "./brands";
import { useAddresses, useProfile } from "./hooks";
import type { CustomerAddress, CustomerProfile } from "./types";
import { useI18n } from "@/i18n/provider";

const blank = (v: string | null | undefined) => v ?? "";
const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

/** Contact details the customer may change. Name and login email are managed by Benuu Print (stated on the page). */
function ContactCard({ p }: { p: CustomerProfile }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const { register, handleSubmit, setValue, control, formState: { isDirty, isSubmitting } } = useForm({ defaultValues: { phone: blank(p.phone), whatsapp: blank(p.whatsapp), country: blank(p.country), city: blank(p.city), instagram: blank(p.instagram), preferredLocale: p.preferredLocale ?? "en" } });
  const locale = useWatch({ control, name: "preferredLocale" });
  return (
    <Card>
      <CardHeader><CardTitle>{t("customer.contactDetails")}</CardTitle></CardHeader>
      <CardContent>
        <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">{t("common.name")}</dt><dd className="font-medium">{p.name}</dd></div><div><dt className="text-muted-foreground">{t("customer.loginEmail")}</dt><dd className="font-medium">{p.email}</dd></div><p className="text-xs text-muted-foreground sm:col-span-2">{t("customer.yourNameAndLoginEmailAre")}</p></dl>
        <form className="space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
          setError(null);
          try { const next = await api.updateProfile({ phone: orNull(v.phone), whatsapp: orNull(v.whatsapp), country: orNull(v.country), city: orNull(v.city), instagram: orNull(v.instagram), preferredLocale: v.preferredLocale as "en" | "ar" }); qc.setQueryData(queryKeys.customer.profile, next); toast.success(t("customer.profileSaved")); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); }
        })}>
          {error ? <FormError {...error} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="pf-phone" label={t("common.phone")}><Input id="pf-phone" inputMode="tel" {...register("phone")} /></FormField>
            <FormField id="pf-wa" label={t("customer.whatsapp")}><Input id="pf-wa" inputMode="tel" {...register("whatsapp")} /></FormField>
            <FormField id="pf-country" label={t("customer.country")}><Input id="pf-country" {...register("country")} /></FormField>
            <FormField id="pf-city" label={t("common.city")}><Input id="pf-city" {...register("city")} /></FormField>
            <FormField id="pf-ig" label={t("common.instagram")}><Input id="pf-ig" {...register("instagram")} /></FormField>
            <FormField id="pf-lang" label={t("customer.preferredLanguage")}><Select id="pf-lang" value={locale} onValueChange={(v) => setValue("preferredLocale", v as "en" | "ar", { shouldDirty: true })} options={[{ value: "en", label: t("customer.english") }, { value: "ar", label: "العربية" }]} /></FormField>
          </div>
          <Button type="submit" disabled={!isDirty} loading={isSubmitting}>{t("common.saveChanges")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AddressDialog({ initial, onClose }: { initial?: CustomerAddress; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState({ country: initial?.country ?? "", state: blank(initial?.state), city: initial?.city ?? "", area: blank(initial?.area), addressLine1: initial?.addressLine1 ?? "", addressLine2: blank(initial?.addressLine2), postalCode: blank(initial?.postalCode), notes: blank(initial?.notes), isDefault: initial?.isDefault ?? false });
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title={initial ? t("customer.editAddress") : t("customer.addAnAddress")} description={t("customer.whereShouldWeDeliverTo")} className="max-h-[90vh] max-w-lg overflow-y-auto">
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setError(null);
          if (!f.country.trim() || !f.city.trim() || !f.addressLine1.trim()) return setError({ message: t("customer.countryCityAndStreetAddressAre") });
          setBusy(true);
          try {
            const body = { type: initial?.type ?? "SHIPPING", country: f.country.trim(), city: f.city.trim(), addressLine1: f.addressLine1.trim(), isDefault: f.isDefault, ...(f.state.trim() ? { state: f.state.trim() } : {}), ...(f.area.trim() ? { area: f.area.trim() } : {}), ...(f.addressLine2.trim() ? { addressLine2: f.addressLine2.trim() } : {}), ...(f.postalCode.trim() ? { postalCode: f.postalCode.trim() } : {}), ...(f.notes.trim() ? { notes: f.notes.trim() } : {}) };
            if (initial) await api.updateAddress(initial.id, body); else await api.createAddress(body);
            await qc.invalidateQueries({ queryKey: queryKeys.customer.addresses }); toast.success(t("customer.addressSaved")); onClose();
          } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } finally { setBusy(false); }
        }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="ad-l1" label={t("customer.streetAddress")} required><Input id="ad-l1" value={f.addressLine1} onChange={(e) => set({ addressLine1: e.target.value })} /></FormField>
          <FormField id="ad-l2" label={t("customer.apartmentFloorEtc")}><Input id="ad-l2" value={f.addressLine2} onChange={(e) => set({ addressLine2: e.target.value })} /></FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="ad-city" label={t("common.city")} required><Input id="ad-city" value={f.city} onChange={(e) => set({ city: e.target.value })} /></FormField>
            <FormField id="ad-area" label={t("common.area")}><Input id="ad-area" value={f.area} onChange={(e) => set({ area: e.target.value })} /></FormField>
            <FormField id="ad-state" label={t("customer.governorateState")}><Input id="ad-state" value={f.state} onChange={(e) => set({ state: e.target.value })} /></FormField>
            <FormField id="ad-country" label={t("customer.country")} required><Input id="ad-country" value={f.country} onChange={(e) => set({ country: e.target.value })} /></FormField>
            <FormField id="ad-zip" label={t("customer.postalCode")}><Input id="ad-zip" value={f.postalCode} onChange={(e) => set({ postalCode: e.target.value })} /></FormField>
          </div>
          <FormField id="ad-notes" label={t("customer.deliveryNotes")}><Input id="ad-notes" value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></FormField>
          <div className="flex items-center gap-2"><Checkbox id="ad-def" checked={f.isDefault} onCheckedChange={(c) => set({ isDefault: c === true })} /><Label htmlFor="ad-def" className="font-normal">{t("customer.useAsMyDefaultAddress")}</Label></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" loading={busy}>{t("customer.saveAddress")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddressesCard() {
  const { t } = useI18n();
  const q = useAddresses();
  const [dlg, setDlg] = useState<CustomerAddress | "new" | null>(null);
  return (
    <Card>
      <CardHeader><CardTitle>{t("customer.addresses")}</CardTitle><Button size="sm" variant="secondary" onClick={() => setDlg("new")}>{t("customer.addAddress")}</Button></CardHeader>
      <CardContent>
        {q.isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-4" /> : q.data && q.data.length ? (
          <ul className="divide-y rounded-md border" data-testid="addresses">{q.data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 px-3 py-2.5 text-sm"><address className="min-w-0 flex-1 not-italic"><span className="block font-medium">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}</span><span className="block text-muted-foreground">{[a.area, a.city, a.state, a.country].filter(Boolean).join(", ")}{a.isDefault ? t("customer.default") : ""}</span></address><Button size="sm" variant="secondary" onClick={() => setDlg(a)}>{t("common.edit")}</Button></li>))}</ul>
        ) : <p className="text-sm text-muted-foreground">{t("customer.noAddressesSaved")}</p>}
      </CardContent>
      {dlg ? <AddressDialog initial={dlg === "new" ? undefined : dlg} onClose={() => setDlg(null)} /> : null}
    </Card>
  );
}

/** Changing the password ends every session (backend rule), including this one: we sign out and ask for the new password. */
function PasswordCard() {
  const { t } = useI18n();
  const { logout } = useCustomerAuth();
  const [error, setError] = useState<string | null>(null);
  const schema = z.object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: passwordSchema, confirm: z.string() }).refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: t("customer.thePasswordsDoNotMatch") });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ currentPassword: string; newPassword: string; confirm: string }>({ resolver: zodResolver(schema) });
  return (
    <Card>
      <CardHeader><CardTitle>{t("customer.password")}</CardTitle></CardHeader>
      <CardContent>
        <form className="max-w-sm space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
          setError(null);
          try { await api.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }); toast.success(t("customer.passwordChangedPleaseSignInAgain")); await logout(); } catch (e) { setError(isApiError(e) && e.kind === "unauthorized" ? "Your current password is not correct." : errorMessage(e)); }
        })}>
          {error ? <FormError message={error} /> : null}
          <FormField id="pw-cur" label={t("customer.currentPassword")} error={errors.currentPassword?.message}><Input id="pw-cur" type="password" autoComplete="current-password" {...register("currentPassword")} /></FormField>
          <FormField id="pw-new" label={t("customer.newPassword")} hint={t("customer.atLeast12CharactersWithA")} error={errors.newPassword?.message}><Input id="pw-new" type="password" autoComplete="new-password" {...register("newPassword")} /></FormField>
          <FormField id="pw-conf" label={t("customer.repeatTheNewPassword")} error={errors.confirm?.message}><Input id="pw-conf" type="password" autoComplete="new-password" {...register("confirm")} /></FormField>
          <p className="text-xs text-muted-foreground">{t("customer.youWillBeSignedOutEverywhere")}</p>
          <Button type="submit" loading={isSubmitting}>{t("customer.changePassword")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProfilePage() {
  const { t } = useI18n();
  const q = useProfile();
  if (q.isLoading) return <PageSkeleton />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return null;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">{t("customer.profile")}</h1><p className="mt-1 text-muted-foreground">{t("customer.customerCustomernumber", { customerNumber: q.data.customerNumber })}</p></div>
      <ContactCard p={q.data} />
      <BrandsCard />
      <AddressesCard />
      <PasswordCard />
    </div>
  );
}
