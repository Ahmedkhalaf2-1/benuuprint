"use client";

import { getActive } from "@/i18n/active";
import { zodResolver } from "@/lib/forms/resolver";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Label } from "@/components/ui/input";
import { isApiError } from "@/lib/api/errors";
import { landingPath } from "@/features/navigation/nav-config";
import { useAuth } from "./auth-provider";
import { useI18n } from "@/i18n/provider";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

/** Only same-app relative paths are honoured as post-login targets. */
export function safeNext(next: string | null, fallback = "/dashboard"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : fallback;
}

export function loginErrorText(e: unknown): string {
  if (!isApiError(e)) return "Unexpected error. Please try again.";
  if (e.kind === "rate_limited") return e.retryAfter ? getActive().t("auth.tooManySignInAttemptsSeconds", { seconds: e.retryAfter }) : getActive().t("auth.tooManySignInAttempts");
  if (e.kind === "unauthorized") return "Invalid email or password.";
  if (e.kind === "network" || e.status === 503) return "Cannot reach the server. Check your connection and try again.";
  if (e.kind === "server") return "The server had a problem. Please try again shortly.";
  return e.messages.join(" ");
}

export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const { login, status } = auth;
  const landing = landingPath(auth);
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<{ text: string; requestId?: string } | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (status === "authenticated") router.replace(safeNext(params.get("next"), landing));
  }, [status, router, params, landing]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values); // the effect above navigates once the profile (permissions) is loaded
    } catch (e) {
      setFormError({ text: loginErrorText(e), requestId: isApiError(e) ? e.requestId : undefined });
    }
  });

  const expired = params.get("reason") === "expired";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label={t("auth.staffSignIn")}>
      {expired && !formError ? <p role="status" className="rounded-md bg-tone-warning-bg px-3 py-2 text-sm text-tone-warning-fg">{t("auth.yourSessionExpiredPleaseSignIn")}</p> : null}
      {formError ? (
        <div role="alert" className="flex gap-2 rounded-md bg-tone-danger-bg px-3 py-2 text-sm text-tone-danger-fg">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div>
            <p>{formError.text}</p>
            {formError.requestId ? <p className="mt-0.5 text-xs opacity-80">{t("auth.referenceRequestid", { requestId: formError.requestId })}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input id="email" type="email" autoComplete="username" autoFocus aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
        {errors.email ? <p id="email-error" className="text-xs text-danger">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t("auth.password")}</Label>
        <div className="relative">
          <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" className="pe-10" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
          <IconButton label={show ? t("auth.hidePassword") : t("auth.showPassword")} aria-pressed={show} size="sm" icon={show ? <EyeOff /> : <Eye />} className="absolute end-0.5 top-0.5" onClick={() => setShow((s) => !s)} />
        </div>
        {errors.password ? <p id="password-error" className="text-xs text-danger">{errors.password.message}</p> : null}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{isSubmitting ? t("auth.signingIn") : t("auth.signIn")}</Button>
    </form>
  );
}
