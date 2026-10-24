"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { isMoneyInput, lineAmount, previewTotals, fromMinor } from "@/lib/utils/money";

import * as api from "./api";
import { useCommercialInvalidation } from "./hooks";
import { LINE_TYPES, type CommercialTarget, type LineType, type QuotationVersion } from "./types";
import { useI18n } from "@/i18n/provider";

interface Row { key: number; type: LineType; description: string; quantity: string; unitPrice: string }
let seq = 0;
const blank = (): Row => ({ key: ++seq, type: "SAMPLE_FEE", description: "", quantity: "1", unitPrice: "" });
const fromVersion = (v: QuotationVersion): Row[] => v.lineItems.map((l) => ({ key: ++seq, type: l.type, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice }));
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export type EditorMode =
  | { kind: "create"; target: CommercialTarget }
  | { kind: "version"; target: CommercialTarget; quotationId: string; from: QuotationVersion }
  | { kind: "edit"; target: CommercialTarget; version: QuotationVersion };

export interface LineErrors { description?: string; quantity?: string; unitPrice?: string }

/** UX validation only (the server validates and calculates). Money stays as validated strings until the request. */
export function validateRows(rows: Pick<Row, "type" | "description" | "quantity" | "unitPrice">[]): { errors: LineErrors[]; ok: boolean } {
  const errors = rows.map((r): LineErrors => ({
    description: r.description.trim() ? undefined : "Describe the line",
    quantity: isMoneyInput(r.quantity) && Number(r.quantity) > 0 ? undefined : "Quantity above 0 (up to 2 decimals)",
    unitPrice: isMoneyInput(r.unitPrice, { allowNegative: r.type === "DISCOUNT_ADJUSTMENT" }) ? undefined : r.type === "DISCOUNT_ADJUSTMENT" ? "Amount with up to 2 decimals" : "Amount ≥ 0 with up to 2 decimals (negative only for discount lines)",
  }));
  return { errors, ok: rows.length > 0 && errors.every((e) => !e.description && !e.quantity && !e.unitPrice) };
}

