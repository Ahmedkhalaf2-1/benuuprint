import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { FabricVisualKey } from "./garment/types";

/** Small mono label used as the section marker. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand", className)}>{children}</p>;
}

/** Display type: large, tight, uppercase. `as` keeps the heading hierarchy correct per section. */
export function EditorialHeading({ as: Tag = "h2", children, className }: { as?: ElementType; children: ReactNode; className?: string }) {
  return <Tag className={cn("text-balance font-semibold uppercase [line-height:0.92] tracking-[-0.045em] text-[clamp(2.25rem,7.2vw,6.5rem)]", className)}>{children}</Tag>;
}

export function SectionIntro({ eyebrow, title, children, className }: { eyebrow: string; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cn("pub-reveal max-w-5xl", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <EditorialHeading className="mt-5">{title}</EditorialHeading>
      {children ? <p className="mt-4 max-w-xl text-base leading-relaxed text-pub-muted sm:mt-6 sm:text-lg">{children}</p> : null}
    </header>
  );
}

/** Page section frame: shared gutters, max width and top rule. */
export function Section({ id, labelledBy, children, className }: { id?: string; labelledBy?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("scroll-mt-20 border-t border-pub-line", className)}>
      <div className="mx-auto w-full max-w-[88rem] px-5 py-12 sm:px-8 sm:py-32 lg:px-12">{children}</div>
    </section>
  );
}

/** Framed media slot. Renders its children (a real image, or the CSS texture fallback) inside a consistent crop. */
export function MediaFrame({ children, caption, className }: { children: ReactNode; caption?: string; className?: string }) {
  return (
    <figure className={cn("relative overflow-hidden border border-pub-line bg-pub-surface", className)}>
      {children}
      {caption ? <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-pub-bg/90 to-transparent p-4 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted">{caption}</figcaption> : null}
    </figure>
  );
}

/** CSS-only macro-textile visuals (no photography, no material data). The key is a decorative token only. */
const LIGHT = "radial-gradient(ellipse at 28% 18%, rgb(255 255 255 / 0.12), transparent 55%), linear-gradient(to bottom, transparent 55%, rgb(0 0 0 / 0.45))";
const TEXTURES: Record<FabricVisualKey, string> = {
  jersey: `${LIGHT}, repeating-linear-gradient(100deg, transparent 0 5px, rgb(0 0 0 / 0.28) 5px 7px), repeating-linear-gradient(80deg, transparent 0 5px, rgb(255 255 255 / 0.05) 5px 7px), #1d2221`,
  rib: `${LIGHT}, repeating-linear-gradient(90deg, rgb(0 0 0 / 0.4) 0 4px, rgb(255 255 255 / 0.05) 4px 6px, transparent 6px 12px), #1a1e1d`,
  fleece: `${LIGHT}, radial-gradient(circle at 30% 30%, rgb(255 255 255 / 0.1) 0 2px, transparent 3px) 0 0 / 13px 13px, radial-gradient(circle at 70% 70%, rgb(0 0 0 / 0.3) 0 2px, transparent 3px) 0 0 / 9px 9px, #202524`,
  brushed: `${LIGHT}, repeating-linear-gradient(88deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 4px), repeating-linear-gradient(92deg, rgb(0 0 0 / 0.18) 0 1px, transparent 1px 7px), #1f2322`,
  twill: `${LIGHT}, repeating-linear-gradient(135deg, rgb(0 0 0 / 0.3) 0 4px, rgb(255 255 255 / 0.05) 4px 8px), #1c2120`,
};
export function Texture({ kind, className }: { kind: FabricVisualKey; className?: string }) {
  return <div aria-hidden className={cn("size-full", className)} style={{ background: TEXTURES[kind] }} data-fabric-visual={kind} />;
}

/** Decorative stitch divider between sections; draws itself as it enters view (path length is normalised). */
export function StitchDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12", className)}>
      <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="h-6 w-full" fill="none">
        <path className="pub-draw" pathLength={1} d="M0 12 C 200 2, 300 22, 520 12 S 900 2, 1200 12" stroke="var(--pub-brand)" strokeWidth="1.5" strokeDasharray="1" />
      </svg>
    </div>
  );
}
