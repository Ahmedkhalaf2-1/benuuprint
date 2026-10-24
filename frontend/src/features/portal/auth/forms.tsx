"use client";

import { getActive } from "@/i18n/active";
import { zodResolver } from "@/lib/forms/resolver";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Label } from "@/components/ui/input";
import { isApiError } from "@/lib/api/errors";
import { activateAccount, forgotPassword, resendVerification, resetPassword } from "../api";
import { authHref, safeNextPath, signupNext, useEmailVerificationRequired } from "./next-path";
import { useCustomerAuth } from "./customer-auth-provider";
import { useI18n } from "@/i18n/provider";

/** Only same-app portal paths are honoured as post-login targets. */
export function safePortalNext(next: string | null): string {
  return safeNextPath(next) ?? "/account";
}

export function portalErrorText(e: unknown): string {
  if (!isApiError(e)) return "Something went wrong. Please try again.";
  if (e.kind === "rate_limited") return e.retryAfter ? getActive().t("customerAuth.tooManyAttemptsSeconds", { seconds: e.retryAfter }) : getActive().t("customerAuth.tooManyAttempts");
  if (e.kind === "unauthorized") return "That email and password do not match.";
  if (e.kind === "network" || e.status === 503) return "We can't reach the server. Check your connection and try again.";
  if (e.kind === "server") return "We had a problem on our side. Please try again shortly.";
  return e.messages.join(" ");
}

/** Mirrors the backend rule (12–128 characters with a lowercase letter, an uppercase letter and a digit). The server stays the authority. */
export const passwordSchema = z.string().min(12, "Use at least 12 characters").max(128, "Use at most 128 characters").regex(/[a-z]/, "Include a lowercase letter").regex(/[A-Z]/, "Include an uppercase letter").regex(/\d/, "Include a digit");

