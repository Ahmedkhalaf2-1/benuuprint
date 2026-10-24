"use client";

import { zodResolver } from "@/lib/forms/resolver";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/input";
import { isApiError } from "@/lib/api/errors";
import { registerCustomer, resendVerification, verifyEmail } from "../api";
import { Banner, PasswordInput, passwordSchema, portalErrorText } from "./forms";
import { authHref, maskEmail, signupNext } from "./next-path";
import { useI18n } from "@/i18n/provider";

const GENERIC_RESEND = "If that email belongs to an account awaiting verification, a new verification link has been sent.";
const COOLDOWN_SECONDS = 60;

/** Seconds left before another resend is allowed. In-memory only; `start()` begins (or restarts) a cooldown. */
function useCooldown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return { left, start: (s = COOLDOWN_SECONDS) => setLeft(s) };
}

/* ------------------------------------------------ register ------------------------------------------------ */
const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  password: passwordSchema,
  confirm: z.string(),
  acceptedTerms: z.boolean().refine((v) => v, "Accept the Terms to create your account"),
  acceptedPrivacy: z.boolean().refine((v) => v, "Accept the Privacy Policy to create your account"),
}).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords do not match" });
type Values = z.infer<typeof schema>;

/** Fields are exactly what the backend accepts: name, email, phone (optional), password, acceptedTerms, acceptedPrivacy. Confirm is client-only. */
export function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [error, setError] = useState<{ kind: "duplicate" | "other"; text: string } | null>(null);
  const [created, setCreated] = useState(false); // verification not required: the account is usable straight away
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { acceptedTerms: false, acceptedPrivacy: false } });
  if (created) {
    return (
      <div className="space-y-6" data-testid="account-created">
        <div className="flex size-12 items-center justify-center rounded-sm border border-brand/40 bg-brand-soft/50 text-brand"><CheckCircle2 aria-hidden className="size-6" /></div>
        <div role="status"><p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t("customerAuth.accountCreated")}</p><h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{t("customerAuth.accountCreated")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("customerAuth.yourBenuuPrintAccountIsReady")}</p></div>
        <Button asChild size="lg" className="h-12 w-full"><Link href={authHref("/account/login", next)}>{t("customerAuth.signIn")}</Link></Button>
      </div>
    );
  }
  return (
    <form
      noValidate
      aria-label={t("customerAuth.createYourAccount")}
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        try {
          const phone = v.phone?.trim();
          const result = await registerCustomer({ name: v.name.trim(), email: v.email.trim(), ...(phone ? { phone } : {}), password: v.password, acceptedTerms: true, acceptedPrivacy: true });
          if (result?.emailVerificationRequired === false) { // only an explicit false skips verification
            signupNext.clear();
            setCreated(true);
            return;
          }
          signupNext.set(next); // a safe path only; no session, no token, no password
          router.replace(authHref("/account/check-email", next, { email: v.email.trim() }));
        } catch (e) {
          setError(isApiError(e) && e.kind === "conflict" ? { kind: "duplicate", text: t("customerAuth.anAccountWithThisEmailAlready") } : { kind: "other", text: portalErrorText(e) });
        }
      })}
    >
      {error?.kind === "duplicate" ? (
        <div role="alert" data-testid="duplicate" className="space-y-2 rounded-md bg-tone-danger-bg px-3 py-3 text-sm text-tone-danger-fg">
          <p className="font-medium">{error.text}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1"><Link className="underline" href={authHref("/account/login", next)}>{t("customerAuth.signIn")}</Link><Link className="underline" href="/account/forgot-password">{t("customerAuth.forgotPassword")}</Link></p>
        </div>
      ) : error ? <Banner tone="error">{error.text}</Banner> : null}
      <div className="space-y-1.5"><Label htmlFor="r-name">{t("customerAuth.fullName")}</Label><Input id="r-name" autoComplete="name" autoFocus aria-invalid={!!errors.name} aria-describedby={errors.name ? "r-name-err" : undefined} {...register("name")} />{errors.name ? <p id="r-name-err" className="text-xs text-danger">{errors.name.message}</p> : null}</div>
      <div className="space-y-1.5"><Label htmlFor="r-email">{t("common.email")}</Label><Input id="r-email" type="email" inputMode="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "r-email-err" : undefined} {...register("email")} />{errors.email ? <p id="r-email-err" className="text-xs text-danger">{errors.email.message}</p> : null}</div>
      <div className="space-y-1.5"><Label htmlFor="r-phone">{t("common.phone")}{" "}<span className="font-normal text-muted-foreground">{t("common.optional")}</span></Label><Input id="r-phone" type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} /></div>
      <PasswordInput id="r-password" label={t("common.password")} autoComplete="new-password" error={errors.password?.message} {...register("password")} />
      <p className="-mt-2 text-xs text-muted-foreground">{t("customerAuth.atLeast12CharactersWithA")}</p>
      <PasswordInput id="r-confirm" label={t("customerAuth.repeatThePassword")} autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
      <div className="space-y-3 pt-1">
        {([["acceptedTerms", "Terms of Service", "/terms"], ["acceptedPrivacy", "Privacy Policy", "/privacy"]] as const).map(([name, label, href]) => (
          <div key={name}>
            <div className="flex items-start gap-3">
              <Controller control={control} name={name} render={({ field }) => <Checkbox id={`r-${name}`} checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `r-${name}-err` : undefined} className="mt-0.5 size-5" />} />
              <Label htmlFor={`r-${name}`} className="font-normal leading-snug">{t("customerAuth.iAcceptThe")}{" "}<Link href={href} target="_blank" rel="noopener" className="text-brand underline">{label}</Link></Label>
            </div>
            {errors[name] ? <p id={`r-${name}-err`} className="mt-1 ps-8 text-xs text-danger">{errors[name]!.message}</p> : null}
          </div>
        ))}
      </div>
      <Button type="submit" size="lg" className="h-12 w-full" loading={isSubmitting}>{isSubmitting ? t("customerAuth.creatingAccount") : t("customerAuth.createAccount")}</Button>
      <p className="text-center text-sm text-muted-foreground">{t("customerAuth.alreadyHaveAnAccount")}{" "}<Link href={authHref("/account/login", next)} className="text-brand hover:underline">{t("customerAuth.signIn")}</Link></p>
    </form>
  );
}

