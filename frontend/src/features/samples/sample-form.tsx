"use client";

import { zodResolver } from "@/lib/forms/resolver";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ColorSwatch } from "@/components/data-display/color-swatch";
import { ChoiceGroup } from "@/components/forms/choice-group";
import { FormError, FormField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useCustomerBrands } from "@/features/brands/hooks";
import { CustomerPicker, type PickedCustomer } from "@/features/customers/customer-picker";
import { fabricsForProduct, patternOptions } from "@/features/master-data/adapters";
import { useConfiguratorOptions } from "@/features/master-data/hooks";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { applyApiErrors } from "@/lib/forms/api-errors";
import { cn } from "@/lib/utils/cn";
import { AccessoriesEditor } from "./accessories-editor";
import { ActionDialog } from "./action-dialogs";
import { ACTION_META } from "./actions";
import * as api from "./api";
import { ArtworkPanel } from "./artwork-panel";
import { DecorationsEditor } from "./decorations-editor";
import { useSampleInvalidation } from "./hooks";
import { FIT_METHOD_LABELS, PROVIDER_LABELS } from "./labels";
import { ProblemsSummary } from "./problems-summary";
import { SampleFiles } from "./sample-files";
import { SAMPLE_FIELDS, buildSamplePayload, emptySampleValues, sampleSchema, toFormValues, type SampleFormValues } from "./schema";
import { TermsPanel } from "./terms-panel";
import { FABRIC_PROVIDERS, FIT_METHODS, type SampleDetail } from "./types";
import { useI18n } from "@/i18n/provider";

const SECTIONS = [
  ["sec-customer", "Customer & brand"], ["sec-product", "Product"], ["sec-fabric", "Fabric & colour"], ["sec-size", "Size & fit"],
  ["sec-decoration", "Decoration"], ["sec-accessories", "Accessories & packaging"], ["sec-instructions", "Instructions"], ["sec-files", "Files & artwork"], ["sec-terms", "Terms"],
] as const;

function Section({ id, title, children, description }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card id={id} aria-labelledby={`${id}-t`} className="scroll-mt-20">
      <CardHeader><CardTitle><span id={`${id}-t`}>{title}</span></CardTitle></CardHeader>
      <CardContent className="space-y-4">{description ? <p className="-mt-1 text-sm text-muted-foreground">{description}</p> : null}{children}</CardContent>
    </Card>
  );
}

const NONE = "__none";

/**
 * Create / edit a DRAFT sample. Parts that are separate API objects (decorations, accessories, files, artwork, terms) become
 * available once the draft exists: on the create page they are explained, after "Save draft" the editor reopens with them.
 */
