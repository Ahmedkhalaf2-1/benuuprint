"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage, isApiError } from "@/lib/api/errors";

import { StageUploader } from "./stage-parts";
import * as api from "./api";
import type { QcInspection, QcResult, StageQuantity } from "./types";
import { useI18n } from "@/i18n/provider";
import { localizedMap } from "@/i18n/active";

type Draft = { result?: "PASS" | "FAIL" | "NA"; numeric?: string; text?: string; notes?: string };
const initial = (r: QcResult): Draft => ({ result: r.result ?? undefined, numeric: r.numericValue == null ? "" : String(r.numericValue), text: r.textValue ?? "", notes: r.notes ?? "" });
const answered = (r: QcResult, d: Draft) => {
  switch (r.resultType) {
    // The backend needs a PASS/FAIL (or N/A) for pass-fail, measurement and photo items; a measurement may carry the measured value too.
    case "PASS_FAIL": case "MEASUREMENT": case "PHOTO_REQUIRED": return !!d.result;
    case "NUMBER": return (d.numeric ?? "").trim() !== "" && Number.isFinite(Number(d.numeric));
    case "TEXT": return (d.text ?? "").trim() !== "";
  }
};

/** Pure: which required checklist items are still unanswered (used for the UI hint; the backend remains authoritative). */
export function missingRequired(results: QcResult[], drafts: Record<string, Draft>) {
  return results.filter((r) => r.required && !answered(r, drafts[r.itemCode] ?? initial(r)));
}

/** Pure: builds the PUT payload for the answered items only. */
export function buildResultsPayload(results: QcResult[], drafts: Record<string, Draft>): api.QcResultInput[] {
  const out: api.QcResultInput[] = [];
  for (const r of results) {
    const d = drafts[r.itemCode] ?? initial(r);
    const item: api.QcResultInput = { itemCode: r.itemCode };
    if ((r.resultType === "PASS_FAIL" || r.resultType === "PHOTO_REQUIRED") && d.result) item.result = d.result;
    else if (r.resultType === "MEASUREMENT" && (d.result || (d.numeric ?? "").trim() !== "")) { if (d.result) item.result = d.result; if ((d.numeric ?? "").trim() !== "") item.numericValue = Number(d.numeric); }
    else if (r.resultType === "NUMBER" && (d.numeric ?? "").trim() !== "") item.numericValue = Number(d.numeric);
    else if (r.resultType === "TEXT" && (d.text ?? "").trim() !== "") item.textValue = d.text!.trim();
    else if (!(d.notes ?? "").trim()) continue;
    if ((d.notes ?? "").trim()) item.notes = d.notes!.trim();
    out.push(item);
  }
  return out;
}

export const RESULT_LABEL: Record<string, string> = localizedMap({ PASS: "Pass", FAIL: "Fail", NA: "N/A" });

/** Read-only view of an inspection (job QC tab, completed inspections, history). */
export function InspectionSummary({ inspection }: { inspection: QcInspection }) {
  const { t, fmt } = useI18n();
  return (
    <div className="space-y-2 text-sm" data-testid="inspection">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{inspection.stageName}</span>
        <StatusBadge status={inspection.overallResult === "PASS" ? "COMPLETED" : inspection.overallResult === "FAIL" ? "FAILED" : inspection.overallResult === "CONDITIONAL_PASS" ? "BLOCKED" : "IN_PROGRESS"} label={inspection.overallResult ? fmt.code(inspection.overallResult) : t("production.inProgress")} />
        <span className="text-xs text-muted-foreground">{inspection.inspectorName} · {fmt.dateTime(inspection.completedAt ?? inspection.startedAt)}</span>
      </p>
      {inspection.inspectedQuantity != null ? <p className="text-xs">{t("production.inspectedInspectedquantityPassed", { inspectedQuantity: inspection.inspectedQuantity })}{" "}{inspection.passedQuantity ?? 0}{" "}{t("production.failed")}{" "}<span className={(inspection.failedQuantity ?? 0) > 0 ? "font-semibold text-danger" : ""}>{inspection.failedQuantity ?? 0}</span></p> : null}
      <ul className="divide-y rounded-md border">
        {inspection.results.map((r) => (
          <li key={r.itemCode} className="flex flex-wrap items-baseline gap-x-3 px-3 py-1.5">
            <span className="min-w-0 flex-1">{r.label}{r.required ? <span aria-hidden className="text-danger"> *</span> : null}</span>
            <span className={r.result === "FAIL" ? "font-semibold text-danger" : ""}>{r.result ? RESULT_LABEL[r.result] : r.numericValue != null ? String(r.numericValue) : r.textValue ?? "—"}</span>
            {r.notes ? <span className="basis-full text-xs text-muted-foreground">{r.notes}</span> : null}
          </li>
        ))}
      </ul>
      {inspection.notes ? <p className="text-xs"><span className="text-muted-foreground">{t("production.notes")}</span> {inspection.notes}</p> : null}
      {inspection.reworkId ? <p className="text-xs text-tone-warning-fg">{t("production.aReworkRecordWasCreatedFrom")}</p> : null}
    </div>
  );
}

