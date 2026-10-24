import { ColorSwatch } from "@/components/data-display/color-swatch";
import { InfoGrid, InfoItem } from "@/components/layout/detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { label } from "./labels";
import { FIT_METHOD_LABELS, PROVIDER_LABELS } from "./labels";
import type { SampleDetail } from "./types";

const text = (v: string | null) => (v ? <span className="whitespace-pre-wrap">{v}</span> : null);

/** Read-only specification. Custom values are labelled as custom; notes keep their separate backend fields. */
export function SpecificationView({ s }: { s: SampleDetail }) {
  const hasColor = s.fabricColor || s.customColorName || s.customHex || s.customPantone;
  return (
    <div className="space-y-4">
      <Card aria-labelledby="spec-core">
        <CardHeader><CardTitle><span id="spec-core">Specification</span></CardTitle></CardHeader>
        <CardContent>
          <InfoGrid>
            <InfoItem label="Product">{s.productType ? s.productType.name : s.customProductName ? <>{s.customProductName} <span className="text-xs text-muted-foreground">(custom)</span></> : null}</InfoItem>
            <InfoItem label="Fabric">{s.fabric ? s.fabric.name : s.customFabricName ? <>{s.customFabricName} <span className="text-xs text-muted-foreground">(custom)</span></> : null}</InfoItem>
            <InfoItem label="Fabric provider">{label(PROVIDER_LABELS, s.fabricProvider)}</InfoItem>
            <InfoItem label="Colour">
              {hasColor ? (
                s.fabricColor ? <ColorSwatch name={s.fabricColor.name} hex={s.fabricColor.hex} size="sm" /> : <ColorSwatch name={s.customColorName ?? "Custom colour"} hex={s.customHex} pantone={s.customPantone} code="custom" size="sm" />
              ) : null}
            </InfoItem>
            <InfoItem label="GSM">{s.gsm != null ? String(s.gsm) : null}</InfoItem>
            <InfoItem label="Size">{s.sampleSize ? `${s.sampleSize.name}${s.sampleSize.scaleCode ? ` (${s.sampleSize.scaleCode})` : ""}` : null}</InfoItem>
            <InfoItem label="Fit method">{FIT_METHOD_LABELS[s.fitMethod]?.label ?? s.fitMethod}</InfoItem>
            <InfoItem label="Pattern">{s.patternVersion ? `${s.patternVersion.patternName} · ${s.patternVersion.patternReference} · v${s.patternVersion.versionNumber} (${s.patternVersion.status.toLowerCase()})` : null}</InfoItem>
            <InfoItem label="Custom product description" className="sm:col-span-2 lg:col-span-3">{text(s.customProductDescription)}</InfoItem>
            <InfoItem label="Custom fabric description" className="sm:col-span-2 lg:col-span-3">{text(s.customFabricDescription)}</InfoItem>
          </InfoGrid>
        </CardContent>
      </Card>
      <Card aria-labelledby="spec-notes">
        <CardHeader><CardTitle><span id="spec-notes">Instructions</span></CardTitle></CardHeader>
        <CardContent>
          <InfoGrid className="sm:grid-cols-1 lg:grid-cols-2">
            <InfoItem label="Request notes">{text(s.notes)}</InfoItem>
            <InfoItem label="Fit notes">{text(s.fitNotes)}</InfoItem>
            <InfoItem label="Print notes">{text(s.printNotes)}</InfoItem>
            <InfoItem label="Fabric notes">{text(s.fabricNotes)}</InfoItem>
            <InfoItem label="Special instructions">{text(s.specialInstructions)}</InfoItem>
            <InfoItem label="Factory instructions (internal — never customer-facing)">{text(s.factoryInstructions)}</InfoItem>
          </InfoGrid>
        </CardContent>
      </Card>
    </div>
  );
}
