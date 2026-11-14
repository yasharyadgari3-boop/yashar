// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { peekMockOtp } from "@/server/adapters/sms/mock";
import { OTP_RULES, requestOtp, verifyOtp } from "@/server/auth/otp";
import { findUserBySessionToken } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { sha256 } from "@/server/security";
import {
  readDocument,
  reviewVerification,
  submitImporterVerification,
  submitPhysicianVerification,
} from "@/server/services/verification";
import { resetDatabase } from "./helpers";

const pdf = { name: "license.pdf", bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) };
const mobile = "09121110001";

async function login(number: string): Promise<string> {
  await requestOtp(number, null);
  const result = await verifyOtp(number, peekMockOtp(number)!);
  if (!result.ok) throw new Error("login failed");
  return result.userId;
}

beforeEach(async () => {
  await resetDatabase();
  vi.unstubAllEnvs();
});

describe("one-time code login", () => {
  it("stores only a hash of the code and creates the user on first login", async () => {
    await requestOtp(mobile, "1.1.1.1");
    const code = peekMockOtp(mobile)!;
    const challenge = await prisma.otpChallenge.findFirstOrThrow({ where: { mobile } });
    expect(challenge.codeHash).not.toContain(code);
    expect(challenge.codeHash).toMatch(/^[0-9a-f]{64}$/);

    const result = await verifyOtp(mobile, code);
    expect(result.ok).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { mobile } });
    expect(user.role).toBeNull();
  });

  it("a code works once", async () => {
    await requestOtp(mobile, null);
    const code = peekMockOtp(mobile)!;
    expect((await verifyOtp(mobile, code)).ok).toBe(true);
    expect(await verifyOtp(mobile, code)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects wrong, unknown and expired codes with the same answer", async () => {
    expect(await verifyOtp("09121110009", "123456")).toEqual({ ok: false, reason: "invalid" });
    const now = new Date();
    await requestOtp(mobile, null, now);
    const code = peekMockOtp(mobile)!;
    const wrong = code === "000000" ? "000001" : "000000";
    expect(await verifyOtp(mobile, wrong, now)).toEqual({ ok: false, reason: "invalid" });
    const later = new Date(now.getTime() + OTP_RULES.ttlMs + 1);
    expect(await verifyOtp(mobile, code, later)).toEqual({ ok: false, reason: "invalid" });
  });

  it("locks a challenge after too many wrong attempts, even for the right code", async () => {
    await requestOtp(mobile, null);
    const code = peekMockOtp(mobile)!;
    const wrong = code === "000000" ? "000001" : "000000";
    for (let i = 0; i < OTP_RULES.maxAttempts; i++) {
      expect(await verifyOtp(mobile, wrong)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(await verifyOtp(mobile, code)).toEqual({ ok: false, reason: "locked" });
  });

  it("limits how many codes one number or one address can request", async () => {
    for (let i = 0; i < OTP_RULES.perMobile.limit; i++) expect((await requestOtp(mobile, null)).ok).toBe(true);
    expect(await requestOtp(mobile, null)).toEqual({ ok: false, reason: "rate_limited" });

    for (let i = 0; i < OTP_RULES.perIp.limit; i++) {
      expect((await requestOtp(`0912222${String(i).padStart(4, "0")}`, "9.9.9.9")).ok).toBe(true);
    }
    expect(await requestOtp("09123330000", "9.9.9.9")).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("makes a number from ADMIN_MOBILES an admin", async () => {
    vi.stubEnv("ADMIN_MOBILES", "09121110002, ۰۹۱۲۱۱۱۰۰۰۳");
    const adminId = await login("09121110003");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).role).toBe("ADMIN");
    const otherId = await login(mobile);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: otherId } })).role).toBeNull();
  });
});

describe("sessions", () => {
  it("finds the user by token hash and ignores expired or unknown tokens", async () => {
    const userId = await login(mobile);
    await prisma.session.create({ data: { tokenHash: sha256("good"), userId, expiresAt: new Date(Date.now() + 60_000) } });
    await prisma.session.create({ data: { tokenHash: sha256("old"), userId, expiresAt: new Date(Date.now() - 1) } });
    expect((await findUserBySessionToken("good"))?.id).toBe(userId);
    expect(await findUserBySessionToken("old")).toBeNull();
    expect(await findUserBySessionToken("unknown")).toBeNull();
  });
});

