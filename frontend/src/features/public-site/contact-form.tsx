"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_PROJECT_TYPES } from "./content-pages";
import { useI18n } from "@/i18n/provider";

export interface ContactValues { name: string; company: string; email: string; phone: string; projectType: string; message: string }

const field = "w-full border border-pub-line bg-pub-bg px-4 py-3.5 text-base text-pub-text sm:py-3 sm:text-sm placeholder:text-pub-muted/60 focus-visible:border-pub-brand";
const label = "mb-2 block font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted";

/**
 * Enquiry form, ready for a backend. There is NO public enquiry endpoint yet, so unless an `onSubmit` is supplied the form
 * does not send anything: the button is disabled and the page says so. It never shows a success message it did not earn.
 */
export function ContactForm({ onSubmit }: { onSubmit?: (values: ContactValues) => Promise<void> }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const enabled = !!onSubmit;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!onSubmit) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    setState("sending");
    try {
      await onSubmit({ name: get("name"), company: get("company"), email: get("email"), phone: get("phone"), projectType: get("projectType"), message: get("message") });
      setState("sent");
    } catch { setState("error"); }
  }

  if (state === "sent") return <p role="status" className="border border-pub-brand/50 p-6 text-pub-text">{t("site.thankYouYourMessageHasBeen")}</p>;
  return (
    <form onSubmit={submit} aria-label={t("site.contactEnquiry")} className="grid gap-6 sm:grid-cols-2" data-testid="contact-form">
      <div><label htmlFor="c-name" className={label}>{t("common.name")}</label><input id="c-name" name="name" required autoComplete="name" className={field} /></div>
      <div><label htmlFor="c-company" className={label}>{t("site.companyBrand")}</label><input id="c-company" name="company" autoComplete="organization" className={field} /></div>
      <div><label htmlFor="c-email" className={label}>{t("common.email")}</label><input id="c-email" name="email" type="email" inputMode="email" autoCapitalize="none" required autoComplete="email" className={field} /></div>
      <div><label htmlFor="c-phone" className={label}>{t("site.phone")} <span className="normal-case tracking-normal">{t("common.optional")}</span></label><input id="c-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className={field} /></div>
      <div className="sm:col-span-2"><label htmlFor="c-type" className={label}>{t("site.projectType")}</label><select id="c-type" name="projectType" defaultValue="" required className={field}><option value="" disabled>{t("site.select")}</option>{CONTACT_PROJECT_TYPES.map((pt) => <option key={pt} value={pt}>{t.text(pt)}</option>)}</select></div>
      <div className="sm:col-span-2"><label htmlFor="c-message" className={label}>{t("site.message")}</label><textarea id="c-message" name="message" required rows={6} className={field} /></div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={!enabled || state === "sending"} className="inline-flex h-14 w-full items-center justify-center bg-pub-brand-deep px-6 text-sm font-medium text-white transition-colors enabled:hover:bg-pub-brand-deeper enabled:active:bg-pub-brand-deeper disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:w-auto">{state === "sending" ? t("site.sending") : t("site.sendEnquiry")}</button>
        {!enabled ? <p role="status" className="mt-4 text-sm text-pub-muted">{t("site.contactSubmissionIsComingSoonNothing")}</p> : null}
        {state === "error" ? <p role="alert" className="mt-4 text-sm text-red-300">{t("site.weCouldNotSendYourMessage")}</p> : null}
      </div>
    </form>
  );
}
