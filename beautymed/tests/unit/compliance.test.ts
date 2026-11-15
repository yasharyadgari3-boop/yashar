import { describe, expect, it } from "vitest";
import { cartTotal, isImagePublishable, missingComplianceFields } from "@/lib/compliance";

const required = ["ircCode", "importerName", "authenticityDetails"];

describe("product compliance", () => {
  it("lists every required field that is empty or only spaces", () => {
    expect(missingComplianceFields(null, required)).toEqual(required);
    expect(missingComplianceFields({ ircCode: "  ", importerName: "شرکت", authenticityDetails: "" }, required)).toEqual([
      "ircCode",
      "authenticityDetails",
    ]);
  });

  it("is satisfied only when all required fields are filled", () => {
    expect(missingComplianceFields({ ircCode: "x", importerName: "y", authenticityDetails: "z" }, required)).toEqual([]);
  });

  it("follows the configured list, so the rule can change without code changes", () => {
    expect(missingComplianceFields({ ircCode: "x" }, ["ircCode"])).toEqual([]);
    expect(missingComplianceFields({ ircCode: "x" }, [])).toEqual([]);
    expect(missingComplianceFields({ ircCode: "x" }, ["ircCode", "newLegalField"])).toEqual(["newLegalField"]);
  });
});

describe("before/after images", () => {
  it("ordinary images are always publishable", () => {
    expect(isImagePublishable({ isBeforeAfter: false, patientConsent: false })).toBe(true);
  });

  it("before/after images need the patient-consent flag", () => {
    expect(isImagePublishable({ isBeforeAfter: true, patientConsent: false })).toBe(false);
    expect(isImagePublishable({ isBeforeAfter: true, patientConsent: true })).toBe(true);
  });

  it("the consent rule is configurable", () => {
    expect(isImagePublishable({ isBeforeAfter: true, patientConsent: false }, false)).toBe(true);
  });
});

describe("cart total", () => {
  it("sums whole-Toman line totals", () => {
    expect(cartTotal([])).toBe(0);
    expect(
      cartTotal([
        { unitPriceToman: 1000, quantity: 2 },
        { unitPriceToman: 250, quantity: 3 },
      ]),
    ).toBe(2750);
  });
});
