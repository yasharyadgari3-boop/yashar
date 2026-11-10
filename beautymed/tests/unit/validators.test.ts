import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { fieldErrors, newsletterSchema, otpCodeSchema, parseContact } from "@/lib/validators";
import { FileNewsletterStore } from "@/server/adapters/newsletter/file-store";
import { rateLimit, resetRateLimits } from "@/server/rate-limit";
import { searchContent } from "@/server/search";

describe("contact parsing", () => {
  it("accepts an email or an Iranian mobile number", () => {
    expect(parseContact(" Name@Example.com ")).toEqual({ kind: "email", value: "name@example.com" });
    expect(parseContact("۰۹۱۲۱۲۳۴۵۶۷")).toEqual({ kind: "mobile", value: "09121234567" });
  });

  it("rejects anything else", () => {
    expect(parseContact("not-an-email@")).toBeNull();
    expect(parseContact("12345")).toBeNull();
  });
});

describe("newsletter schema", () => {
  it("requires explicit consent", () => {
    const result = newsletterSchema.safeParse({ contact: "a@b.co", consent: undefined });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty("consent");
  });

  it("reports an invalid contact on the contact field", () => {
    const result = newsletterSchema.safeParse({ contact: "xyz", consent: "on" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty("contact");
  });

  it("accepts a valid contact with consent", () => {
    const result = newsletterSchema.safeParse({ contact: "09121234567", consent: "on" });
    expect(result.success && result.data.contact.kind).toBe("mobile");
  });
});

describe("otp code schema", () => {
  it("accepts six digits in Persian or Latin", () => {
    expect(otpCodeSchema.parse("۱۲۳۴۵۶")).toBe("123456");
    expect(otpCodeSchema.safeParse("12345").success).toBe(false);
    expect(otpCodeSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("file newsletter store", () => {
  it("stores each contact once, with consent text and time", async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "bm-news-")), "newsletter.json");
    const store = new FileNewsletterStore(file);
    const sub = { contact: { kind: "email" as const, value: "a@b.co" }, consentText: "متن رضایت", consentAt: new Date(0) };
    await Promise.all([store.subscribe(sub), store.subscribe(sub)]);
    await store.subscribe({ ...sub, contact: { kind: "mobile", value: "09121234567" } });
    expect(await store.count()).toBe(2);
    const rows = JSON.parse(readFileSync(file, "utf8")) as Array<{ consentText: string; consentAt: string }>;
    expect(rows[0]).toMatchObject({ consentText: "متن رضایت", consentAt: "1970-01-01T00:00:00.000Z" });
  });
});

describe("rate limit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit inside the window and resets afterwards", () => {
    expect(rateLimit("k", 2, 1000, 0)).toBe(true);
    expect(rateLimit("k", 2, 1000, 10)).toBe(true);
    expect(rateLimit("k", 2, 1000, 20)).toBe(false);
    expect(rateLimit("other", 2, 1000, 20)).toBe(true);
    expect(rateLimit("k", 2, 1000, 1001)).toBe(true);
  });
});

describe("content search", () => {
  it("finds hubs and topics regardless of Arabic/Persian letter forms", () => {
    expect(searchContent("فيلر").some((r) => r.href === "/fillers")).toBe(true);
    expect(searchContent("prp").some((r) => r.href === "/prp")).toBe(true);
    expect(searchContent("   ")).toEqual([]);
    expect(searchContent("موضوعی که وجود ندارد")).toEqual([]);
  });
});
