import { cn } from "@/lib/utils/cn";

const PIECE = "M0 60 Q120 120 240 60 L300 100 V420 H-60 V100 Z";

/**
 * TEMPORARY 2D hero environment: textile light, flat-pattern fragments with seam allowance, grain lines, notches and a running
 * stitch. No photography. A future "3D garment" hero mode (or the final film) replaces/overlays this inside <VideoHero fallback>.
 */
export function HeroGarment2D({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("absolute inset-0", className)} data-hero-visual="2d">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 70% at 78% 38%, rgb(255 255 255 / 0.07), transparent 65%), radial-gradient(ellipse 60% 60% at 70% 90%, rgb(12 127 93 / 0.3), transparent 70%)" }} />
      <div className="pub-drift-slow absolute inset-0 opacity-60" style={{ background: "repeating-linear-gradient(135deg, #131615 0 3px, #1b1f1e 3px 6px)", maskImage: "linear-gradient(to right, transparent 5%, black 70%)" }} />
      <svg className="pub-drift absolute inset-0 size-full" viewBox="0 0 1600 900" preserveAspectRatio="xMaxYMid slice" fill="none">
        <g transform="translate(860 120) rotate(-8)" stroke="var(--pub-text)" strokeOpacity="0.5" strokeWidth="1.5">
          <path d={PIECE} fill="rgb(255 255 255 / 0.025)" />
          <path d={PIECE} stroke="var(--pub-brand)" strokeOpacity="0.55" strokeDasharray="6 7" transform="translate(0 -6) scale(0.96 0.96) translate(5 4)" />
          <path d="M120 210 V380 M112 222 L120 210 L128 222 M112 368 L120 380 L128 368" stroke="var(--pub-muted)" strokeOpacity="0.8" />
          <path d="M0 250 h12 M240 250 h-12 M0 350 h12 M240 350 h-12" />
          <text x="86" y="300" fontSize="12" letterSpacing="4" fill="var(--pub-muted)" stroke="none" style={{ fontFamily: "var(--font-mono)" }}>FRONT</text>
        </g>
        <g transform="translate(1260 90) rotate(14)" stroke="var(--pub-text)" strokeOpacity="0.4" strokeWidth="1.5">
          <path d="M0 40 L110 0 L150 130 L40 190 Z" fill="rgb(255 255 255 / 0.02)" />
          <path d="M60 70 L100 140 M52 80 L60 70 L70 76" stroke="var(--pub-muted)" strokeOpacity="0.7" />
          <text x="40" y="168" fontSize="11" letterSpacing="4" fill="var(--pub-muted)" stroke="none" style={{ fontFamily: "var(--font-mono)" }}>SLEEVE</text>
        </g>
        <g stroke="var(--pub-muted)" strokeOpacity="0.55" strokeWidth="1"><path d="M1480 120 v28 M1466 134 h28" /><path d="M640 780 v28 M626 794 h28" /><circle cx="1480" cy="134" r="9" /><circle cx="640" cy="794" r="9" /></g>
        <path className="pub-stitch" d="M-40 700 C 380 590, 640 800, 1000 610 S 1500 380, 1660 450" stroke="var(--pub-brand)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M-40 728 C 380 618, 640 828, 1000 638 S 1500 408, 1660 478" stroke="var(--pub-line)" strokeWidth="1" />
      </svg>
    </div>
  );
}
