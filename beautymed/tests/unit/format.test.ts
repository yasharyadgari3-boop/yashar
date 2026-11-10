import { describe, expect, it } from "vitest";
import { formatJalaliDate, formatNumber, formatToman, toPersianDigits } from "@/lib/format";
import { normalizeMobile, normalizePersian, toLatinDigits } from "@/lib/persian-text";
import { shouldPlayHeroVideo } from "@/lib/hero-video";

describe("format", () => {
  it("converts Latin and Arabic digits to Persian digits", () => {
    expect(toPersianDigits("PMID 12345")).toBe("PMID ۱۲۳۴۵");
    expect(toPersianDigits("٤٥٦")).toBe("۴۵۶");
    expect(toPersianDigits(16)).toBe("۱۶");
  });

  it("formats numbers and Toman prices with Persian digits and separators", () => {
    expect(formatNumber(1234567)).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatToman(1000)).toBe("۱٬۰۰۰ تومان");
  });

  it("formats Jalali dates in Tehran time", () => {
    expect(formatJalaliDate(new Date("2026-11-09T12:00:00Z"))).toBe("۱۸ آبان ۱۴۰۵");
  });
});

describe("persian-text", () => {
  it("converts Persian and Arabic digits to Latin", () => {
    expect(toLatinDigits("۰۹۱۲ ٣٤٥")).toBe("0912 345");
  });

  it("normalizes Arabic letters, diacritics, half-spaces and case for search", () => {
    expect(normalizePersian("  فيلرِ  كلاژن‌ساز PRP ۲ ")).toBe("فیلر کلاژن ساز prp 2");
  });

  it.each([
    ["09121234567", "09121234567"],
    ["۰۹۱۲۱۲۳۴۵۶۷", "09121234567"],
    ["+98 912 123 4567", "09121234567"],
    ["00989121234567", "09121234567"],
    ["989121234567", "09121234567"],
    ["9121234567", "09121234567"],
  ])("normalizes mobile %s", (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected);
  });

  it.each(["", "0912", "08121234567", "0912123456a", "091212345678"])("rejects invalid mobile %s", (input) => {
    expect(normalizeMobile(input)).toBeNull();
  });
});

describe("hero video decision", () => {
  const base = { hasVideo: true, viewportWidth: 1440, saveData: false, reducedMotion: false };

  it("plays on a wide screen with no restrictions", () => {
    expect(shouldPlayHeroVideo(base)).toBe(true);
  });

  it("shows the poster on mobile, with Save-Data, with reduced motion, or without a video", () => {
    expect(shouldPlayHeroVideo({ ...base, viewportWidth: 360 })).toBe(false);
    expect(shouldPlayHeroVideo({ ...base, saveData: true })).toBe(false);
    expect(shouldPlayHeroVideo({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldPlayHeroVideo({ ...base, hasVideo: false })).toBe(false);
  });
});
