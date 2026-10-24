"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { humanizeCode } from "@/lib/utils/format";
import { sectionForProblem } from "./schema";

const SECTION_LABELS: Record<string, string> = {
  "sec-customer": "Customer & brand", "sec-product": "Product", "sec-fabric": "Fabric & colour", "sec-size": "Size & fit", "sec-decoration": "Decoration",
  "sec-accessories": "Accessories & packaging", "sec-files": "Files", "sec-terms": "Terms", "sec-review": "Review",
};

/**
 * "N items need attention": the backend's own submit messages, each linked to its section. `editHref` links to the edit page
 * (used from the detail page); inside the form the links are in-page anchors. Focus moves here when it appears.
 */
export function ProblemsSummary({ messages, editHref }: { messages: string[]; editHref?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, [messages]);
  return (
    <div ref={ref} tabIndex={-1} role="alert" data-testid="problems" className="mb-4 rounded-lg border border-tone-danger-dot bg-tone-danger-bg p-4 text-sm text-tone-danger-fg outline-none">
      <p className="flex items-center gap-2 font-semibold"><AlertCircle aria-hidden className="size-4" /> {messages.length} item{messages.length === 1 ? "" : "s"} {messages.length === 1 ? "needs" : "need"} attention before this sample can be submitted</p>
      <ul className="mt-2 space-y-1">
        {messages.map((m) => {
          const sec = sectionForProblem(m);
          const href = editHref ? `${editHref}#${sec}` : `#${sec}`;
          const text = m.includes(":") ? m.slice(m.indexOf(":") + 1).trim() : m;
          return (
            <li key={m}>
              <Link href={href} className="underline-offset-2 hover:underline">
                <span className="font-medium">{SECTION_LABELS[sec] ?? humanizeCode(sec)}:</span> {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