export function QuotationEditor({ mode, onClose }: { mode: EditorMode; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const inv = useCommercialInvalidation(mode.target);
  const base = mode.kind === "create" ? null : mode.kind === "version" ? mode.from : mode.version;
  const [rows, setRows] = useState<Row[]>(base ? fromVersion(base) : [blank()]);
  const [discount, setDiscount] = useState(base ? String(Number(base.discount)) : "0");
  const [tax, setTax] = useState(base ? String(Number(base.taxPercent)) : "0");
  const [notes, setNotes] = useState(base?.notes ?? "");
  const [validUntil, setValidUntil] = useState(toLocalInput(base?.validUntil ?? null));
  const [currency, setCurrency] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const { errors, ok } = validateRows(rows);
  const discountOk = isMoneyInput(discount || "0");
  const taxOk = isMoneyInput(tax || "0") && Number(tax || "0") <= 100;
  const preview = previewTotals(rows, discount, tax);

  const save = useMutation<unknown>({
    mutationFn: () => {
      const body: api.QuotationBody = {
        lineItems: rows.map((r) => ({ type: r.type, description: r.description.trim(), quantity: Number(r.quantity), unitPrice: Number(r.unitPrice) })),
        discount: Number(discount || "0"),
        taxPercent: Number(tax || "0"),
        notes: notes.trim() || null,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      };
      if (mode.kind === "create") return api.createQuotation(mode.target, { ...body, notes: body.notes ?? undefined, validUntil: body.validUntil ?? undefined, ...(currency.trim() ? { currency: currency.trim().toUpperCase() } : {}) });
      if (mode.kind === "version") return api.createQuotationVersion(mode.quotationId, body);
      return api.updateQuotationVersion(mode.version.id, body);
    },
    onSuccess: () => inv.all(),
  });

  const submit = async () => {
    setError(null);
    setShowErrors(true);
    if (!ok || !discountOk || !taxOk) return;
    try {
      await save.mutateAsync();
      toast.success(mode.kind === "edit" ? t("quotations.draftUpdated") : mode.kind === "version" ? t("quotations.newVersionCreatedDraft") : t("quotations.quotationCreatedDraft"));
      onClose();
    } catch (e) {
      setError({ message: errorMessage(e), requestId: isApiError(e) ? e.requestId : undefined });
    }
  };

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const title = mode.kind === "create" ? t("quotations.newQuotation") : mode.kind === "version" ? t("quotations.newVersionFrom", { n: mode.from.versionNumber }) : t("quotations.editDraftVersion", { n: mode.version.versionNumber });

  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent title={title} description={mode.kind === "version" && mode.from.status === "SENT" ? t("quotations.aSentVersionCannotBeEdited") : t("quotations.amountsAreCalculatedByTheServer")} className="max-w-3xl">
        <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-4">
          {error ? <FormError {...error} /> : null}
          <div className="space-y-2" role="group" aria-label={t("quotations.lineItems")}>
            <div className="hidden grid-cols-[9rem_minmax(0,1fr)_5.5rem_7rem_6.5rem_2rem] gap-2 text-xs text-muted-foreground md:grid"><span>{t("common.type")}</span><span>{t("common.description")}</span><span>{t("common.quantity")}</span><span>{t("quotations.unitPrice")}</span><span className="text-end">{t("quotations.amount")}</span><span /></div>
            {rows.map((r, i) => {
              const e = showErrors ? errors[i] : undefined;
              const amt = lineAmount(r);
              return (
                <div key={r.key} data-testid="line-row" className="grid gap-2 rounded-md border p-2 md:grid-cols-[9rem_minmax(0,1fr)_5.5rem_7rem_6.5rem_2rem] md:items-start md:border-0 md:p-0">
                  <Select aria-label={t("quotations.lineV1Type", { v1: i + 1 })} value={r.type} onValueChange={(v) => update(r.key, { type: v as LineType })} options={LINE_TYPES.map((t) => ({ value: t, label: fmt.code(t) }))} />
                  <FormField id={`l-${r.key}-d`} label={t("quotations.lineV1Description", { v1: i + 1 })} error={e?.description} className="[&>label]:sr-only"><Input id={`l-${r.key}-d`} aria-invalid={!!e?.description} value={r.description} onChange={(ev) => update(r.key, { description: ev.target.value })} /></FormField>
                  <FormField id={`l-${r.key}-q`} label={t("quotations.lineV1Quantity", { v1: i + 1 })} error={e?.quantity} className="[&>label]:sr-only"><Input id={`l-${r.key}-q`} inputMode="decimal" aria-invalid={!!e?.quantity} value={r.quantity} onChange={(ev) => update(r.key, { quantity: ev.target.value })} /></FormField>
                  <FormField id={`l-${r.key}-u`} label={t("quotations.lineV1UnitPrice", { v1: i + 1 })} error={e?.unitPrice} className="[&>label]:sr-only"><Input id={`l-${r.key}-u`} inputMode="decimal" aria-invalid={!!e?.unitPrice} value={r.unitPrice} onChange={(ev) => update(r.key, { unitPrice: ev.target.value })} /></FormField>
                  <p className="flex h-9 items-center justify-end text-sm tabular-nums text-muted-foreground" aria-label={t("quotations.lineV1AmountPreview", { v1: i + 1 })}>{amt === null ? "—" : fromMinor(amt)}</p>
                  <IconButton size="sm" label={t("quotations.removeLineV1", { v1: i + 1 })} icon={<Trash2 />} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} />
                </div>
              );
            })}
            {showErrors && rows.length === 0 ? <p role="alert" className="text-xs text-danger">{t("quotations.addAtLeastOneLine")}</p> : null}
            <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, blank()])}><Plus />{" "}{t("quotations.addLine")}</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FormField id="q-discount" label={t("quotations.discountAmount")} error={showErrors && !discountOk ? "Amount ≥ 0 with up to 2 decimals" : undefined}><Input id="q-discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} /></FormField>
            <FormField id="q-tax" label={t("quotations.tax")} error={showErrors && !taxOk ? "0–100 with up to 2 decimals" : undefined}><Input id="q-tax" inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} /></FormField>
            <FormField id="q-valid" label={t("quotations.validUntil")} hint={t("quotations.theOfferCannotBeAcceptedAfter")}><Input id="q-valid" type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></FormField>
            {mode.kind === "create" ? <FormField id="q-currency" label={t("quotations.currency")} hint={t("quotations.isoCodeEGEgpLeave")}><Input id="q-currency" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} /></FormField> : null}
            <FormField id="q-notes" label={t("common.notes")} className="sm:col-span-3"><Textarea id="q-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          </div>

          <dl className="ms-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-md bg-surface-muted p-3 text-sm" aria-label={t("quotations.totalsPreview")}>
            <dt className="text-muted-foreground">{t("quotations.subtotal")}</dt><dd className="text-end tabular-nums">{preview?.subtotal ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("quotations.discount")}</dt><dd className="text-end tabular-nums">{preview ? `− ${preview.discount}` : "—"}</dd>
            <dt className="text-muted-foreground">{t("quotations.tax2")}</dt><dd className="text-end tabular-nums">{preview?.tax ?? "—"}</dd>
            <dt className="font-semibold">{t("quotations.totalPreview")}</dt><dd className="text-end font-semibold tabular-nums">{preview?.total ?? "—"}</dd>
          </dl>
          <p className="text-xs text-muted-foreground">{t("quotations.previewOnlyTheServerCalculatesAnd")}</p>

          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={save.isPending}>{t("common.cancel")}</Button><Button type="submit" loading={save.isPending}>{mode.kind === "edit" ? t("quotations.saveDraft") : mode.kind === "version" ? t("quotations.createVersion") : t("quotations.createQuotation")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
