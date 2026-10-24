"use client";

import { Construction } from "lucide-react";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";

/** Placeholder for modules scheduled for later frontend phases. Shows no fake data. */
export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState icon={<Construction />} title={t("common.comingInALaterPhase")} description={t("common.thisModuleIsPartOfThe")} className="py-16" />
      </Card>
    </>
  );
}
