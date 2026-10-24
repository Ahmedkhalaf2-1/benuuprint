"use client";

import { ColorSwatch } from "@/components/data-display/color-swatch";
import { ErrorState, PageSkeleton } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accessoryOptions, choiceOptions, componentOptions, fabricOptions, patternOptions, printMethodOptions, productTypeOptions, type RefOption } from "./adapters";
import { useConfiguratorOptions } from "./hooks";

function Dataset({ title, count, options, children }: { title: string; count: number; options?: RefOption<unknown>[]; children?: React.ReactNode }) {
  return (
    <Card data-testid={`dataset-${title}`}>
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="text-base font-semibold">{title}</span>
          <span className="rounded-sm bg-tone-neutral-bg px-1.5 text-xs font-medium tabular-nums text-tone-neutral-fg">{count}</span>
        </summary>
        <div className="border-t px-4 py-3">
          {count === 0 ? <p className="text-sm text-muted-foreground">No options returned by the backend.</p> : children ?? (
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
  const q = useConfiguratorOptions();
  if (q.isLoading) return <PageSkeleton />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const o = q.data;
  if (!o) return null;
  const colorCount = o.fabrics.reduce((n, f) => n + f.colors.length, 0);
  const sizeCount = o.sizeScales.reduce((n, s) => n + s.sizes.length, 0);
  return (
    <>
      <PageHeader title="Configurator options" description="Read-only view of the exact option sets the sample form will use. Nothing here is hardcoded in the frontend." />
      <div className="space-y-3">
        <Dataset title="Product types" count={o.productTypes.length} options={productTypeOptions(o)} />
        <Dataset title="Fabrics" count={o.fabrics.length} options={fabricOptions(o)} />
        <Dataset title="Fabric colours" count={colorCount}>
          <div className="space-y-3">
            {o.fabrics.filter((f) => f.colors.length > 0).map((f) => (
              <div key={f.id}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{f.name}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">{f.colors.map((c) => <ColorSwatch key={c.id} name={c.name} hex={c.hex} pantone={c.pantone} size="sm" />)}</div>
              </div>
            ))}
          </div>
        </Dataset>
        <Dataset title="Size scales" count={o.sizeScales.length}>
          <div className="space-y-2">
            {o.sizeScales.map((s) => (
              <div key={s.id}>
                <p className="text-sm font-medium">{s.name} <span className="font-mono text-xs font-normal text-muted-foreground">{s.code}</span> <span className="text-xs text-muted-foreground">· {s.sizes.length} sizes ({sizeCount} total)</span></p>
                <p className="text-sm text-muted-foreground">{s.sizes.map((z) => z.name).join(" · ")}</p>
              </div>
            ))}
          </div>
        </Dataset>
        <Dataset title="Patterns (approved versions)" count={o.patterns.length} options={patternOptions(o)} />
        <Dataset title="Print methods" count={o.printMethods.length} options={printMethodOptions(o)} />
        <Dataset title="Accessories" count={o.accessories.length} options={accessoryOptions(o)} />
        <Dataset title="Labels & packaging" count={o.components.length} options={componentOptions(o)} />
        {([["Fit methods", o.fitMethods], ["Fabric providers", o.fabricProviders], ["Decoration sides", o.decorationSides], ["Measurement units", o.measurementUnits]] as const).map(([title, rows]) => (
          <Dataset key={title} title={title} count={rows.length} options={choiceOptions(rows)} />
        ))}
        <Card>
          <CardHeader><CardTitle>Sample terms</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {o.terms ? <>Terms are returned ({String(o.terms.code ?? "terms")}{o.terms.version != null ? `, version ${String(o.terms.version)}` : ""}). The sample form must show and record acceptance in a later phase.</> : "No active terms returned."}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
