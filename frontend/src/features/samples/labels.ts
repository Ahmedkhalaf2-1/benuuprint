import { humanizeCode } from "@/lib/utils/format";

export const FIT_METHOD_LABELS: Record<string, { label: string; description: string }> = {
  BENUE_PATTERN: { label: "Benue Print pattern", description: "Cut from one of our approved patterns." },
  COPY_CUSTOMER_PIECE: { label: "Copy customer's piece", description: "The customer provides a garment to copy." },
  CUSTOM_SIZE_CHART: { label: "Custom size chart", description: "Made to the customer's size chart (file required to submit)." },
  NOT_SURE: { label: "Not sure yet", description: "To be decided during review." },
};

export const PROVIDER_LABELS: Record<string, string> = {
  CUSTOMER: "Customer supplies the fabric",
  BENUE_PRINT: "Benue Print sources the fabric",
  NOT_DECIDED: "Not decided yet",
};

export const SIDE_LABELS: Record<string, string> = { FRONT: "Front", BACK: "Back", LEFT_SLEEVE: "Left sleeve", RIGHT_SLEEVE: "Right sleeve", OTHER: "Other" };

export const PURPOSE_LABELS: Record<string, string> = {
  FRONT_PRINT: "Front print", BACK_PRINT: "Back print", EMBROIDERY: "Embroidery", LABEL: "Label", PACKAGING: "Packaging", GENERAL_REFERENCE: "General reference", OTHER: "Other",
};

export const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  REFERENCE: "Reference", MOCKUP: "Mockup", SIZE_CHART: "Size chart", ARTWORK: "Artwork", OTHER: "Other",
};

export const APPROVAL_TYPE_LABELS: Record<string, string> = {
  QUOTATION: "Quotation", ARTWORK: "Artwork", SAMPLE: "Physical sample", PRODUCTION_SPEC: "Production specification",
};

export const APPROVAL_MODE_LABELS: Record<string, string> = {
  CUSTOMER_AUTHENTICATED: "Customer (authenticated)",
  STAFF_RECORDED_ON_BEHALF: "Recorded by staff on behalf of the customer",
  STAFF_INTERNAL: "Internal staff decision",
};

export const SPEC_KIND_LABELS: Record<string, { label: string; description: string }> = {
  PRE_PRODUCTION: { label: "Pre-production", description: "Frozen to manufacture the physical sample." },
  APPROVED_REFERENCE: { label: "Approved reference", description: "Final approved baseline for bulk production." },
};

export const label = (map: Record<string, string>, key: string | null | undefined) => (key ? (map[key] ?? humanizeCode(key)) : "");

export function productLabel(s: { productType: { name: string } | null; customProductName: string | null }) {
  return s.productType?.name ?? (s.customProductName ? `${s.customProductName} (custom)` : null);
}
