/**
 * Compliance rules for regulated products. The list of required fields comes from a site
 * setting, so it can change after the owner confirms the legal requirements.
 */
export const complianceFieldLabels: Record<string, string> = {
  ircCode: "کد ثبت سازمان غذا و دارو (IRC)",
  importerName: "نام واردکننده",
  authenticityDetails: "مشخصات اصالت",
};

export type ComplianceValues = Partial<Record<string, string | null>>;

/**
 * Characters that take no space on screen: white space, zero-width and bidi marks, the soft hyphen,
 * Hangul fillers and the Braille blank. String.trim() keeps most of them, so a value made only of
 * these would look empty to a person yet count as "filled" (for example an IRC of one zero-width space).
 */
const INVISIBLE = /[\p{White_Space}\p{Default_Ignorable_Code_Point}\u2800]/gu;

/** True when the value holds at least one character a person can see. Real Persian text with a ZWNJ inside still counts. */
export function hasVisibleText(value: string | null | undefined): boolean {
  return (value ?? "").replace(INVISIBLE, "") !== "";
}

/** Required compliance fields that are still empty. A product cannot be published while any remain. */
export function missingComplianceFields(compliance: ComplianceValues | null | undefined, required: readonly string[]): string[] {
  return required.filter((field) => !hasVisibleText(compliance?.[field]));
}

/** Before/after images are public only after an admin sets the patient-consent flag. */
export function isImagePublishable(image: { isBeforeAfter: boolean; patientConsent: boolean }, requireConsent = true): boolean {
  return !image.isBeforeAfter || !requireConsent || image.patientConsent;
}

export const MAX_QUANTITY = 99;

export function cartTotal(items: ReadonlyArray<{ unitPriceToman: number; quantity: number }>): number {
  return items.reduce((sum, item) => sum + item.unitPriceToman * item.quantity, 0);
}
