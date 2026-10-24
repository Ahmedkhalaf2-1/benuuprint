
import { localizedMap } from "@/i18n/active";/** Customer-friendly wording for backend enum values (the stored value is always the backend's). */
export const FIT_LABELS: Record<string, { label: string; help: string }> = localizedMap({
  BENUE_PATTERN: { label: "Use a Benuu Print pattern", help: "We cut it from one of our approved patterns." },
  COPY_CUSTOMER_PIECE: { label: "Copy an existing garment", help: "You send us a garment and we copy it." },
  CUSTOM_SIZE_CHART: { label: "I have a size chart", help: "Upload your size chart in the Files step." },
  NOT_SURE: { label: "I'm not sure yet", help: "We will help you decide during review." },
});
export const PROVIDER_LABELS: Record<string, { label: string; help: string }> = localizedMap({
  BENUE_PRINT: { label: "Benuu Print will supply the fabric", help: "We source it for you." },
  CUSTOMER: { label: "I will supply the fabric", help: "You send the fabric to us." },
  NOT_DECIDED: { label: "Not decided yet", help: "We can talk it through during review." },
});
export const SIDE_LABELS: Record<string, string> = localizedMap({ FRONT: "Front", BACK: "Back", LEFT_SLEEVE: "Left sleeve", RIGHT_SLEEVE: "Right sleeve", OTHER: "Somewhere else" });
export const UNIT_LABELS: Record<string, string> = { CM: "cm", MM: "mm", IN: "in" };
/** `text` localises the English label (pass `t.text`). Stored enum values are never translated. */
export const fitLabel = (v: string | null, text: (s: string) => string = (s) => s) => (v ? text(FIT_LABELS[v]?.label ?? v) : null);
export const providerLabel = (v: string | null, text: (s: string) => string = (s) => s) => (v ? text(PROVIDER_LABELS[v]?.label ?? v) : null);
