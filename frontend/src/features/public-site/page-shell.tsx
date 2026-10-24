import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { ContactLink, StartSampleLink } from "./cta";
import { EditorialHeading, Eyebrow } from "./primitives";

/** Shared secondary-page hero: eyebrow, large title, short lede and a cropped outline word, on the same dark field as the homepage. */
export function PageHero({ eyebrow, title, lede, outline, field = false, children }: { eyebrow: string; title: ReactNode; lede?: string; outline?: string; field?: boolean; children?: ReactNode }) {
  return (
    <header className={cn("relative isolate overflow-hidden border-b border-pub-line", field ? "bg-pub-field" : "bg-pub-bg")}>
      {outline ? <p aria-hidden className="pub-outline-text pointer-events-none absolute -bottom-[0.2em] end-[-0.04em] -z-10 select-none whitespace-nowrap text-[clamp(7rem,22vw,22rem)] font-semibold uppercase leading-none tracking-[-0.06em]">{outline}</p> : null}
      <div className="mx-auto w-full max-w-[88rem] px-5 pb-12 pt-28 sm:px-8 sm:pb-28 sm:pt-44 lg:px-12">
        <Eyebrow className="pub-fade">{eyebrow}</Eyebrow>
        <EditorialHeading as="h1" className="pub-fade mt-6 text-[clamp(3rem,10vw,9rem)]">{title}</EditorialHeading>
        {lede ? <p className="pub-fade mt-8 max-w-xl text-base leading-relaxed text-pub-muted sm:text-lg" style={{ "--d": "250ms" } as React.CSSProperties}>{lede}</p> : null}
        {children ? <div className="pub-fade mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row [&>a]:h-14 [&>a]:w-full sm:[&>a]:h-12 sm:[&>a]:w-auto" style={{ "--d": "450ms" } as React.CSSProperties}>{children}</div> : null}
      </div>
    </header>
  );
}

/** Closing call to action shared by the secondary pages. Start a Sample is the primary action; Contact is the secondary. */
export function PublicCta({ title = "Ready to make it real?", text = "Start with a sample. Scale when it's right." }: { title?: string; text?: string }) {
  return (
    <section data-cta-end aria-labelledby="page-cta-title" className="relative isolate overflow-hidden border-t border-pub-line">
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse 60% 90% at 85% 100%, rgb(12 127 93 / 0.3), transparent 70%)" }} />
      <div className="mx-auto w-full max-w-[88rem] px-5 py-16 sm:px-8 sm:py-32 lg:px-12">
        <h2 id="page-cta-title" className="pub-reveal text-balance text-[clamp(2.5rem,7vw,6rem)] font-semibold uppercase [line-height:0.92] tracking-[-0.05em]">{title}</h2>
        <p className="mt-6 max-w-md text-lg text-pub-muted">{text}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row"><StartSampleLink className="h-14 w-full sm:h-12 sm:w-auto" /><ContactLink className="h-14 w-full sm:h-12 sm:w-auto" /></div>
      </div>
    </section>
  );
}
