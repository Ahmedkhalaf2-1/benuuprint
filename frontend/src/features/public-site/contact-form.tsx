"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_PROJECT_TYPES } from "./content-pages";

export interface ContactValues { name: string; company: string; email: string; phone: string; projectType: string; message: string }

const field = "w-full border border-pub-line bg-pub-bg px-4 py-3.5 text-base text-pub-text sm:py-3 sm:text-sm placeholder:text-pub-muted/60 focus-visible:border-pub-brand";
const label = "mb-2 block font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted";

/**
 * Enquiry form, ready for a backend. There is NO public enquiry endpoint yet, so unless an `onSubmit` is supplied the form
 * does not send anything: the button is disabled and the page says so. It never shows a success message it did not earn.
 */
export function ContactForm({ onSubmit }: { onSubmit?: (values: ContactValues) => Promise<void> }) {
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

  if (state === "sent") return <p role="status" className="border border-pub-brand/50 p-6 text-pub-text">Thank you. Your message has been sent.</p>;
  return (
    <form onSubmit={submit} aria-label="Contact enquiry" className="grid gap-6 sm:grid-cols-2" data-testid="contact-form">
      <div><label htmlFor="c-name" className={label}>Name</label><input id="c-name" name="name" required autoComplete="name" className={field} /></div>
      <div><label htmlFor="c-company" className={label}>Company / brand</label><input id="c-company" name="company" autoComplete="organization" className={field} /></div>
      <div><label htmlFor="c-email" className={label}>Email</label><input id="c-email" name="email" type="email" inputMode="email" autoCapitalize="none" required autoComplete="email" className={field} /></div>
      <div><label htmlFor="c-phone" className={label}>Phone <span className="normal-case tracking-normal">(optional)</span></label><input id="c-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className={field} /></div>
      <div className="sm:col-span-2"><label htmlFor="c-type" className={label}>Project type</label><select id="c-type" name="projectType" defaultValue="" required className={field}><option value="" disabled>Select…</option>{CONTACT_PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
      <div className="sm:col-span-2"><label htmlFor="c-message" className={label}>Message</label><textarea id="c-message" name="message" required rows={6} className={field} /></div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={!enabled || state === "sending"} className="inline-flex h-14 w-full items-center justify-center bg-pub-brand-deep px-6 text-sm font-medium text-white transition-colors enabled:hover:bg-pub-brand-deeper enabled:active:bg-pub-brand-deeper disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:w-auto">{state === "sending" ? "Sending…" : "Send enquiry"}</button>
        {!enabled ? <p role="status" className="mt-4 text-sm text-pub-muted">Contact submission is coming soon. Nothing is sent from this form yet.</p> : null}
        {state === "error" ? <p role="alert" className="mt-4 text-sm text-red-300">We could not send your message. Please try again.</p> : null}
      </div>
    </form>
  );
}
