import { describe, expect, it } from "vitest";
import { cartTotal, hasVisibleText, isImagePublishable, missingComplianceFields } from "@/lib/compliance";

const required = ["ircCode", "importerName", "authenticityDetails"];

describe("a required field must hold something a person can see", () => {
  it("treats white space and zero-width, bidi, soft-hyphen and filler characters as empty", () => {
    for (const blank of ["", " ", "\n\t", "\u00a0", "\u3000", "\u200b", "\u200c", "\u200d", "\u200e", "\u200f", "\u2060", "\u00ad", "\u061c", "\ufeff", "\u202a\u202e", "\u3164", "\u2800", " \u200b \u200c\u200f "]) {
      expect(hasVisibleText(blank), JSON.stringify(blank)).toBe(false);
      expect(missingComplianceFields({ ircCode: blank }, ["ircCode"])).toEqual(["ircCode"]);
    }
    expect(hasVisibleText(null)).toBe(false);
    expect(hasVisibleText(undefined)).toBe(false);
  });

  it("counts any visible character, including Persian text with a zero-width non-joiner inside", () => {
    for (const filled of ["x", "0", "-", "۱۲۳", "می‌شود", "کد ۱۲۳", "\u200bA\u200b"]) {
      expect(hasVisibleText(filled), JSON.stringify(filled)).toBe(true);
    }
  });
});

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
