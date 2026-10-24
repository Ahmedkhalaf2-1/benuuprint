"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * One process step. From lg up the detail is always visible (the approved desktop layout). Below lg the step is a compact row
 * (number + title) that expands on tap, so eleven steps can be scanned quickly without reading every paragraph.
 */
export function ProcessStep({ n, title, body, you, see }: { n: number; title: string; body: string; you: string; see: string }) {
  const [open, setOpen] = useState(false);
  const id = `step-${n}-detail`;
  return (
    <li className="grid gap-x-8 border-b border-pub-line py-5 sm:grid-cols-[5rem_1fr] sm:gap-y-4 sm:py-9">
      <span aria-hidden className="pub-outline-text hidden text-6xl font-semibold leading-none tracking-tighter sm:block">{String(n).padStart(2, "0")}</span>
      <div>
        <h3 className="text-2xl font-semibold uppercase tracking-tight sm:text-3xl">
          <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex min-h-12 w-full items-center gap-4 text-start uppercase lg:hidden">
            <span aria-hidden className="font-mono text-sm font-normal text-pub-brand sm:hidden">{String(n).padStart(2, "0")}</span>
            <span className="flex-1 text-xl leading-tight sm:text-3xl"><span className="sr-only">Step {n}: </span>{title}</span>
            <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center border border-pub-line text-base font-normal text-pub-muted transition-transform duration-300", open && "rotate-45 border-pub-brand text-pub-brand")}>+</span>
          </button>
          <span className="hidden lg:inline"><span className="sr-only">Step {n}: </span>{title}</span>
        </h3>
        <div id={id} className={cn(open ? "block" : "hidden", "lg:block")}>
          <p className="mt-2 max-w-xl leading-relaxed text-pub-muted sm:mt-3">{body}</p>
          <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3 text-sm sm:mt-5">
            <div><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-brand">You</dt><dd className="mt-1 text-pub-text">{you}</dd></div>
            <div><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-brand">You see</dt><dd className="mt-1 text-pub-text">{see}</dd></div>
          </dl>
        </div>
      </div>
    </li>
  );
}
