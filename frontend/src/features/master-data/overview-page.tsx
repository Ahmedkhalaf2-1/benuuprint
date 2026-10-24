"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccessories, useComponentOptions, useFabrics, usePatterns, usePrintMethods, useProductTypes, useSizeScales } from "./hooks";
import { ADMIN_MANAGED } from "./reference-list-page";
import type { UseQueryResult } from "@tanstack/react-query";
import type { Paginated } from "@/types/api";
import { useI18n } from "@/i18n/provider";

/** Counts come from `meta.total` of a 1-row page of the real list endpoint (archived rows excluded by the backend). */
function CountCard({ title, href, query, hint }: { title: string; href: string; query: UseQueryResult<Paginated<unknown>>; hint?: string }) {
  const { t } = useI18n();
  return (
    <Link href={href} className="group block rounded-lg focus-visible:outline-offset-2">
      <Card className="h-full p-4 transition-colors group-hover:border-brand/60">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{title}</span><ArrowRight aria-hidden className="size-4 opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" />
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums leading-none">
          {query.isLoading ? <Skeleton className="h-6 w-10" /> : query.error ? <span className="text-sm font-normal text-muted-foreground">{t("masterData.unavailable")}</span> : query.data?.meta.total}
        </div>
        {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      </Card>
    </Link>
  );
}

const one = { pageSize: 1 };

export function MasterDataOverviewPage(): ReactNode {
  const { t } = useI18n();
  const products = useProductTypes(one);
  const fabrics = useFabrics(one);
  const scales = useSizeScales(one);
  const methods = usePrintMethods(one);
  const accessories = useAccessories(one);
  const components = useComponentOptions(one);
  const patterns = usePatterns(one);
  return (
    <>
      <PageHeader title={t("masterData.masterData")} description={t("masterData.referenceDataUsedBySamplesAnd", { ADMIN_MANAGED })} />
      <section aria-label={t("masterData.masterDataSections")} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <CountCard title={t("masterData.productTypes")} href="/master-data/products" query={products} />
        <CountCard title={t("masterData.fabrics")} href="/master-data/fabrics" query={fabrics} />
        <CountCard title={t("masterData.sizeScales")} href="/master-data/sizes" query={scales} />
        <CountCard title={t("masterData.printMethods")} href="/master-data/print-methods" query={methods} />
        <CountCard title={t("masterData.accessories")} href="/master-data/accessories" query={accessories} />
        <CountCard title={t("masterData.labelsPackaging")} href="/master-data/components" query={components} />
        <CountCard title={t("masterData.patterns")} href="/master-data/patterns" query={patterns} hint={t("masterData.sampleFormsOnlyOfferPatternsWith")} />
        <Link href="/master-data/configurator" className="group block rounded-lg">
          <Card className="h-full p-4 transition-colors group-hover:border-brand/60">
            <div className="text-xs font-medium text-muted-foreground">{t("masterData.configuratorOptions")}</div>
            <p className="mt-2 text-sm">{t("masterData.inspectTheExactOptionSetsThe")}</p>
          </Card>
        </Link>
      </section>
      <p className="mt-4 text-xs text-muted-foreground">{t("masterData.countsExcludeArchivedRows")}</p>
    </>
  );
}
