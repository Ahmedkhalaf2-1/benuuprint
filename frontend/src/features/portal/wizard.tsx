"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/errors";
import * as api from "./api";
import { useOptions, useSample, useSampleInvalidation } from "./hooks";
import { ReviewStep } from "./review";
import { BrandStep, DecorationStep, ExtrasStep, FabricStep, FilesStep, NotesStep, ProductStep, SizeStep, type StepHandle } from "./steps";
import type { SampleBody } from "./types";
import { STEPS, type StepKey } from "./wizard-config";
import { StepNav } from "./wizard-ui";

export { STEPS, type StepKey } from "./wizard-config";

/**
 * Guided sample request: one step per question, progressive saves (PATCH per step; decorations, accessories, labels and files go
 * through their own endpoints immediately). "Save draft" works with incomplete data; leaving a step saves its edits first.
 */
export function SampleWizard({ id }: { id: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = useSample(id);
  const options = useOptions();
  const invalidate = useSampleInvalidation();
  const stepRef = useRef<StepHandle | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StepKey | null>(null); // a step opened from a review card's Edit action
  const [flash, setFlash] = useState<StepKey | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const requested = sp.get("step");
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === requested));
  const step = STEPS[idx]!;

  const go = async (to: number) => {
    if (stepRef.current?.dirty) { setSaving(true); const ok = await stepRef.current.save(); setSaving(false); if (!ok) return; }
    const p = new URLSearchParams(sp.toString()); p.set("step", STEPS[to]!.key);
    router.replace(`${pathname}?${p}`, { scroll: true });
  };

  const edit = (k: StepKey) => { setEditing(k); void go(STEPS.findIndex((x) => x.key === k)); };
  const backToReview = async () => {
    const from = editing;
    if (stepRef.current?.dirty) { setSaving(true); const ok = await stepRef.current.save(); setSaving(false); if (!ok) return; }
    setEditing(null);
    await go(STEPS.length - 1);
    if (from) { setFlash(from); setTimeout(() => setFlash(null), 2600); }
  };

  if (q.isLoading || options.isLoading) return <PageSkeleton />;
  if (q.error) {
    if (isApiError(q.error) && (q.error.kind === "not_found" || q.error.kind === "validation")) return <EmptyState title="Sample not found" description="We couldn't find that sample request." action={<Button asChild variant="secondary"><Link href="/account/samples">Back to my samples</Link></Button>} className="py-20" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  if (options.error || !options.data) return <ErrorState error={options.error} onRetry={() => options.refetch()} />;
  const sample = q.data;
  if (!sample) return null;
  if (!sample.editable) return <EmptyState title="This request can no longer be edited" description="It has already been submitted. You can still follow its progress." action={<Button asChild><Link href={`/account/samples/${sample.id}`}>View request</Link></Button>} className="py-20" />;

  const patch = async (body: SampleBody) => { await api.updateSample(id, body); invalidate(id); };
  const props = { sample, options: options.data, stepRef, patch, changed: () => invalidate(id) };
  const saveDraft = async () => {
    if (stepRef.current) { setSaving(true); const ok = await stepRef.current.save(); setSaving(false); if (!ok) return; }
    toast.success("Draft saved");
  };
  const Body = { brand: BrandStep, product: ProductStep, fabric: FabricStep, size: SizeStep, decoration: DecorationStep, extras: ExtrasStep, files: FilesStep, notes: NotesStep }[step.key as Exclude<StepKey, "review">];

  return (
    <div className="space-y-8">
      <div><p className="text-sm"><Link href="/account/samples" className="text-muted-foreground hover:text-foreground hover:underline">← My samples</Link></p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Your sample request <span className="ms-2 whitespace-nowrap font-mono text-sm font-normal text-brand">{sample.sampleNumber}</span></h1>
        <p className="text-sm text-muted-foreground">Tell us what you want to manufacture. Your progress is saved as a draft.</p></div>
      <StepNav current={idx} onGo={(i) => { setEditing(null); void go(i); }} />
      {editing && step.key !== "review" ? (
        <div role="status" className="bp-enter-item flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand/35 bg-brand-soft/40 px-4 py-2.5 text-sm" data-testid="editing-banner">
          <span>You are editing from your review. Your changes are saved when you return.</span>
          <Button size="sm" variant="secondary" onClick={() => void backToReview()}><ArrowLeft /> Return to review</Button>
        </div>
      ) : null}
      <div key={step.key} className="bp-enter rounded-lg border bg-surface p-5 sm:p-7" data-testid="step-body" data-step={step.key}>
        {step.key === "review" ? <ReviewStep sample={sample} changed={() => invalidate(id)} onEdit={edit} highlight={flash} submitSlot={slot} onSubmitted={() => { invalidate(id); router.replace(`/account/samples/${id}?submitted=1`); }} /> : Body ? <Body {...props} /> : null}
      </div>
      <div className="sticky bottom-[4.25rem] z-20 -mx-4 border-t bg-surface-sunken px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0" data-testid="wizard-actions">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" className="h-11 sm:h-9" disabled={idx === 0 || saving} onClick={() => void go(idx - 1)}>Back</Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="h-11 sm:h-9" loading={saving} onClick={() => void saveDraft()}>Save draft</Button>
            {step.key !== "review" ? <Button className="h-11 sm:h-9" loading={saving} onClick={() => void go(idx + 1)}>Save &amp; continue</Button> : <span ref={setSlot} data-testid="submit-slot" className="contents" />}
          </div>
        </div>
      </div>
    </div>
  );
}
