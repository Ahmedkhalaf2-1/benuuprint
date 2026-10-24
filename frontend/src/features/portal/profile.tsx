"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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

const blank = (v: string | null | undefined) => v ?? "";
const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

/** Contact details the customer may change. Name and login email are managed by Benuu Print (stated on the page). */
function ContactCard({ p }: { p: CustomerProfile }) {
  const qc = useQueryClient();
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const { register, handleSubmit, setValue, control, formState: { isDirty, isSubmitting } } = useForm({ defaultValues: { phone: blank(p.phone), whatsapp: blank(p.whatsapp), country: blank(p.country), city: blank(p.city), instagram: blank(p.instagram), preferredLocale: p.preferredLocale ?? "en" } });
  const locale = useWatch({ control, name: "preferredLocale" });
  return (
    <Card>
      <CardHeader><CardTitle>Contact details</CardTitle></CardHeader>
      <CardContent>
        <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{p.name}</dd></div><div><dt className="text-muted-foreground">Login email</dt><dd className="font-medium">{p.email}</dd></div><p className="text-xs text-muted-foreground sm:col-span-2">Your name and login email are managed by Benuu Print. Contact us if they need to change.</p></dl>
        <form className="space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
          setError(null);
          try { const next = await api.updateProfile({ phone: orNull(v.phone), whatsapp: orNull(v.whatsapp), country: orNull(v.country), city: orNull(v.city), instagram: orNull(v.instagram), preferredLocale: v.preferredLocale as "en" | "ar" }); qc.setQueryData(queryKeys.customer.profile, next); toast.success("Profile saved"); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); }
        })}>
          {error ? <FormError {...error} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="pf-phone" label="Phone"><Input id="pf-phone" inputMode="tel" {...register("phone")} /></FormField>
            <FormField id="pf-wa" label="WhatsApp"><Input id="pf-wa" inputMode="tel" {...register("whatsapp")} /></FormField>
            <FormField id="pf-country" label="Country"><Input id="pf-country" {...register("country")} /></FormField>
            <FormField id="pf-city" label="City"><Input id="pf-city" {...register("city")} /></FormField>
            <FormField id="pf-ig" label="Instagram"><Input id="pf-ig" {...register("instagram")} /></FormField>
            <FormField id="pf-lang" label="Preferred language"><Select id="pf-lang" value={locale} onValueChange={(v) => setValue("preferredLocale", v as "en" | "ar", { shouldDirty: true })} options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} /></FormField>
          </div>
          <Button type="submit" disabled={!isDirty} loading={isSubmitting}>Save changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AddressDialog({ initial, onClose }: { initial?: CustomerAddress; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ country: initial?.country ?? "", state: blank(initial?.state), city: initial?.city ?? "", area: blank(initial?.area), addressLine1: initial?.addressLine1 ?? "", addressLine2: blank(initial?.addressLine2), postalCode: blank(initial?.postalCode), notes: blank(initial?.notes), isDefault: initial?.isDefault ?? false });
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title={initial ? "Edit address" : "Add an address"} description="Where should we deliver to?" className="max-h-[90vh] max-w-lg overflow-y-auto">
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setError(null);
          if (!f.country.trim() || !f.city.trim() || !f.addressLine1.trim()) return setError({ message: "Country, city and street address are required." });
          setBusy(true);
          try {
            const body = { type: initial?.type ?? "SHIPPING", country: f.country.trim(), city: f.city.trim(), addressLine1: f.addressLine1.trim(), isDefault: f.isDefault, ...(f.state.trim() ? { state: f.state.trim() } : {}), ...(f.area.trim() ? { area: f.area.trim() } : {}), ...(f.addressLine2.trim() ? { addressLine2: f.addressLine2.trim() } : {}), ...(f.postalCode.trim() ? { postalCode: f.postalCode.trim() } : {}), ...(f.notes.trim() ? { notes: f.notes.trim() } : {}) };
            if (initial) await api.updateAddress(initial.id, body); else await api.createAddress(body);
            await qc.invalidateQueries({ queryKey: queryKeys.customer.addresses }); toast.success("Address saved"); onClose();
          } catch (err) { setError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); } finally { setBusy(false); }
        }}>
          {error ? <FormError {...error} /> : null}
          <FormField id="ad-l1" label="Street address" required><Input id="ad-l1" value={f.addressLine1} onChange={(e) => set({ addressLine1: e.target.value })} /></FormField>
          <FormField id="ad-l2" label="Apartment, floor, etc."><Input id="ad-l2" value={f.addressLine2} onChange={(e) => set({ addressLine2: e.target.value })} /></FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="ad-city" label="City" required><Input id="ad-city" value={f.city} onChange={(e) => set({ city: e.target.value })} /></FormField>
            <FormField id="ad-area" label="Area"><Input id="ad-area" value={f.area} onChange={(e) => set({ area: e.target.value })} /></FormField>
            <FormField id="ad-state" label="Governorate / state"><Input id="ad-state" value={f.state} onChange={(e) => set({ state: e.target.value })} /></FormField>
            <FormField id="ad-country" label="Country" required><Input id="ad-country" value={f.country} onChange={(e) => set({ country: e.target.value })} /></FormField>
            <FormField id="ad-zip" label="Postal code"><Input id="ad-zip" value={f.postalCode} onChange={(e) => set({ postalCode: e.target.value })} /></FormField>
          </div>
          <FormField id="ad-notes" label="Delivery notes"><Input id="ad-notes" value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></FormField>
          <div className="flex items-center gap-2"><Checkbox id="ad-def" checked={f.isDefault} onCheckedChange={(c) => set({ isDefault: c === true })} /><Label htmlFor="ad-def" className="font-normal">Use as my default address</Label></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Save address</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddressesCard() {
  const q = useAddresses();
  const [dlg, setDlg] = useState<CustomerAddress | "new" | null>(null);
  return (
    <Card>
      <CardHeader><CardTitle>Addresses</CardTitle><Button size="sm" variant="secondary" onClick={() => setDlg("new")}>Add address</Button></CardHeader>
      <CardContent>
        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-4" /> : q.data && q.data.length ? (
          <ul className="divide-y rounded-md border" data-testid="addresses">{q.data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 px-3 py-2.5 text-sm"><address className="min-w-0 flex-1 not-italic"><span className="block font-medium">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}</span><span className="block text-muted-foreground">{[a.area, a.city, a.state, a.country].filter(Boolean).join(", ")}{a.isDefault ? " · default" : ""}</span></address><Button size="sm" variant="secondary" onClick={() => setDlg(a)}>Edit</Button></li>))}</ul>
        ) : <p className="text-sm text-muted-foreground">No addresses saved.</p>}
      </CardContent>
      {dlg ? <AddressDialog initial={dlg === "new" ? undefined : dlg} onClose={() => setDlg(null)} /> : null}
    </Card>
  );
}

