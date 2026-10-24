import { describe, expect, it } from "vitest";
import { visibleActions } from "@/features/samples/actions";
import { buildSamplePayload, emptySampleValues, sampleSchema, sectionForProblem, toFormValues, type SampleFormValues } from "@/features/samples/schema";
import { sampleDetail } from "./helpers";
import type { SampleDetail } from "@/features/samples/types";

const base = (over: Partial<SampleFormValues> = {}): SampleFormValues => ({ ...emptySampleValues, customerId: "c1", brandId: "b1", ...over });

describe("draft payload: product / fabric / colour pairs", () => {
  it("create omits empty fields (a draft may be incomplete)", () => {
    expect(buildSamplePayload(base(), "create")).toEqual({ customerId: "c1", brandId: "b1", fabricProvider: "NOT_DECIDED", fitMethod: "NOT_SURE" });
  });
  it("configured product / fabric / colour", () => {
    const p = buildSamplePayload(base({ productTypeId: "pt1", fabricId: "f1", fabricColorId: "col1", sampleSizeOptionId: "z1", gsm: "200" }), "create");
    expect(p).toMatchObject({ productTypeId: "pt1", fabricId: "f1", fabricColorId: "col1", sampleSizeOptionId: "z1", gsm: 200 });
    expect(p).not.toHaveProperty("customProductName");
    expect(p).not.toHaveProperty("customColorName");
  });
  it("custom product sends only the custom fields; update explicitly nulls the catalogue side", () => {
    const v = base({ productMode: "custom", productTypeId: "pt1", customProductName: "Poncho", customProductDescription: "wool" });
    expect(buildSamplePayload(v, "create")).toMatchObject({ customProductName: "Poncho", customProductDescription: "wool" });
    expect(buildSamplePayload(v, "create")).not.toHaveProperty("productTypeId");
    expect(buildSamplePayload(v, "update")).toMatchObject({ productTypeId: null, customProductName: "Poncho" });
  });
  it("custom fabric forces the catalogue colour off and uses custom colour fields", () => {
    const v = base({ fabricMode: "custom", fabricId: "f1", customFabricName: "Mystery", fabricColorId: "col1", colorMode: "custom", customColorName: "Navy", customHex: "#001F3F", customPantone: "19-4052" });
    const u = buildSamplePayload(v, "update");
    expect(u).toMatchObject({ fabricId: null, customFabricName: "Mystery", fabricColorId: null, customColorName: "Navy", customHex: "#001F3F", customPantone: "19-4052" });
  });
  it("catalogue colour clears the custom colour trio on update", () => {
    const u = buildSamplePayload(base({ fabricId: "f1", fabricColorId: "col1", customColorName: "stale" }), "update");
    expect(u).toMatchObject({ fabricColorId: "col1", customColorName: null, customPantone: null, customHex: null });
  });
  it("cleared fields become null on update, never empty strings", () => {
    const u = buildSamplePayload(base({ notes: "", gsm: "" }), "update");
    expect(u).toMatchObject({ notes: null, gsm: null, sampleSizeOptionId: null });
  });
  it("brandId is only sent on update when it changed", () => {
    expect(buildSamplePayload(base(), "update")).not.toHaveProperty("brandId");
    expect(buildSamplePayload(base({ brandId: "b2" }), "update", { includeBrand: true })).toMatchObject({ brandId: "b2" });
  });
});

describe("fit method and pattern version", () => {
  it("BENUE_PATTERN keeps the pinned patternVersionId", () => {
    expect(buildSamplePayload(base({ fitMethod: "BENUE_PATTERN", patternVersionId: "pv1" }), "create")).toMatchObject({ fitMethod: "BENUE_PATTERN", patternVersionId: "pv1" });
  });
  it("any other fit method never sends a pattern version (and clears it on update)", () => {
    expect(buildSamplePayload(base({ fitMethod: "COPY_CUSTOMER_PIECE", patternVersionId: "pv1" }), "create")).not.toHaveProperty("patternVersionId");
    expect(buildSamplePayload(base({ fitMethod: "NOT_SURE", patternVersionId: "pv1" }), "update")).toMatchObject({ patternVersionId: null });
  });
});

describe("draft validation is format-only", () => {
  it("accepts an incomplete draft", () => { expect(sampleSchema.safeParse(base()).success).toBe(true); });
  it("requires customer and brand, validates hex and gsm formats", () => {
    expect(sampleSchema.safeParse(emptySampleValues).success).toBe(false);
    const r = sampleSchema.safeParse(base({ customHex: "red", gsm: "-3" }));
    expect(r.success).toBe(false);
    const msgs = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(msgs).toContain("Use a hex colour like #1A2B3C");
    expect(msgs).toContain("Enter a whole number above 0");
  });
});

describe("form values from a saved sample", () => {
  it("detects custom product / fabric / colour modes", () => {
    const s = sampleDetail({ productType: null, customProductName: "Poncho", fabric: null, customFabricName: "Mystery", fabricColor: null }) as unknown as SampleDetail;
    expect(toFormValues(s)).toMatchObject({ productMode: "custom", fabricMode: "custom", colorMode: "custom", customProductName: "Poncho", gsm: "220", customHex: "#001F3F" });
  });
  it("catalogue sample maps ids", () => {
    const s = sampleDetail({ fabricColor: { id: "col1", name: "Red", hex: "#CC0000" } }) as unknown as SampleDetail;
    expect(toFormValues(s)).toMatchObject({ productMode: "catalogue", productTypeId: "pt1", fabricId: "f1", colorMode: "catalogue", fabricColorId: "col1", sampleSizeOptionId: "z1" });
  });
});

describe("lifecycle actions come from the backend", () => {
  it("renders only known actions, primary first, destructive last", () => {
    expect(visibleActions(["cancel", "submit", "hold", "something-new", "reject"]).map((a) => a.action)).toEqual(["submit", "hold", "reject", "cancel"]);
  });
  it("no allowed actions -> nothing (no frontend-invented transitions)", () => { expect(visibleActions([])).toEqual([]); });
  it("reason requirements match the backend (hold/reject/cancel/request-changes required, resume optional)", () => {
    const m = Object.fromEntries(visibleActions(["hold", "reject", "cancel", "request-changes", "resume", "submit"]).map((a) => [a.action, a.reason]));
    expect(m).toEqual({ hold: "required", reject: "required", cancel: "required", "request-changes": "required", resume: "optional", submit: "none" });
  });
  it("start-review maps to the /review route", () => { expect(visibleActions(["start-review"])[0]!.route).toBe("review"); });
});

describe("submit problem -> section", () => {
  it.each([
    ["terms: the active sample terms (version 1) must be accepted", "sec-terms"],
    ["decorations: decoration #1 (DTF): artwork is required", "sec-decoration"],
    ["fabric: pick one", "sec-fabric"], ["colour: x", "sec-fabric"], ["product: x", "sec-product"],
    ["fit: BENUE_PATTERN needs an approved pattern", "sec-size"], ["size: x", "sec-size"], ["brand: x", "sec-customer"], ["attachments: size chart", "sec-files"], ["something else", "sec-review"],
  ])("%s -> %s", (msg, sec) => { expect(sectionForProblem(msg)).toBe(sec); });
});