/**
 * Executes QC: the checklist is whatever the backend's template returned (PASS/FAIL, number, measurement, text, photo), never a
 * hard-coded list. Results are saved (repeatable) and then the inspection is completed with an overall result; the backend
 * decides if the result is acceptable (e.g. a plain PASS with failed items is refused) and its message is shown verbatim.
 */
export function QcExecution({ inspection, quantity, stageCodes, onChanged }: { inspection: QcInspection; quantity: StageQuantity | null; stageCodes: Array<{ code: string; name: string }>; onChanged: () => void }) {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [photos, setPhotos] = useState(inspection.photoCount);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const set = (code: string, patch: Draft) => setDrafts((d) => ({ ...d, [code]: { ...d[code], ...patch } }));
  const view = (r: QcResult): Draft => drafts[r.itemCode] ?? initial(r);
  const missing = missingRequired(inspection.results, drafts);
  const save = useMutation({ mutationFn: () => api.qcSaveResults(inspection.id, buildResultsPayload(inspection.results, drafts)) });
  const failing = inspection.results.some((r) => view(r).result === "FAIL");

  return (
    <section aria-label={t("production.qualityInspection")} className="space-y-3" data-testid="qc-form">
      <h4 className="text-sm font-semibold">{t("production.inspectionStagename", { stageName: inspection.stageName })}</h4>
      {error ? <FormError {...error} /> : null}
      <ul className="space-y-3">
        {inspection.results.map((r) => {
          const d = view(r);
          const id = `qc-${r.itemCode}`;
          return (
            <li key={r.itemCode} className="space-y-1.5 rounded-md border p-3" data-testid="qc-item" data-type={r.resultType}>
              <p className="text-sm font-medium" id={`${id}-l`}>{r.label}{r.required ? <span className="text-danger" aria-label={t("production.required")}> *</span> : <span className="ms-1 text-xs font-normal text-muted-foreground">{t("production.optional")}</span>}</p>
              {r.resultType === "PASS_FAIL" || r.resultType === "MEASUREMENT" || r.resultType === "PHOTO_REQUIRED" ? (
                <div role="radiogroup" aria-labelledby={`${id}-l`} className="flex gap-2">
                  {(["PASS", "FAIL", "NA"] as const).map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={d.result === v} onClick={() => set(r.itemCode, { result: v })}
                      className={`min-h-10 flex-1 rounded-md border px-3 text-sm font-medium ${d.result === v ? (v === "FAIL" ? "border-danger bg-danger/10 text-danger" : v === "PASS" ? "border-tone-success-dot bg-tone-success-bg text-tone-success-fg" : "border-brand bg-brand-soft/40") : "bg-surface hover:bg-surface-muted"}`}>{RESULT_LABEL[v]}</button>
                  ))}
                </div>
              ) : null}
              {r.resultType === "NUMBER" || r.resultType === "MEASUREMENT" ? <Input aria-labelledby={`${id}-l`} inputMode="decimal" value={d.numeric ?? ""} onChange={(e) => set(r.itemCode, { numeric: e.target.value })} placeholder={r.resultType === "MEASUREMENT" ? t("production.measuredValue") : t("common.number")} /> : null}
              {r.resultType === "TEXT" ? <Textarea aria-labelledby={`${id}-l`} rows={2} value={d.text ?? ""} onChange={(e) => set(r.itemCode, { text: e.target.value })} /> : null}
              {r.resultType === "PHOTO_REQUIRED" ? <p className="text-xs text-muted-foreground">{t("production.photoEvidenceIsRequiredPhotosAttached", { photos })}</p> : null}
              <Input aria-label={t("production.notesForLabel", { label: r.label })} value={d.notes ?? ""} onChange={(e) => set(r.itemCode, { notes: e.target.value })} placeholder={t("production.noteOptional")} className="h-9" />
            </li>
          );
        })}
      </ul>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("production.evidencePhotos")}{" "}<span className="text-xs font-normal text-muted-foreground">{t("production.photosAttached", { photos })}</span></p>
        <StageUploader hint={t("production.photosPdfsOfTheInspectedGarments")} onUpload={async (f) => { await api.qcUploadPhoto(inspection.id, f); setPhotos((n) => n + 1); onChanged(); }} />
      </div>
      {missing.length > 0 ? <p role="status" className="text-xs text-muted-foreground" data-testid="qc-missing">{t("production.stillToAnswerLengthV2", { length: missing.length, v2: missing.map((m) => m.label).join(", ") })}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" loading={save.isPending} onClick={async () => { setError(null); try { await save.mutateAsync(); toast.success(t("production.resultsSaved")); onChanged(); } catch (e) { setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined }); } }}>{t("production.saveResults")}</Button>
        <Button disabled={missing.length > 0} onClick={() => { setError(null); setCompleting(true); }}>{t("production.completeInspection")}</Button>
      </div>
      {completing ? (
        <CompleteDialog inspection={inspection} quantity={quantity} stageCodes={stageCodes} suggestFail={failing}
          save={() => api.qcSaveResults(inspection.id, buildResultsPayload(inspection.results, drafts))}
          onClose={() => setCompleting(false)} onDone={() => { setCompleting(false); onChanged(); }} onError={setError} />
      ) : null}
    </section>
  );
}

