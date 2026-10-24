import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChoiceGroup } from "@/components/forms/choice-group";
import { FilesStep, ProductStep } from "@/features/portal/steps";
import { ReviewSummary } from "@/features/portal/review";
import { STEPS } from "@/features/portal/wizard-config";
import { FileTile, StepNav, SummaryCard, garmentKindFor } from "@/features/portal/wizard-ui";
import type { SampleDetail } from "@/features/portal/types";
import { renderWithClient, sampleOptions } from "./helpers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/account/samples/s1/edit", useSearchParams: () => new URLSearchParams() }));

const sample = (over: Partial<SampleDetail> = {}): SampleDetail => ({
  id: "s1", sampleNumber: "SMP-000123", status: "DRAFT", statusLabel: "Draft", nextStep: "", editable: true, brand: { id: "b1", name: "Nile Core" }, productName: "Hoodie", fabricName: "Brushed Fleece", colorName: "Forest",
  submittedAt: null, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", revisionNumber: 1, productTypeId: "pt2", customProductName: null, customProductDescription: null, fabricId: "f1", customFabricName: null,
  customFabricDescription: null, fabricProvider: "BENUE_PRINT", gsm: 320, fabricColorId: "c2", customColorName: "Forest", customPantone: "19-5918", customHex: "#12453a", size: { id: "z3", name: "M" }, fitMethod: "BENUE_PATTERN",
  pattern: { patternVersionId: "pv1", name: "Boxy Hoodie", fitType: "Oversized" }, notes: "Launch drop", fitNotes: "Longer body", printNotes: "Matte inks", fabricNotes: "Soft hand", specialInstructions: "Polybag each",
  decorations: [{ id: "d1", printMethod: { id: "pm1", name: "Embroidery" }, placement: "Left chest", side: "FRONT", width: "9", height: "9", unit: "CM", colorCount: 2, notes: "Tone on tone", artworkRequired: true, artwork: { id: "a1", name: "logo-mark.pdf", versionCount: 1 } }],
  accessories: [{ id: "ac1", accessory: { id: "a1", name: "Metal zip" }, customName: null, quantity: 2, notes: null }],
  components: [{ id: "co1", componentOption: { id: "c1", name: "Woven neck label" }, category: "Labels", customName: null, notes: null }, { id: "co2", componentOption: { id: "c2", name: "Polybag" }, category: "Packaging", customName: null, notes: null }],
  files: [{ source: "YOU", attachmentId: "at1", assetId: "as1", type: "ARTWORK", originalName: "logo-mark.pdf", mimeType: "application/pdf", sizeBytes: 482113, description: null, uploadedAt: "2026-10-02T10:00:00Z" }, { source: "YOU", attachmentId: "at2", assetId: "as2", type: "REFERENCE", originalName: "front.jpg", mimeType: "image/jpeg", sizeBytes: 1523400, description: null, uploadedAt: "2026-10-02T10:01:00Z" }],
  terms: { required: false, accepted: false, activeTermsVersionId: null, activeVersion: null }, allowedActions: ["EDIT_REQUEST", "SUBMIT_REQUEST"], ...over,
} as SampleDetail);