/** Changing the password ends every session (backend rule), including this one: we sign out and ask for the new password. */
function PasswordCard() {
  const { logout } = useCustomerAuth();
  const [error, setError] = useState<string | null>(null);
  const schema = z.object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: passwordSchema, confirm: z.string() }).refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords do not match" });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ currentPassword: string; newPassword: string; confirm: string }>({ resolver: zodResolver(schema) });
  return (
    <Card>
      <CardHeader><CardTitle>Password</CardTitle></CardHeader>
      <CardContent>
        <form className="max-w-sm space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
          setError(null);
          try { await api.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }); toast.success("Password changed. Please sign in again."); await logout(); } catch (e) { setError(isApiError(e) && e.kind === "unauthorized" ? "Your current password is not correct." : errorMessage(e)); }
        })}>
          {error ? <FormError message={error} /> : null}
          <FormField id="pw-cur" label="Current password" error={errors.currentPassword?.message}><Input id="pw-cur" type="password" autoComplete="current-password" {...register("currentPassword")} /></FormField>
          <FormField id="pw-new" label="New password" hint="At least 12 characters, with a lowercase letter, an uppercase letter and a digit." error={errors.newPassword?.message}><Input id="pw-new" type="password" autoComplete="new-password" {...register("newPassword")} /></FormField>
          <FormField id="pw-conf" label="Repeat the new password" error={errors.confirm?.message}><Input id="pw-conf" type="password" autoComplete="new-password" {...register("confirm")} /></FormField>
          <p className="text-xs text-muted-foreground">You will be signed out everywhere after changing your password.</p>
          <Button type="submit" loading={isSubmitting}>Change password</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProfilePage() {
  const q = useProfile();
  if (q.isLoading) return <PageSkeleton />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return null;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Profile</h1><p className="mt-1 text-muted-foreground">Customer {q.data.customerNumber}</p></div>
      <ContactCard p={q.data} />
      <BrandsCard />
      <AddressesCard />
      <PasswordCard />
    </div>
  );
}
