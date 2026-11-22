import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { customerTokenStore } from "@/lib/customer/session";
import { DecorationStep, FabricStep } from "@/features/portal/steps";
import type { SampleDetail } from "@/features/portal/types";
import { json, mockApi, renderWithClient, sampleOptions } from "./helpers";

const options = { ...sampleOptions(), productTypes: [{ id: "pt1", code: "TEE", name: "T-Shirt", description: null }, { id: "pt3", code: "JKT", name: "Jacket", description: null }], decorationSides: [{ value: "FRONT" }, { value: "BACK" }, { value: "LEFT_SLEEVE" }, { value: "RIGHT_SLEEVE" }, { value: "OTHER" }] } as never;
const detail = (o: Record<string, unknown> = {}): SampleDetail => ({
  id: "s1", sampleNumber: "SMP-000001", status: "DRAFT", statusLabel: "Draft", nextStep: "", editable: true, brand: { id: "b1", name: "Nile Core" }, productName: "T-Shirt", fabricName: null, colorName: null,
  submittedAt: null, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", revisionNumber: 1, productTypeId: "pt1", customProductName: null, customProductDescription: null, fabricId: "f1", customFabricName: null, customFabricDescription: null,
  fabricProvider: null, gsm: null, fabricColorId: "col1", customColorName: null, customPantone: null, customHex: null, size: null, fitMethod: null, pattern: null, notes: null, fitNotes: null, printNotes: null, fabricNotes: null, specialInstructions: null,
  decorations: [], accessories: [], components: [], files: [], terms: { required: true, accepted: false, activeTermsVersionId: "t1", activeVersion: 2 }, ...o,
}) as SampleDetail;
const step = { stepRef: { current: null }, patch: async () => undefined, changed: () => undefined };

beforeEach(() => {
  customerTokenStore.set("cust-1");
  // jsdom has no image decoding / object URLs: stand in for a decoded 600×400 PNG.
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:art"), revokeObjectURL: vi.fn() }));
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: () => Promise.resolve() });
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", { configurable: true, get: () => 400 });
});
afterEach(() => { vi.unstubAllGlobals(); customerTokenStore.clear(); });

describe("3D preview in the real sample request", () => {
  it("fabric step previews catalogue products only", () => {
    const { unmount } = renderWithClient(<FabricStep sample={detail()} options={options} {...step} />);
    expect(screen.getByTestId("colour-preview-3d")).toBeInTheDocument();
    expect(screen.getByText("3D preview for reference. Final placement is confirmed during sample review.")).toBeInTheDocument();
    unmount();
    renderWithClient(<FabricStep sample={detail({ productTypeId: null, productName: null, customProductName: "Cape" })} options={options} {...step} />);
    expect(screen.queryByTestId("colour-preview-3d")).toBeNull();
  });

  it("offers only the calibrated placements of the sample's garment", () => {
    renderWithClient(<DecorationStep sample={detail({ id: "s-jkt", productName: "Jacket", productTypeId: "pt3" })} options={options} {...step} />);
    const group = screen.getByRole("radiogroup", { name: "Print placement" });
    expect(within(group).queryByRole("radio", { name: /Center chest/ })).toBeNull();
    expect(within(group).getByRole("radio", { name: /Left chest/ })).toBeInTheDocument();
  });

  it("artwork stays local until the customer adds it as a decoration; then it goes through the existing endpoints", async () => {
    const calls = mockApi({ "POST /customer/samples/s1/decorations": json(201, { id: "d9" }), "POST /customer/samples/s1/files": json(201, { attachmentId: "a1" }) });
    renderWithClient(<DecorationStep sample={detail()} options={options} {...step} />);
    const file = new File(["png"], "logo.png", { type: "image/png" });
    await userEvent.upload(screen.getByTestId("print-controls").querySelector("input[type=file]") as HTMLInputElement, file);
    expect(await screen.findByText("logo.png")).toBeInTheDocument();
    expect(calls).toHaveLength(0); // nothing uploaded by choosing a file

    await userEvent.click(screen.getByRole("radio", { name: /Upper back/ }));
    await userEvent.upload(screen.getByTestId("print-controls").querySelector("input[type=file]") as HTMLInputElement, file);
    await userEvent.click(await screen.findByRole("button", { name: /Add as decoration/ }));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByLabelText(/Where/)).toHaveValue("Upper back");
    expect(within(dlg).getByRole("checkbox", { name: /Upload this artwork/ })).toBeChecked();
    await userEvent.click(within(dlg).getByRole("combobox", { name: /How/ }));
    await userEvent.click(await screen.findByRole("option", { name: "DTF" }));
    await userEvent.click(within(dlg).getByRole("button", { name: "Add decoration" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/customer/samples/s1/files")).toBe(true));
    expect(calls[0]).toMatchObject({ method: "POST", path: "/customer/samples/s1/decorations", body: { printMethodId: "pm1", placement: "Upper back", side: "BACK", artworkRequired: true } });
    const fd = (vi.mocked(fetch).mock.calls.find(([u]) => String(u).endsWith("/customer/samples/s1/files"))![1]!.body) as FormData;
    expect(fd.get("type")).toBe("ARTWORK");
    expect(fd.get("decorationId")).toBe("d9");
  });
});