/* --------------------------------------------- resend + check email -------------------------------------- */
/** Resend with a cooldown. The message is the backend's identical-for-everyone wording: nothing implies whether an account exists. */
function ResendControl({ email, onEmail }: { email: string | null; onEmail?: (e: string) => void }) {
  const { t } = useI18n();
  const cooldown = useCooldown();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const target = email ?? typed.trim();
  const send = async () => {
    if (!target || !/^\S+@\S+\.\S+$/.test(target)) { setError("Enter a valid email address."); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      setMessage((await resendVerification({ email: target }))?.message || GENERIC_RESEND);
      cooldown.start();
      onEmail?.(target);
    } catch (e) {
      setError(portalErrorText(e));
      if (isApiError(e) && e.kind === "rate_limited") cooldown.start(e.retryAfter ?? COOLDOWN_SECONDS);
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3" data-testid="resend">
      {!email ? <div className="space-y-1.5"><Label htmlFor="rs-email">{t("customerAuth.yourEmail")}</Label><Input id="rs-email" type="email" inputMode="email" autoComplete="email" value={typed} onChange={(e) => setTyped(e.target.value)} /></div> : null}
      {message ? <Banner tone="success"><span data-testid="resend-message">{message}</span></Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Button type="button" size="lg" variant="secondary" className="h-12 w-full" loading={busy} disabled={cooldown.left > 0} onClick={() => void send()}>{cooldown.left > 0 ? t("customerAuth.resendAvailableInLeftS", { left: cooldown.left }) : t("customerAuth.resendVerification")}</Button>
    </div>
  );
}

export function CheckEmailPanel() {
  const { t } = useI18n();
  const params = useSearchParams();
  const email = params.get("email")?.trim() || null;
  const next = params.get("next");
  return (
    <div className="space-y-6">
      <div className="flex size-12 items-center justify-center rounded-sm border bg-surface-sunken text-brand"><MailCheck aria-hidden className="size-6" /></div>
      <div>
        <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t("customerAuth.checkYourEmail")}</p>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{t("customerAuth.verifyYourEmail")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{email ? <>{t("customerAuth.weSentAVerificationLinkTo")}{" "}<strong data-testid="masked-email" className="text-foreground">{maskEmail(email)}</strong>.</> : t("customerAuth.weSentYouAVerificationLink")}{" "}{t("customerAuth.openItToVerifyYourEmail")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("customerAuth.canTSeeItCheckYour")}</p>
      </div>
      <ResendControl email={email} />
      <Button asChild variant="ghost" className="h-12 w-full"><Link href={authHref("/account/login", next)}>{t("customerAuth.backToSignIn")}</Link></Button>
    </div>
  );
}

/* --------------------------------------------------- verify -------------------------------------------- */
type State = "verifying" | "verified" | "invalid" | "error";

/** Reads the one-time token from the URL, removes it from the address bar straight away, sends it once, and never keeps it. */
export function VerifyEmailPanel() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const next = params.get("next");
  const [state, setState] = useState<State>(token ? "verifying" : "invalid");
  const [detail, setDetail] = useState<string | null>(null);
  const started = useRef(false); // a one-time token must be consumed exactly once (also under React strict-mode double effects)
  const held = useRef(token);
  useEffect(() => {
    if (!held.current || started.current) return;
    started.current = true;
    const t = held.current;
    held.current = ""; // the token lives only in this closure
    window.history.replaceState(null, "", window.location.pathname);
    (async () => {
      try { await verifyEmail({ token: t }); setState("verified"); }
      catch (e) {
        if (isApiError(e) && (e.kind === "validation" || e.kind === "not_found")) setState("invalid");
        else { setDetail(portalErrorText(e)); setState("error"); }
      }
    })();
  }, []);
  const dest = next ?? signupNext.get();
  return (
    <div className="space-y-6" data-testid="verify" data-state={state}>
      {state === "verifying" ? (
        <div role="status" aria-live="polite"><p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t("customerAuth.verifying")}</p><h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{t("customerAuth.verifyingYourEmail")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("customerAuth.oneMoment")}</p></div>
      ) : state === "verified" ? (
        <>
          <div className="flex size-12 items-center justify-center rounded-sm border border-brand/40 bg-brand-soft/50 text-brand"><CheckCircle2 aria-hidden className="size-6" /></div>
          <div role="status"><p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t("customerAuth.emailVerified")}</p><h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{t("customerAuth.yourAccountIsReady")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("customerAuth.yourBenuuPrintAccountIsReady2")}</p></div>
          <Button asChild size="lg" className="h-12 w-full"><Link href={authHref("/account/login", dest, { verified: "1" })} onClick={() => signupNext.clear()}>{t("customerAuth.signIn")}</Link></Button>
        </>
      ) : (
        <>
          <div className="flex size-12 items-center justify-center rounded-sm border bg-surface-sunken text-danger"><XCircle aria-hidden className="size-6" /></div>
          <div role="alert">
            <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{state === "error" ? t("customerAuth.somethingWentWrong") : t("customerAuth.linkNotValid")}</p>
            <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{state === "error" ? t("customerAuth.weCouldnTVerifyYourEmail") : t("customerAuth.thisLinkIsInvalidOrHas")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{state === "error" ? detail : t("customerAuth.theVerificationLinkMayHaveExpired")}</p>
          </div>
          <ResendControl email={null} />
          <Button asChild variant="ghost" className="h-12 w-full"><Link href={authHref("/account/login", dest)}>{t("customerAuth.backToSignIn")}</Link></Button>
        </>
      )}
    </div>
  );
}

