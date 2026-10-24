/** Step order and customer-facing copy for the sample request wizard. Order and keys are the existing contract. */
export const STEPS = [
  { key: "brand", title: "Brand" }, { key: "product", title: "Product" }, { key: "fabric", title: "Fabric & colour" }, { key: "size", title: "Size & fit" }, { key: "decoration", title: "Decoration" },
  { key: "extras", title: "Accessories & labels" }, { key: "files", title: "Artwork & files" }, { key: "notes", title: "Notes" }, { key: "review", title: "Review & submit" },
] as const;
export type StepKey = (typeof STEPS)[number]["key"];

/** What we ask, and why we ask it. */
export const STEP_COPY: Record<StepKey, { help: string; why: string }> = {
  brand: { help: "Which of your brands is this sample for?", why: "Your sample and its quotation are filed under this brand." },
  product: { help: "What would you like to make? Choose from our catalogue, or describe something different.", why: "Fabric, size and decoration all depend on the product." },
  fabric: { help: "Tell us what it should be made of, and in which colour.", why: "Fabric and colour decide how the garment looks and feels." },
  size: { help: "Which size should we make for the sample, and how should it fit?", why: "We cut your sample in this size, following the fit you choose." },
  decoration: { help: "Add each place where something should be printed or embroidered. Skip this if your product is plain.", why: "Each decoration is made to the placement you describe." },
  extras: { help: "Add anything that comes with the garment: zips, buttons, labels, hang tags, packaging. Optional.", why: "These details finish the garment and how it arrives." },
  files: { help: "Upload artwork, reference photos or a size chart. Files are private to you and Benue Print.", why: "Artwork and references let us match what you have in mind." },
  notes: { help: "Anything else we should know? Optional.", why: "Notes catch what the earlier steps could not." },
  review: { help: "Check everything, accept the terms, then send your request to Benue Print.", why: "Nothing is sent until you submit." },
};