export function SampleForm({ sample, initialCustomer }: { sample?: SampleDetail; initialCustomer?: PickedCustomer | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const { can } = useAuth();
  const inv = useSampleInvalidation();
  const config = useConfiguratorOptions();
  const [customer, setCustomer] = useState<PickedCustomer | null>(sample ? { id: sample.customer.id, customerNumber: sample.customer.customerNumber, displayName: sample.customer.displayName } : initialCustomer ?? null);
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null);
  const [problems, setProblems] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SampleFormValues>({ resolver: zodResolver(sampleSchema), defaultValues: sample ? toFormValues(sample) : { ...emptySampleValues, customerId: initialCustomer?.id ?? "" } });
  const { register, control, handleSubmit, setValue, setError, reset, formState: { errors, isDirty, isSubmitting } } = form;
  const v = useWatch({ control });
  const brands = useCustomerBrands(customer?.id, { pageSize: 100 });
  const { dialog: guardDialog } = useUnsavedGuard(isDirty);

  const options = config.data;
  const fabrics = useMemo(() => (v.productMode === "catalogue" && v.productTypeId ? fabricsForProduct(options, v.productTypeId) : fabricsForProduct(options, "")), [options, v.productMode, v.productTypeId]);
  const selectedFabric = v.fabricMode === "catalogue" ? options?.fabrics.find((f) => f.id === v.fabricId) : undefined;
  const patterns = patternOptions(options, v.productMode === "catalogue" && v.productTypeId ? v.productTypeId : undefined);
  const sizes = useMemo(() => (options?.sizeScales ?? []).flatMap((sc) => sc.sizes.map((z) => ({ value: z.id, label: options!.sizeScales.length > 1 ? `${sc.name} · ${z.name}` : z.name }))), [options]);

  const create = useMutation({ mutationFn: (body: api.SampleBody) => api.createSample(body), onSuccess: () => { void inv.lists(); } });
  const update = useMutation({ mutationFn: (body: api.SampleBody) => api.updateSample(sample!.id, body), onSuccess: (s) => { void inv.detail(s.id); void inv.lists(); } });

  // brand of another customer is invalid: reset when the customer changes
  useEffect(() => { if (!sample && customer && v.customerId !== customer.id) { setValue("customerId", customer.id, { shouldDirty: true }); setValue("brandId", ""); } }, [customer, sample, v.customerId, setValue]);

  /** Saves the draft; returns the saved sample (or null when validation / the API rejected it). */
  const save = async (): Promise<SampleDetail | null> => {
    setFormError(null);
    let saved: SampleDetail | null = null;
    await handleSubmit(async (values) => {
      try {
        if (sample) {
          saved = await update.mutateAsync(buildSamplePayload(values, "update", { includeBrand: values.brandId !== sample.brand.id }));
          reset(toFormValues(saved));
          toast.success(t("samples.draftSaved"));
        } else {
          saved = await create.mutateAsync(buildSamplePayload(values, "create"));
          reset(values); // clears dirty so the guard lets us navigate
          toast.success(t("samples.samplenumberCreatedAsADraft", { sampleNumber: saved.sampleNumber }));
        }
      } catch (e) {
        const m = applyApiErrors(e, setError, SAMPLE_FIELDS);
        if (m.formMessage) setFormError({ message: m.formMessage, requestId: m.requestId });
      }
    }, () => setFormError({ message: t("samples.someFieldsNeedAttention") }))();
    return saved;
  };

  const onSaveDraft = async () => {
    const saved = await save();
    if (saved && !sample) router.push(`/samples/${saved.id}/edit`);
  };
  const [submitFor, setSubmitFor] = useState<SampleDetail | null>(null);
  const onSubmitClick = async () => {
    if (!sample) return;
    setProblems(null);
    setSubmitting(true);
    const saved = isDirty ? await save() : sample;
    setSubmitting(false);
    if (saved) setSubmitFor(saved);
  };

  const fieldErr = (k: keyof SampleFormValues) => errors[k]?.message as string | undefined;
  const a11y = (k: keyof SampleFormValues) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });
  const editable = !!sample && sample.status === "DRAFT";
  const colorList = selectedFabric?.colors ?? [];

  if (config.isLoading) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
      <nav aria-label={t("samples.formSections")} className="mb-4 overflow-x-auto lg:sticky lg:top-20 lg:mb-0 lg:self-start">
        <ul className="flex gap-2 lg:flex-col lg:gap-0.5">
          {SECTIONS.map(([id, title]) => (
            <li key={id} className="shrink-0"><a href={`#${id}`} className="block whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground">{t.text(title)}</a></li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-4 pb-24">
        {problems ? <ProblemsSummary messages={problems} /> : null}
        {formError ? <FormError {...formError} /> : null}

        <form id="sample-form" onSubmit={(e) => { e.preventDefault(); void onSaveDraft(); }} noValidate aria-label={sample ? t("samples.editSampleDraft") : t("samples.newSample")} className="space-y-4">
          <Section id="sec-customer" title={t("samples.customerBrand")}>
            <FormField id="customer" label={t("common.customer")} required error={fieldErr("customerId")} hint={sample ? t("samples.theCustomerOfASampleCannot") : undefined}>
              {sample ? <p className="flex h-9 items-center text-sm"><Link href={`/customers/${sample.customer.id}`} className="hover:text-brand hover:underline">{sample.customer.customerNumber} · {sample.customer.displayName}</Link></p> : <CustomerPicker id="customer" value={customer} onChange={(c) => setCustomer(c)} invalid={!!errors.customerId} />}
            </FormField>
            <FormField id="brandId" label={t("common.brand2")} required error={fieldErr("brandId")} hint={!customer ? t("samples.chooseACustomerFirst") : undefined}>
              <Select id="brandId" value={v.brandId ?? ""} onValueChange={(x) => setValue("brandId", x, { shouldDirty: true })} disabled={!customer || (!!sample && !editable)} placeholder={brands.isLoading ? t("samples.loadingBrands") : customer ? t("samples.chooseABrand") : "—"} options={(brands.data?.data ?? []).filter((b) => b.status !== "ARCHIVED").map((b) => ({ value: b.id, label: `${b.name} · ${b.brandNumber}` }))} />
              {customer && brands.data && brands.data.data.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">{t("samples.thisCustomerHasNoBrands")}{" "}<Link className="text-brand hover:underline" href={`/brands/new?customerId=${customer.id}`}>{t("samples.addOne")}</Link>{" "}{t("samples.first")}</p> : null}
            </FormField>
          </Section>

          <Section id="sec-product" title={t("common.product")} description={t("samples.pickACatalogueProductOrDescribe")}>
            <ChoiceGroup name="productMode" aria-label={t("samples.productSource")} value={v.productMode ?? "catalogue"} onValueChange={(m) => setValue("productMode", m, { shouldDirty: true })} options={[{ value: "catalogue", label: t("samples.catalogueProduct") }, { value: "custom", label: t("samples.customProduct"), description: t("samples.notInTheCatalogue") }]} />
            {v.productMode === "catalogue" ? (
              <FormField id="productTypeId" label={t("common.productType")}><Select id="productTypeId" value={v.productTypeId || NONE} onValueChange={(x) => setValue("productTypeId", x === NONE ? "" : x, { shouldDirty: true })} options={[{ value: NONE, label: t("samples.notChosenYet") }, ...(options?.productTypes ?? []).map((p) => ({ value: p.id, label: p.name }))]} /></FormField>
            ) : (
              <>
                <FormField id="customProductName" label={t("samples.customProductName")} error={fieldErr("customProductName")}><Input id="customProductName" {...a11y("customProductName")} {...register("customProductName")} /></FormField>
                <FormField id="customProductDescription" label={t("common.description")} error={fieldErr("customProductDescription")}><Textarea id="customProductDescription" rows={3} {...register("customProductDescription")} /></FormField>
              </>
            )}
          </Section>

          <Section id="sec-fabric" title={t("samples.fabricColour")}>
            <ChoiceGroup name="fabricMode" aria-label={t("samples.fabricSource")} value={v.fabricMode ?? "catalogue"} onValueChange={(m) => { setValue("fabricMode", m, { shouldDirty: true }); setValue("fabricColorId", ""); if (m === "custom") setValue("colorMode", "custom"); }} options={[{ value: "catalogue", label: t("samples.catalogueFabric") }, { value: "custom", label: t("samples.customFabric"), description: t("samples.notInTheCatalogue") }]} />
            {v.fabricMode === "catalogue" ? (
              <FormField id="fabricId" label={t("samples.fabric")} hint={v.productTypeId && v.productMode === "catalogue" ? t("samples.fabricsRecommendedForThisProductAre") : undefined}>
                <Select id="fabricId" value={v.fabricId || NONE} onValueChange={(x) => { setValue("fabricId", x === NONE ? "" : x, { shouldDirty: true }); setValue("fabricColorId", ""); }} options={[{ value: NONE, label: t("samples.notChosenYet") }, ...fabrics.map((f) => ({ value: f.value, label: `${f.label}${f.recommended ? " · Recommended" : ""}${f.allowed ? "" : " · not advised"}` }))]} />
              </FormField>
            ) : (
              <>
                <FormField id="customFabricName" label={t("samples.customFabricName")} error={fieldErr("customFabricName")}><Input id="customFabricName" {...a11y("customFabricName")} {...register("customFabricName")} /></FormField>
                <FormField id="customFabricDescription" label={t("common.description")} error={fieldErr("customFabricDescription")}><Textarea id="customFabricDescription" rows={2} {...register("customFabricDescription")} /></FormField>
              </>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="fabricProvider" label={t("samples.whoProvidesTheFabric")}><Select id="fabricProvider" value={v.fabricProvider ?? "NOT_DECIDED"} onValueChange={(x) => setValue("fabricProvider", x as SampleFormValues["fabricProvider"], { shouldDirty: true })} options={FABRIC_PROVIDERS.map((p) => ({ value: p, label: PROVIDER_LABELS[p] ?? p }))} /></FormField>
              <FormField id="gsm" label="GSM" error={fieldErr("gsm")} hint={selectedFabric && (selectedFabric.minGsm != null || selectedFabric.maxGsm != null) ? t("samples.thisFabricV1V2V3The", { v1: selectedFabric.minGsm ?? "?", v2: selectedFabric.maxGsm ?? "?", v3: selectedFabric.defaultGsm != null ? ` (default ${selectedFabric.defaultGsm})` : "" }) : undefined}>
                <Input id="gsm" inputMode="numeric" {...a11y("gsm")} {...register("gsm")} />
              </FormField>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-[0.8125rem] font-medium">{t("samples.colour")}</legend>
              {v.fabricMode === "catalogue" ? <ChoiceGroup name="colorMode" aria-label={t("samples.colourSource")} value={v.colorMode ?? "catalogue"} onValueChange={(m) => setValue("colorMode", m, { shouldDirty: true })} options={[{ value: "catalogue", label: t("samples.fabricColour2") }, { value: "custom", label: t("samples.customColour"), description: t("samples.namePantoneAndOrHex") }]} /> : <p className="text-xs text-muted-foreground">{t("samples.aCustomFabricUsesACustom")}</p>}
              {v.fabricMode === "catalogue" && v.colorMode === "catalogue" ? (
                !selectedFabric ? <p className="text-sm text-muted-foreground">{t("samples.chooseAFabricToSeeIts")}</p> : colorList.length === 0 ? <p className="text-sm text-muted-foreground">{t("samples.thisFabricHasNoCatalogueColours")}</p> : (
                  <div role="radiogroup" aria-label={t("samples.fabricColours")} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {colorList.map((c) => (
                      <button key={c.id} type="button" role="radio" aria-checked={v.fabricColorId === c.id} onClick={() => setValue("fabricColorId", c.id, { shouldDirty: true })} className={cn("rounded-md border bg-surface p-2.5 text-start hover:bg-surface-muted", v.fabricColorId === c.id && "border-brand bg-brand-soft/40")}>
                        <ColorSwatch name={c.name} hex={c.hex} pantone={c.pantone} />
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField id="customColorName" label={t("samples.colourName")} error={fieldErr("customColorName")}><Input id="customColorName" {...a11y("customColorName")} {...register("customColorName")} /></FormField>
                  <FormField id="customPantone" label={t("samples.pantone")} error={fieldErr("customPantone")}><Input id="customPantone" {...a11y("customPantone")} {...register("customPantone")} /></FormField>
                  <FormField id="customHex" label={t("samples.hex")} error={fieldErr("customHex")} hint="#RRGGBB">
                    <div className="flex items-center gap-2"><ColorSwatch name="Preview" hex={v.customHex} size="md" showLabel={false} /><Input id="customHex" placeholder="#1A2B3C" {...a11y("customHex")} {...register("customHex")} /></div>
                  </FormField>
                </div>
              )}
            </fieldset>
          </Section>

          <Section id="sec-size" title={t("samples.sizeFit")}>
            <FormField id="sampleSizeOptionId" label={t("samples.sampleSize")}><Select id="sampleSizeOptionId" value={v.sampleSizeOptionId || NONE} onValueChange={(x) => setValue("sampleSizeOptionId", x === NONE ? "" : x, { shouldDirty: true })} options={[{ value: NONE, label: t("samples.notChosenYet") }, ...sizes]} /></FormField>
            <ChoiceGroup name="fitMethod" aria-label={t("samples.fitMethod")} columns={4} value={v.fitMethod ?? "NOT_SURE"} onValueChange={(m) => { setValue("fitMethod", m, { shouldDirty: true }); if (m !== "BENUE_PATTERN") setValue("patternVersionId", ""); }} options={FIT_METHODS.map((m) => ({ value: m, label: FIT_METHOD_LABELS[m]!.label, description: FIT_METHOD_LABELS[m]!.description }))} />
            {v.fitMethod === "BENUE_PATTERN" ? (
              <FormField id="patternVersionId" label={t("samples.approvedPattern")} hint={t("samples.theSamplePinsThisApprovedPattern")} error={fieldErr("patternVersionId")}>
                <Select id="patternVersionId" value={v.patternVersionId || NONE} onValueChange={(x) => setValue("patternVersionId", x === NONE ? "" : x, { shouldDirty: true })} options={[{ value: NONE, label: t("samples.notChosenYet") }, ...patterns.map((p) => ({ value: p.value, label: `${p.label} · ${p.hint}` }))]} />
                {patterns.length === 0 ? <p className="mt-1 text-xs text-tone-warning-fg">{t("samples.noApprovedPatternsAreAvailable")}{v.productTypeId ? t("samples.forThisProductType") : ""}.</p> : null}
              </FormField>
            ) : null}
            {v.fitMethod === "COPY_CUSTOMER_PIECE" ? <p className="text-sm text-muted-foreground">{t("samples.describeThePieceToCopyIn")}{" "}<a className="text-brand hover:underline" href="#sec-files">{t("samples.files")}</a>.</p> : null}
            {v.fitMethod === "CUSTOM_SIZE_CHART" ? <p className="text-sm text-muted-foreground">A <strong>{t("samples.sizeChart")}</strong>{" "}{t("samples.fileMustBeAttachedIn")}{" "}<a className="text-brand hover:underline" href="#sec-files">{t("samples.files")}</a>{" "}{t("samples.beforeSubmission")}</p> : null}
          </Section>

          {/* Instructions live in the main form (saved with the draft) but are placed after the part editors below. */}
        </form>

        {sample ? (
          <>
            <DecorationsEditor sample={sample} editable={editable} />
            <AccessoriesEditor sample={sample} editable={editable} />
          </>
        ) : (
          <Card id="sec-decoration" className="scroll-mt-20"><CardContent className="py-6 text-sm text-muted-foreground"><p className="font-medium text-foreground">{t("samples.decorationAccessoriesFilesArtworkAndTerms")}</p><p className="mt-1">{t("samples.theseAreAddedToTheDraft")}{" "}<strong>{t("samples.saveDraft")}</strong>{" "}{t("samples.andTheEditorReopensWithAll")}</p></CardContent></Card>
        )}

        <Section id="sec-instructions" title={t("samples.instructions")} description={t("samples.eachNoteKeepsItsOwnField")}>
          <form id="sample-notes" onSubmit={(e) => e.preventDefault()} className="grid gap-4 lg:grid-cols-2">
            <FormField id="notes" label={t("samples.requestNotes")} error={fieldErr("notes")}><Textarea id="notes" rows={3} {...register("notes")} /></FormField>
            <FormField id="fitNotes" label={t("samples.fitNotes")} error={fieldErr("fitNotes")}><Textarea id="fitNotes" rows={3} {...register("fitNotes")} /></FormField>
            <FormField id="printNotes" label={t("samples.printNotes")} error={fieldErr("printNotes")}><Textarea id="printNotes" rows={3} {...register("printNotes")} /></FormField>
            <FormField id="fabricNotes" label={t("samples.fabricNotes")} error={fieldErr("fabricNotes")}><Textarea id="fabricNotes" rows={3} {...register("fabricNotes")} /></FormField>
            <FormField id="specialInstructions" label={t("samples.specialInstructions")} error={fieldErr("specialInstructions")}><Textarea id="specialInstructions" rows={3} {...register("specialInstructions")} /></FormField>
            <FormField id="factoryInstructions" label={t("samples.factoryInstructionsInternal")} error={fieldErr("factoryInstructions")}><Textarea id="factoryInstructions" rows={3} {...register("factoryInstructions")} /></FormField>
          </form>
        </Section>

        {sample ? (
          <>
            <div className="space-y-4">
              <SampleFiles sample={sample} editable={editable} canUpload={can("assets.manage")} />
              <ArtworkPanel sample={sample} canEdit={editable && can("assets.manage")} canRequestApproval={can("approvals.manage")} />
            </div>
            <TermsPanel sample={sample} canRecord={editable && can("samples.manage")} />
          </>
        ) : null}
      </div>

      {/* Sticky action bar: stays below the content (pb-24 above) so it never hides fields, also on mobile. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:ps-[calc(var(--sidebar-width)+1.5rem)]" role="region" aria-label={t("samples.formActions")}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2">
          <span className="me-auto text-xs text-muted-foreground" aria-live="polite">{isDirty ? t("samples.unsavedChanges") : sample ? t("samples.allChangesSaved") : ""}</span>
          <Button variant="secondary" asChild><Link href={sample ? `/samples/${sample.id}` : "/samples"}>{t("common.cancel")}</Link></Button>
          <Button type="button" variant="secondary" loading={isSubmitting || create.isPending || update.isPending} onClick={() => void onSaveDraft()}>{t("samples.saveDraft")}</Button>
          {sample && can("samples.submit") ? <Button type="button" loading={submitting} onClick={() => void onSubmitClick()}>{t("samples.submitSample")}</Button> : null}
        </div>
      </div>

      {submitFor ? (
        <ActionDialog
          sample={submitFor}
          meta={ACTION_META.submit!}
          onClose={() => setSubmitFor(null)}
          onDone={(updated) => router.push(`/samples/${updated.id}`)}
          onProblems={(m) => { setProblems(m); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      ) : null}
      {guardDialog}
    </div>
  );
}