function CompleteDialog({ inspection, quantity, stageCodes, suggestFail, save, onClose, onDone, onError }: {
  inspection: QcInspection; quantity: StageQuantity | null; stageCodes: Array<{ code: string; name: string }>; suggestFail: boolean;
  save: () => Promise<unknown>; onClose: () => void; onDone: () => void; onError: (e: { message: string; requestId?: string }) => void;
}) {
  const { t } = useI18n();
  const [overall, setOverall] = useState<"PASS" | "FAIL" | "CONDITIONAL_PASS">(suggestFail ? "FAIL" : "PASS");
  const [notes, setNotes] = useState("");
  const [inspected, setInspected] = useState(quantity ? String(quantity.required) : "");
  const [passed, setPassed] = useState("");
  const [failed, setFailed] = useState("");
  const [target, setTarget] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const run = useMutation({
    mutationFn: async () => {
      await save();
      return api.qcComplete(inspection.id, { overallResult: overall, ...(notes.trim() ? { notes: notes.trim() } : {}), ...(quantity ? { inspectedQuantity: num(inspected), passedQuantity: num(passed), failedQuantity: num(failed) } : {}), ...(overall === "FAIL" && target ? { reworkTargetStageCode: target } : {}) });
    },
  });
  const bulk = !!quantity;
  const sum = (num(passed) ?? 0) + (num(failed) ?? 0);
  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent title={t("production.completeInspection2")} description={t("production.savesYourAnswersThenRecordsThe")}>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setLocalError(null);
          if ((overall === "FAIL" || overall === "CONDITIONAL_PASS") && notes.trim().length === 0) { setLocalError(overall === "FAIL" ? "Notes are required for a FAIL result." : "Notes are required for a conditional pass."); return; }
          if (bulk && (num(inspected) == null || num(passed) == null || num(failed) == null)) { setLocalError("Enter inspected, passed and failed quantities."); return; }
          if (bulk && sum !== num(inspected)) { setLocalError(t("production.passedFailedMustEqual", { sum, inspected: num(inspected) })); return; }
          try { await run.mutateAsync(); toast.success(overall === "FAIL" ? t("production.inspectionFailedReworkCreated") : t("production.inspectionCompleted")); onDone(); } catch (err) { onClose(); onError({ message: errorMessage(err), requestId: isApiError(err) ? err.requestId : undefined }); }
        }}>
          {localError ? <FormError message={localError} /> : null}
          <FormField id="qc-overall" label={t("production.overallResult")} required>
            <Select id="qc-overall" value={overall} onValueChange={(v) => setOverall(v as typeof overall)} options={[{ value: "PASS", label: t("production.pass") }, { value: "CONDITIONAL_PASS", label: t("production.conditionalPass") }, { value: "FAIL", label: t("production.failCreatesRework") }]} />
          </FormField>
          {bulk ? (
            <div className="grid grid-cols-3 gap-2">
              <FormField id="qc-in" label={t("production.inspected")}><Input id="qc-in" inputMode="numeric" value={inspected} onChange={(e) => setInspected(e.target.value)} /></FormField>
              <FormField id="qc-pa" label={t("production.passed")}><Input id="qc-pa" inputMode="numeric" value={passed} onChange={(e) => setPassed(e.target.value)} /></FormField>
              <FormField id="qc-fa" label={t("production.failed2")}><Input id="qc-fa" inputMode="numeric" value={failed} onChange={(e) => setFailed(e.target.value)} /></FormField>
            </div>
          ) : null}
          {overall === "FAIL" ? (
            <FormField id="qc-target" label={t("production.sendReworkBackTo")} hint={t("production.leaveOnDefaultToLetThe")}>
              <Select id="qc-target" value={target || "__default"} onValueChange={(v) => setTarget(v === "__default" ? "" : v)} options={[{ value: "__default", label: t("production.workflowDefault") }, ...stageCodes.map((s) => ({ value: s.code, label: s.name }))]} />
            </FormField>
          ) : null}
          <FormField id="qc-notes" label={t("common.notes")} required={overall !== "PASS"}><Textarea id="qc-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.back")}</Button><Button type="submit" variant={overall === "FAIL" ? "danger" : "primary"} loading={run.isPending}>{t("production.completeInspection2")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
