"use client";

import { ColorSwatch } from "@/components/data-display/color-swatch";
import { InfoGrid, InfoItem } from "@/components/layout/detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { label } from "./labels";
import { FIT_METHOD_LABELS, PROVIDER_LABELS } from "./labels";
import type { SampleDetail } from "./types";
import { useI18n } from "@/i18n/provider";

const text = (v: string | null) => (v ? <span className="whitespace-pre-wrap">{v}</span> : null);

/** Read-only specification. Custom values are labelled as custom; notes keep their separate backend fields. */
export function SpecificationView({ s }: { s: SampleDetail }) {
  const { t } = useI18n();
  const hasColor = s.fabricColor || s.customColorName || s.customHex || s.customPantone;
  return (
    <div className="space-y-4">
      <Card aria-labelledby="spec-core">
        <CardHeader><CardTitle><span id="spec-core">{t("samples.specification")}</span></CardTitle></CardHeader>
        <CardContent>
          <InfoGrid>
            <InfoItem label={t("samples.product")}>{s.productType ? s.productType.name : s.customProductName ? <>{s.customProductName} <span className="text-xs text-muted-foreground">{t("samples.custom2")}</span></> : null}</InfoItem>
            <InfoItem label={t("samples.fabric")}>{s.fabric ? s.fabric.name : s.customFabricName ? <>{s.customFabricName} <span className="text-xs text-muted-foreground">{t("samples.custom2")}</span></> : null}</InfoItem>
            <InfoItem label={t("samples.fabricProvider")}>{label(PROVIDER_LABELS, s.fabricProvider)}</InfoItem>
            <InfoItem label={t("samples.colour")}>
              {hasColor ? (
                s.fabricColor ? <ColorSwatch name={s.fabricColor.name} hex={s.fabricColor.hex} size="sm" /> : <ColorSwatch name={s.customColorName ?? "Custom colour"} hex={s.customHex} pantone={s.customPantone} code="custom" size="sm" />
              ) : null}
            </InfoItem>
            <InfoItem label="GSM">{s.gsm != null ? String(s.gsm) : null}</InfoItem>
            <InfoItem label={t("samples.size")}>{s.sampleSize ? `${s.sampleSize.name}${s.sampleSize.scaleCode ? ` (${s.sampleSize.scaleCode})` : ""}` : null}</InfoItem>
            <InfoItem label={t("samples.fitMethod")}>{FIT_METHOD_LABELS[s.fitMethod]?.label ?? s.fitMethod}</InfoItem>
            <InfoItem label={t("samples.pattern")}>{s.patternVersion ? `${s.patternVersion.patternName} · ${s.patternVersion.patternReference} · v${s.patternVersion.versionNumber} (${s.patternVersion.status.toLowerCase()})` : null}</InfoItem>
            <InfoItem label={t("samples.customProductDescription")} className="sm:col-span-2 lg:col-span-3">{text(s.customProductDescription)}</InfoItem>
            <InfoItem label={t("samples.customFabricDescription")} className="sm:col-span-2 lg:col-span-3">{text(s.customFabricDescription)}</InfoItem>
          </InfoGrid>
        </CardContent>
      </Card>
      <Card aria-labelledby="spec-notes">
        <CardHeader><CardTitle><span id="spec-notes">{t("samples.instructions")}</span></CardTitle></CardHeader>
        <CardContent>
          <InfoGrid className="sm:grid-cols-1 lg:grid-cols-2">
            <InfoItem label={t("samples.requestNotes")}>{text(s.notes)}</InfoItem>
            <InfoItem label={t("samples.fitNotes")}>{text(s.fitNotes)}</InfoItem>
            <InfoItem label={t("samples.printNotes")}>{text(s.printNotes)}</InfoItem>
            <InfoItem label={t("samples.fabricNotes")}>{text(s.fabricNotes)}</InfoItem>
            <InfoItem label={t("samples.specialInstructions")}>{text(s.specialInstructions)}</InfoItem>
            <InfoItem label={t("samples.factoryInstructionsInternalNeverCustomerFaci")}>{text(s.factoryInstructions)}</InfoItem>
          </InfoGrid>
        </CardContent>
      </Card>
    </div>
  );
}