export function Banner({ tone, children }: { tone: "error" | "info" | "success"; children: ReactNode }) {
  const cls = tone === "error" ? "bg-tone-danger-bg text-tone-danger-fg" : tone === "success" ? "bg-tone-success-bg text-tone-success-fg" : "bg-tone-warning-bg text-tone-warning-fg";
  return <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2 rounded-md px-3 py-2 text-sm ${cls}`}>{tone === "error" ? <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" /> : null}<div>{children}</div></div>;
}

export function PasswordInput({ id, label, autoComplete, error, ...rest }: { id: string; label: string; autoComplete: string; error?: string } & Record<string, unknown>) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} className="pe-10" aria-invalid={!!error} {...rest} />
        <IconButton label={show ? t("customerAuth.hidePassword") : t("customerAuth.showPassword")} aria-pressed={show} size="sm" icon={show ? <EyeOff /> : <Eye />} className="absolute end-0.5 top-0.5" onClick={() => setShow((s) => !s)} />
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function CustomerLoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { login, status } = useCustomerAuth();
  const verificationRequired = useEmailVerificationRequired();
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null); // email that signed in before verifying
  const [resent, setResent] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string; password: string }>({ resolver: zodResolver(z.object({ email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"), password: z.string().min(1, "Enter your password") })) });
  const next = params.get("next");
  useEffect(() => { if (status === "authenticated") { signupNext.clear(); router.replace(safePortalNext(next ?? signupNext.get())); } }, [status, router, next]);
  const expired = params.get("reason") === "expired";
  const toSample = !!safeNextPath(next)?.startsWith("/account/samples/new");
  const resend = async () => {
    if (!unverified) return;
    setResending(true); setResent(null);
    try { setResent((await resendVerification({ email: unverified }))?.message || "If that email belongs to an account awaiting verification, a new verification link has been sent."); } catch (e) { setError(portalErrorText(e)); } finally { setResending(false); }
  };
  return (
    <>
      <form onSubmit={handleSubmit(async (v) => { setError(null); setUnverified(null); setResent(null); try { await login(v); } catch (e) { if (isApiError(e) && e.code === "EMAIL_NOT_VERIFIED" && verificationRequired) setUnverified(v.email.trim()); else setError(portalErrorText(e)); } })} noValidate className="space-y-4" aria-label={t("customerAuth.signIn")}>
        {toSample && !error && !unverified ? <Banner tone="info">{t("customerAuth.toStartASampleSignIn")}</Banner> : null}
        {expired && !error ? <Banner tone="info">{t("customerAuth.yourSessionEndedPleaseSignIn")}</Banner> : null}
        {params.get("reset") === "1" && !error ? <Banner tone="success">{t("customerAuth.yourPasswordWasChangedPleaseSign")}</Banner> : null}
        {params.get("activated") === "1" && !error ? <Banner tone="success">{t("customerAuth.yourAccountIsReadyPleaseSign")}</Banner> : null}
        {params.get("verified") === "1" && !error && !unverified ? <Banner tone="success">{t("customerAuth.yourEmailIsVerifiedPleaseSign")}</Banner> : null}
        {error ? <Banner tone="error">{error}</Banner> : null}
        {unverified ? (
          <div role="alert" data-testid="unverified" className="space-y-3 rounded-md border border-tone-warning-dot/40 bg-tone-warning-bg px-3 py-3 text-sm text-tone-warning-fg">
            <p className="font-medium">{t("customerAuth.yourEmailNeedsToBeVerified")}</p>
            {resent ? <p data-testid="resend-message">{resent} <Link className="underline" href={authHref("/account/check-email", next, { email: unverified })}>{t("customerAuth.whatToDoNext")}</Link></p> : <p>{t("customerAuth.openTheVerificationLinkWeEmailed")}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" loading={resending} disabled={!!resent} onClick={() => void resend()}>{t("customerAuth.resendVerification")}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setUnverified(null); setResent(null); }}>{t("customerAuth.useADifferentEmail")}</Button>
            </div>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="c-email">{t("common.email")}</Label>
          <Input id="c-email" type="email" inputMode="email" autoComplete="username" autoFocus aria-invalid={!!errors.email} {...register("email")} />
          {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
        </div>
        <PasswordInput id="c-password" label={t("common.password")} autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{isSubmitting ? t("customerAuth.signingIn") : t("customerAuth.signIn")}</Button>
        <p className="text-center text-sm"><Link href="/account/forgot-password" className="text-brand hover:underline">{t("customerAuth.forgotYourPassword")}</Link></p>
      </form>
      <div className="mt-6 border-t pt-6" data-testid="signup-cta">
        <p className="text-sm text-muted-foreground">{t("customerAuth.newToBenuuPrint")}</p>
        <Button asChild variant="secondary" size="lg" className="mt-2 w-full"><Link href={authHref("/account/register", next)}>{t("customerAuth.createAnAccount")}</Link></Button>
      </div>
    </>
  );
}

export function ActivateForm() {
  const { t } = useI18n();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const schema = z.object({ password: passwordSchema, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: t("customerAuth.thePasswordsDoNotMatch") });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ password: string; confirm: string }>({ resolver: zodResolver(schema) });
  if (!token) return <Banner tone="error">{t("customerAuth.thisActivationLinkIsIncompleteOpen")}</Banner>;
  return (
    <form onSubmit={handleSubmit(async (v) => { setError(null); try { await activateAccount({ token, password: v.password }); router.replace("/account/login?activated=1"); } catch (e) { setError(isApiError(e) && (e.status === 400 || e.status === 404 || e.status === 410) ? t("customerAuth.activationExpiredHint", { messages: e.messages.map((m) => t.text(m)).join(" ") }) : portalErrorText(e)); } })} noValidate className="space-y-4" aria-label={t("customerAuth.activateYourAccount")}>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <PasswordInput id="a-password" label={t("customerAuth.chooseAPassword")} autoComplete="new-password" error={errors.password?.message} {...register("password")} />
      <p className="-mt-2 text-xs text-muted-foreground">{t("customerAuth.atLeast12CharactersWithA")}</p>
      <PasswordInput id="a-confirm" label={t("customerAuth.repeatThePassword")} autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t("customerAuth.activateAccount")}</Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address") })) });
  if (done) return <div className="space-y-4"><Banner tone="success">{done}</Banner><Link href="/account/login" className="text-sm text-brand hover:underline">{t("customerAuth.backToSignIn")}</Link></div>;
  return (
    <form onSubmit={handleSubmit(async (v) => { setError(null); try { const r = await forgotPassword(v); setDone(r?.message || "If an account matches, we have sent a link to reset the password."); } catch (e) { setError(portalErrorText(e)); } })} noValidate className="space-y-4" aria-label={t("customerAuth.resetYourPassword")}>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <div className="space-y-1.5"><Label htmlFor="f-email">{t("common.email")}</Label><Input id="f-email" type="email" autoComplete="username" autoFocus {...register("email")} />{errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}</div>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t("customerAuth.sendResetLink")}</Button>
      <p className="text-center text-sm"><Link href="/account/login" className="text-brand hover:underline">{t("customerAuth.backToSignIn")}</Link></p>
    </form>
  );
}

export function ResetPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const schema = z.object({ password: passwordSchema, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: t("customerAuth.thePasswordsDoNotMatch") });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ password: string; confirm: string }>({ resolver: zodResolver(schema) });
  if (!token) return <Banner tone="error">{t("customerAuth.thisResetLinkIsIncompleteUse")}{" "}<Link href="/account/forgot-password" className="underline">{t("customerAuth.requestANewOne")}</Link>.</Banner>;
  return (
    <form onSubmit={handleSubmit(async (v) => { setError(null); try { await resetPassword({ token, newPassword: v.password }); router.replace("/account/login?reset=1"); } catch (e) { setError(portalErrorText(e)); } })} noValidate className="space-y-4" aria-label={t("customerAuth.chooseANewPassword")}>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <PasswordInput id="r-password" label={t("customerAuth.newPassword")} autoComplete="new-password" error={errors.password?.message} {...register("password")} />
      <p className="-mt-2 text-xs text-muted-foreground">{t("customerAuth.atLeast12CharactersWithA")}</p>
      <PasswordInput id="r-confirm" label={t("customerAuth.repeatThePassword")} autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t("customerAuth.setNewPassword")}</Button>
    </form>
  );
}
