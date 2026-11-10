const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Replace Latin and Arabic-Indic digits with Persian digits. */
export function toPersianDigits(input: string | number): string {
  return String(input)
    .replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d)
    .replace(/[٠-٩]/g, (d) => PERSIAN_DIGITS[d.charCodeAt(0) - 0x0660] ?? d);
}

const numberFormatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

export function formatNumber(value: number | bigint): string {
  return numberFormatter.format(value);
}

/** Prices are whole Toman amounts (integers). */
export function formatToman(value: number | bigint): string {
  return `${formatNumber(value)} تومان`;
}

const jalaliLong = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long", timeZone: "Asia/Tehran" });
const jalaliDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Tehran",
});

export function formatJalaliDate(date: Date): string {
  return jalaliLong.format(date);
}

export function formatJalaliDateTime(date: Date): string {
  return jalaliDateTime.format(date);
}
