import { Ban, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Product <-> fabric GUIDANCE from the backend (isRecommended / isAllowed). It is information, not a frontend business
 * rule: a missing relationship means "no guidance", and the backend does not forbid custom selections.
 * Icon + text on every state so colour is never the only signal.
 */
export function Compatibility({ isRecommended, isAllowed }: { isRecommended: boolean; isAllowed: boolean }) {
  const state = !isAllowed ? "not-allowed" : isRecommended ? "recommended" : "allowed";
  const cfg = {
    recommended: { label: "Recommended", Icon: Star, cls: "bg-tone-success-bg text-tone-success-fg" },
    allowed: { label: "Allowed", Icon: Check, cls: "bg-tone-neutral-bg text-tone-neutral-fg" },
    "not-allowed": { label: "Not allowed", Icon: Ban, cls: "bg-tone-danger-bg text-tone-danger-fg" },
  }[state];
  return (
    <span data-compat={state} className={cn("inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-[0.75rem] font-medium leading-none", cfg.cls)}>
      <cfg.Icon aria-hidden className="size-3" />
      {cfg.label}
    </span>
  );
}
