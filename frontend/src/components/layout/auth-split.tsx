import type { ReactNode } from "react";
import { resolveLoginMedia } from "@/features/public-site/hero-media";
import { AuthVisual } from "./auth-visual";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { Brand } from "./brand";

/**
 * Sign-in composition shared by staff (`/login`) and customer (`/account/login`): form column about 40 %, brand video about 60 %
 * from lg; on phones/tablets the form comes first and the visual is a short band beneath it. The form never stretches with its column.
 */
export function AuthSplit({ children, footer, eyebrow, headline }: { children: ReactNode; footer: string; eyebrow: string; headline: [string, string] }) {
  const media = resolveLoginMedia();
  return (
    <div className="grid min-h-dvh grid-rows-[1fr_auto] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-1">
      <div className="relative flex flex-col px-6 py-8 sm:px-12 lg:px-14">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_65%)] lg:hidden" />
        <div className="relative flex items-center justify-between gap-3"><Brand /><LanguageSwitcher /></div>
        <main className="relative mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-12">{children}</main>
        <p className="relative font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">{footer}</p>
      </div>
      <AuthVisual videoSrc={media.video} posterSrc={media.poster} eyebrow={eyebrow} headline={headline} />
    </div>
  );
}
