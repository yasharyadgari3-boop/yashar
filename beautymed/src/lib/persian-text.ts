/** Convert Persian and Arabic-Indic digits to Latin digits (for storage and comparison). */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Normalize Persian text for search and comparison: Arabic ي/ك to Persian ی/ک,
 * digits to Latin, remove diacritics and tatweel, collapse spaces, lowercase Latin.
 */
export function normalizePersian(input: string): string {
  return toLatinDigits(input)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ؤ]/g, "و")
    .replace(/[أإٱ]/g, "ا")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/‌/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Normalize an Iranian mobile number to the form 09xxxxxxxxx, or return null if invalid. */
export function normalizeMobile(input: string): string | null {
  let s = toLatinDigits(input).replace(/[\s\-()]/g, "");
  if (s.startsWith("+98")) s = `0${s.slice(3)}`;
  else if (s.startsWith("0098")) s = `0${s.slice(4)}`;
  else if (s.startsWith("98") && s.length === 12) s = `0${s.slice(2)}`;
  else if (s.startsWith("9") && s.length === 10) s = `0${s}`;
  return /^09\d{9}$/.test(s) ? s : null;
}
