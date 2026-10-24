"use client";

import { ColorSwatch } from "@/components/data-display/color-swatch";
import { ErrorState, PageSkeleton } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accessoryOptions, choiceOptions, componentOptions, fabricOptions, patternOptions, printMethodOptions, productTypeOptions, type RefOption } from "./adapters";
import { useConfiguratorOptions } from "./hooks";
import { useI18n } from "@/i18n/provider";

function Dataset({ title, count, options, children }: { title: string; count: number; options?: RefOption<unknown>[]; children?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <Card data-testid={`dataset-${title}`}>
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="text-base font-semibold">{title}</span>
          <span className="rounded-sm bg-tone-neutral-bg px-1.5 text-xs font-medium tabular-nums text-tone-neutral-fg">{count}</span>
        </summary>
        <div className="border-t px-4 py-3">
          {count === 0 ? <p className="text-sm text-muted-foreground">{t("masterData.noOptionsReturnedByTheBackend")}</p> : children ?? (
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {options?.map((o) => (
                <li key={o.value} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{o.label}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{o.hint ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </Card>
  );
}

/** Inspector for GET /configurator/sample-options: exactly the datasets the future Sample form consumes. */
export function ConfiguratorPage() {
  const { t } = useI18n();
  const q = useConfiguratorOptions();
  if (q.isLoading) return <PageSkeleton />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const o = q.data;
  if (!o) return null;
  const colorCount = o.fabrics.reduce((n, f) => n + f.colors.length, 0);
  const sizeCount = o.sizeScales.reduce((n, s) => n + s.sizes.length, 0);
  return (
    <>
      <PageHeader title={t("masterData.configuratorOptions")} description={t("masterData.readOnlyViewOfTheExact")} />
      <div className="space-y-3">
        <Dataset title={t("masterData.productTypes")} count={o.productTypes.length} options={productTypeOptions(o)} />
        <Dataset title={t("masterData.fabrics")} count={o.fabrics.length} options={fabricOptions(o)} />
        <Dataset title={t("masterData.fabricColours")} count={colorCount}>
          <div className="space-y-3">
            {o.fabrics.filter((f) => f.colors.length > 0).map((f) => (
              <div key={f.id}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{f.name}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">{f.colors.map((c) => <ColorSwatch key={c.id} name={c.name} hex={c.hex} pantone={c.pantone} size="sm" />)}</div>
              </div>
            ))}
          </div>
        </Dataset>
        <Dataset title={t("masterData.sizeScales")} count={o.sizeScales.length}>
          <div className="space-y-2">
            {o.sizeScales.map((s) => (
              <div key={s.id}>
                <p className="text-sm font-medium">{s.name} <span className="font-mono text-xs font-normal text-muted-foreground">{s.code}</span> <span className="text-xs text-muted-foreground">{t("masterData.lengthSizesSizecountTotal", { length: s.sizes.length, sizeCount })}</span></p>
                <p className="text-sm text-muted-foreground">{s.sizes.map((z) => z.name).join(" · ")}</p>
              </div>
            ))}
          </div>
        </Dataset>
        <Dataset title={t("masterData.patternsApprovedVersions")} count={o.patterns.length} options={patternOptions(o)} />
        <Dataset title={t("masterData.printMethods")} count={o.printMethods.length} options={printMethodOptions(o)} />
        <Dataset title={t("masterData.accessories")} count={o.accessories.length} options={accessoryOptions(o)} />
        <Dataset title={t("masterData.labelsPackaging")} count={o.components.length} options={componentOptions(o)} />
        {([[t.text("Fit methods"), o.fitMethods], [t.text("Fabric providers"), o.fabricProviders], [t.text("Decoration sides"), o.decorationSides], [t.text("Measurement units"), o.measurementUnits]] as const).map(([title, rows]) => (
          <Dataset key={title} title={title} count={rows.length} options={choiceOptions(rows)} />
        ))}
        <Card>
          <CardHeader><CardTitle>{t("masterData.sampleTerms")}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {o.terms ? <>{t("masterData.termsAreReturnedV1", { v1: String(o.terms.code ?? "terms") })}{o.terms.version != null ? t("masterData.versionVersion", { version: String(o.terms.version) }) : ""}{t("masterData.theSampleFormMustShowAnd")}</> : t("masterData.noActiveTermsReturned")}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