describe("step navigation states", () => {
  it("marks earlier steps completed, the current step current and later steps upcoming, and navigates on click", async () => {
    const go = vi.fn();
    render(<StepNav current={2} onGo={go} />);
    const items = within(screen.getByTestId("steps")).getAllByRole("listitem");
    expect(items).toHaveLength(9);
    expect(items.map((i) => i.getAttribute("data-state"))).toEqual(["completed", "completed", "current", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(within(items[2]!).getByRole("button")).toHaveAttribute("aria-current", "step");
    expect(items[0]!.textContent).toContain("Completed");
    await userEvent.click(within(items[5]!).getByRole("button"));
    expect(go).toHaveBeenCalledWith(5);
  });
  it("on phones shows 'Step n of 9' with the title and a full list that opens on tap and jumps to a step", async () => {
    const go = vi.fn();
    render(<StepNav current={3} onGo={go} />);
    const mobile = screen.getByTestId("steps-mobile");
    expect(mobile).toHaveTextContent("Step 4 of 9");
    expect(mobile).toHaveTextContent("Size & fit");
    expect(screen.queryByTestId("steps-mobile-list")).toBeNull();
    await userEvent.click(within(mobile).getByRole("button", { expanded: false }));
    const list = screen.getByTestId("steps-mobile-list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(STEPS.length);
    await userEvent.click(within(list).getByRole("button", { name: /Notes/ }));
    expect(go).toHaveBeenCalledWith(7);
    expect(screen.queryByTestId("steps-mobile-list")).toBeNull();
  });
});

describe("selection state", () => {
  it("a selected option card is checked and visibly emphasised; choosing another moves the selection", async () => {
    const change = vi.fn();
    render(<ChoiceGroup name="t" aria-label="Test" value="a" onValueChange={change} options={[{ value: "a", label: "Option A" }, { value: "b", label: "Option B", description: "help" }]} />);
    const a = screen.getByRole("radio", { name: /Option A/ });
    expect(a).toHaveAttribute("aria-checked", "true");
    expect(a.closest("label")!.className).toContain("border-brand");
    expect(screen.getByRole("radio", { name: /Option B/ }).closest("label")!.className).not.toContain("border-brand");
    await userEvent.click(screen.getByRole("radio", { name: /Option B/ }));
    expect(change).toHaveBeenCalledWith("b");
  });
  it("catalogue products are cards that carry a garment visual and the product name", () => {
    renderWithClient(<ProductStep sample={sample({ productTypeId: "pt1" })} options={sampleOptions() as never} stepRef={{ current: null }} patch={async () => undefined} changed={() => undefined} />);
    const group = screen.getByRole("radiogroup", { name: "Product" });
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    expect(group.querySelectorAll("[data-garment-visual]").length).toBe(2);
    expect(screen.getByTestId("step-header")).toHaveTextContent("Step 2 of 9");
  });
  it("maps catalogue names to presentation-only garment kinds", () => {
    expect([garmentKindFor("Zip Hoodie"), garmentKindFor("T-Shirt"), garmentKindFor("Polo Shirt"), garmentKindFor("Cargo Joggers"), garmentKindFor("Mystery")]).toEqual(["hoodie", "tshirt", "polo", "bottoms", "custom"]);
  });
});

describe("review summary cards", () => {
  it("shows the values of every step in its own card and sends Edit to the matching step", async () => {
    const edit = vi.fn();
    render(<ReviewSummary sample={sample()} onEdit={edit} />);
    const expectIn = (key: string, ...texts: string[]) => { const card = screen.getByTestId(`summary-${key}`); for (const t of texts) expect(card).toHaveTextContent(t); };
    expectIn("brand", "Nile Core", "SMP-000123");
    expectIn("product", "Hoodie", "Benue Print catalogue");
    expectIn("fabric", "Benue Print will supply the fabric", "Brushed Fleece", "Forest", "Pantone 19-5918", "320 g/m²", "Soft hand");
    expectIn("size", "M", "Use a Benue Print pattern", "Boxy Hoodie", "Longer body");
    expectIn("decoration", "Embroidery", "Left chest", "9 × 9 cm", "2 colours", "Artwork: logo-mark.pdf", "Matte inks");
    expectIn("extras", "Metal zip", "× 2", "Woven neck label", "Polybag");
    expectIn("files", "logo-mark.pdf", "front.jpg", "Artwork · 1", "Reference · 1");
    expectIn("notes", "Launch drop", "Polybag each");
    const keys: Array<[string, string]> = [["Brand", "brand"], ["Product", "product"], ["Fabric & colour", "fabric"], ["Size & fit", "size"], ["Decoration", "decoration"], ["Accessories & labels", "extras"], ["Artwork & files", "files"], ["Notes", "notes"]];
    for (const [title, key] of keys) { await userEvent.click(screen.getByRole("button", { name: `Edit ${title}` })); expect(edit).toHaveBeenLastCalledWith(key); }
    expect(edit).toHaveBeenCalledTimes(8);
    expect(document.body.textContent).not.toMatch(/at1|as1|pm1|storage|http/);
  });
  it("shows honest empty states instead of inventing values", () => {
    render(<ReviewSummary sample={sample({ decorations: [], accessories: [], components: [], files: [], notes: null, specialInstructions: null, printNotes: null })} />);
    expect(screen.getByTestId("summary-decoration")).toHaveTextContent("No print or embroidery");
    expect(screen.getByTestId("summary-extras")).toHaveTextContent("None added");
    expect(screen.getByTestId("summary-files")).toHaveTextContent("No files uploaded");
    expect(screen.getByTestId("summary-notes")).toHaveTextContent("No extra notes");
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull(); // Edit only when a handler is given
  });
  it("highlights the card the customer just came back from", () => {
    render(<ReviewSummary sample={sample()} highlight="fabric" />);
    expect(screen.getByTestId("summary-fabric")).toHaveAttribute("data-highlight", "true");
    expect(screen.getByTestId("summary-brand")).not.toHaveAttribute("data-highlight");
  });
});

describe("file tiles", () => {
  it("shows name, type, size and status, with the actions given, and never a storage key or URL", () => {
    render(<ul><FileTile name="logo.png" mime="image/png" sizeBytes={2048} typeLabel="Artwork" status="Uploaded" actions={<button>Remove</button>} /></ul>);
    const tile = screen.getByTestId("file-tile");
    expect(tile).toHaveTextContent("logo.png");
    expect(tile).toHaveTextContent("Artwork");
    expect(tile.textContent).toMatch(/2(\.0)? KB/);
    expect(tile).toHaveTextContent("Uploaded");
    expect(within(tile).getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(tile.textContent).not.toMatch(/http|storage|asset/i);
    expect(tile.querySelector("a[href], [src]")).toBeNull();
  });
  it("the Files step groups uploaded files by type and keeps the private download and removal controls", () => {
    renderWithClient(<FilesStep sample={sample()} options={sampleOptions() as never} stepRef={{ current: null }} patch={async () => undefined} changed={() => undefined} />);
    const files = screen.getByTestId("wizard-files");
    expect(within(files).getByRole("region", { name: "Artwork files" })).toHaveTextContent("logo-mark.pdf");
    expect(within(files).getByRole("region", { name: "Reference files" })).toHaveTextContent("front.jpg");
    expect(screen.getByRole("button", { name: "Download logo-mark.pdf" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove front.jpg from this request" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "What are you uploading" })).toBeInTheDocument();
  });
});

describe("summary card", () => {
  it("renders a titled section with an accessible Edit action only when editable", () => {
    const edit = vi.fn();
    render(<SummaryCard stepKey="notes" icon={<i />} title="Notes" onEdit={edit}><p>body</p></SummaryCard>);
    expect(screen.getByRole("region", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Notes" })).toBeInTheDocument();
  });
});