describe("verification and admin approval", () => {
  it("a physician submits, an admin approves, and the status follows", async () => {
    const userId = await login(mobile);
    await submitPhysicianVerification(userId, { fullName: "دکتر آزمایشی", medicalCouncilNumber: "۱۲۳۴۵" }, pdf);
    await prisma.session.create({ data: { tokenHash: sha256("t"), userId, expiresAt: new Date(Date.now() + 60_000) } });

    let viewer = await findUserBySessionToken("t");
    expect(viewer).toMatchObject({ role: "PHYSICIAN", physicianStatus: "PENDING" });
    const profile = await prisma.physicianProfile.findUniqueOrThrow({ where: { userId } });
    expect(profile.medicalCouncilNumber).toBe("12345");

    const adminId = (await prisma.user.create({ data: { mobile: "09121119999", role: "ADMIN" } })).id;
    await reviewVerification(adminId, { kind: "physician", profileId: profile.id, decision: "approve" });
    viewer = await findUserBySessionToken("t");
    expect(viewer?.physicianStatus).toBe("APPROVED");

    // A second decision on the same request is refused.
    await expect(
      reviewVerification(adminId, { kind: "physician", profileId: profile.id, decision: "reject", reason: "دلیل آزمایشی" }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(await prisma.auditLog.count({ where: { action: "verification.approved", actorId: adminId } })).toBe(1);
  });

  it("rejection needs a reason, and a rejected physician can resubmit", async () => {
    const userId = await login(mobile);
    await submitPhysicianVerification(userId, { fullName: "دکتر آزمایشی", medicalCouncilNumber: "12345" }, pdf);
    const profile = await prisma.physicianProfile.findUniqueOrThrow({ where: { userId } });
    const adminId = (await prisma.user.create({ data: { mobile: "09121119999", role: "ADMIN" } })).id;

    await expect(
      reviewVerification(adminId, { kind: "physician", profileId: profile.id, decision: "reject" }),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      submitPhysicianVerification(userId, { fullName: "دکتر آزمایشی", medicalCouncilNumber: "12345" }, pdf),
    ).rejects.toMatchObject({ code: "conflict" });

    await reviewVerification(adminId, { kind: "physician", profileId: profile.id, decision: "reject", reason: "مدرک ناخوانا است" });
    await submitPhysicianVerification(userId, { fullName: "دکتر آزمایشی", medicalCouncilNumber: "12345" }, pdf);
    expect((await prisma.physicianProfile.findUniqueOrThrow({ where: { userId } })).status).toBe("PENDING");
  });

  it("refuses invalid input and files that are not PDF, JPG or PNG", async () => {
    const userId = await login(mobile);
    await expect(
      submitPhysicianVerification(userId, { fullName: "د", medicalCouncilNumber: "abc" }, pdf),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      submitPhysicianVerification(
        userId,
        { fullName: "دکتر آزمایشی", medicalCouncilNumber: "12345" },
        { name: "x.pdf", bytes: new TextEncoder().encode("not a pdf") },
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(await prisma.physicianProfile.count()).toBe(0);
    expect(await prisma.verificationDocument.count()).toBe(0);
  });

  it("an account cannot be both physician and importer", async () => {
    const userId = await login(mobile);
    await submitImporterVerification(userId, { companyName: "شرکت آزمایشی", nationalId: "12345678901", contactName: "نماینده" }, pdf);
    await expect(
      submitPhysicianVerification(userId, { fullName: "دکتر آزمایشی", medicalCouncilNumber: "12345" }, pdf),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("a license document is readable by its owner and admins only, and admin views are logged", async () => {
    const ownerId = await login(mobile);
    await submitPhysicianVerification(ownerId, { fullName: "دکتر آزمایشی", medicalCouncilNumber: "12345" }, pdf);
    const doc = await prisma.verificationDocument.findFirstOrThrow({ where: { ownerId } });
    const otherId = await login("09121110004");
    const adminId = (await prisma.user.create({ data: { mobile: "09121119999", role: "ADMIN" } })).id;

    expect((await readDocument({ id: ownerId, role: "PHYSICIAN" }, doc.id))?.mimeType).toBe("application/pdf");
    expect(await readDocument({ id: otherId, role: "PHYSICIAN" }, doc.id)).toBeNull();
    expect(await readDocument({ id: otherId, role: "IMPORTER" }, doc.id)).toBeNull();
    expect(await readDocument({ id: adminId, role: "ADMIN" }, "no-such-id")).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "document.viewed" } })).toBe(0);

    expect(await readDocument({ id: adminId, role: "ADMIN" }, doc.id)).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "document.viewed", actorId: adminId } })).toBe(1);
  });
});
